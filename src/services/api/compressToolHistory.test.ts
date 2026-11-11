import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { compressToolHistory, getTiers } from './compressToolHistory.js'

// Mock the two dependencies so tests are deterministic and don't read disk config.
const mockState = {
  enabled: true,
  effectiveWindow: 100_000,
}

mock.module('../../utils/config.js', () => ({
  getGlobalConfig: () => ({
    toolHistoryCompressionEnabled: mockState.enabled,
  }),
}))

mock.module('../compact/autoCompact.js', () => ({
  getEffectiveContextWindowSize: () => mockState.effectiveWindow,
}))

beforeEach(() => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000
})

afterEach(() => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000
})

type Block = Record<string, unknown>
type Msg = { role: string; content: Block[] | string }

function bigText(n: number): string {
  return 'x'.repeat(n)
}

function buildToolExchange(id: number, resultLength: number): Msg[] {
  return [
    {
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: `toolu_${id}`,
          name: 'Read',
          input: { file_path: `/path/to/file${id}.ts` },
        },
      ],
    },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: `toolu_${id}`,
          content: bigText(resultLength),
        },
      ],
    },
  ]
}

function buildConversation(numToolExchanges: number, resultLength = 5_000): Msg[] {
  const out: Msg[] = [{ role: 'user', content: 'Initial request' }]
  for (let i = 0; i < numToolExchanges; i++) {
    out.push(...buildToolExchange(i, resultLength))
  }
  return out
}

function getResultMessages(messages: Msg[]): Msg[] {
  return messages.filter(
    m => Array.isArray(m.content) && m.content.some((b: any) => b.type === 'tool_result'),
  )
}

function getResultBlock(msg: Msg): Block {
  return (msg.content as Block[]).find((b: any) => b.type === 'tool_result') as Block
}

function getResultText(msg: Msg): string {
  const block = getResultBlock(msg)
  const c = block.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
  }
  return ''
}

// ---------- getTiers ----------

test('getTiers: < 16k window → recent=2, mid=3', () => {
  expect(getTiers(8_000)).toEqual({ recent: 2, mid: 3 })
})

test('getTiers: 16k–32k → recent=3, mid=5', () => {
  expect(getTiers(20_000)).toEqual({ recent: 3, mid: 5 })
})

test('getTiers: 32k–64k → recent=4, mid=8', () => {
  expect(getTiers(48_000)).toEqual({ recent: 4, mid: 8 })
})

test('getTiers: 64k–128k (Copilot gpt-4o) → recent=5, mid=10', () => {
  expect(getTiers(100_000)).toEqual({ recent: 5, mid: 10 })
})

test('getTiers: 128k–256k (Copilot Claude) → recent=8, mid=15', () => {
  expect(getTiers(200_000)).toEqual({ recent: 8, mid: 15 })
})

test('getTiers: 256k–500k → recent=12, mid=25', () => {
  expect(getTiers(400_000)).toEqual({ recent: 12, mid: 25 })
})

test('getTiers: ≥ 500k (gpt-4.1 1M) → recent=25, mid=50', () => {
  expect(getTiers(1_000_000)).toEqual({ recent: 25, mid: 50 })
})

// ---------- master switch ----------

test('pass-through when toolHistoryCompressionEnabled is false', () => {
  mockState.enabled = false
  const messages = buildConversation(20)
  const result = compressToolHistory(messages, 'gpt-4o')
  expect(result).toBe(messages) // same reference (no transformation)
})

test('pass-through when total tool_results <= recent tier', () => {
  // 100k effective → recent=5; only 4 exchanges → no compression
  const messages = buildConversation(4)
  const result = compressToolHistory(messages, 'gpt-4o')
  expect(result).toBe(messages)
})

// ---------- per-tier behavior ----------

test('recent tier: tool_result content untouched', () => {
  // 100k effective → recent=5, mid=10. With 6 exchanges, only the oldest is touched.
  const messages = buildConversation(6, 5_000)
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  // Last 5 should be untouched (full 5000 chars)
  for (let i = resultMsgs.length - 5; i < resultMsgs.length; i++) {
    expect(getResultText(resultMsgs[i]).length).toBe(5_000)
  }
})

test('mid tier: long content truncated to head+tail with middle marker', () => {
  // 100k → recent=5, mid=10. 10 exchanges: 5 recent + 5 mid (none old).
  const messages = buildConversation(10, 5_000)
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  // First 5 are mid tier — head 1500 + marker + tail 500
  for (let i = 0; i < 5; i++) {
    const text = getResultText(resultMsgs[i])
    expect(text).toContain('[…middle pruned,')
    expect(text).toContain('chars from tool history]')
    const omitted = 5_000 - 1_500 - 500
    expect(text).toContain(`[…middle pruned, ${omitted} chars from tool history]`)
    // Head preserved: starts with 1500 'x' chars
    expect(text.startsWith('x'.repeat(1_500))).toBe(true)
    // Tail preserved: ends with 500 'x' chars
    expect(text.endsWith('x'.repeat(500))).toBe(true)
    // Total budget: head + marker + tail ≈ 2k + marker overhead
    expect(text.length).toBeLessThan(2_200)
    expect(text.length).toBeGreaterThan(2_000)
  }
})

test('mid tier: tail of realistic content survives (exit code line at end)', () => {
  // The reason head+tail exists: command output puts the summary at the END.
  const tailLine = 'Exit code 1. 3 files failed lint.'
  const text = bigText(5_000) + '\n' + tailLine
  const messages: Msg[] = [{ role: 'user', content: 'start' }]
  for (let i = 0; i < 10; i++) {
    messages.push({
      role: 'assistant',
      content: [{ type: 'tool_use', id: `toolu_${i}`, name: 'Bash', input: { command: 'ls' } }],
    })
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: `toolu_${i}`,
          content: i === 4 ? text : bigText(100), // only #4 oversized
        },
      ],
    })
  }
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)
  // Mid tier keeps the trailing line verbatim in the 500-char tail
  expect(getResultText(resultMsgs[4]).endsWith(tailLine)).toBe(true)
})

test('mid tier: short content (< MID_MAX_CHARS) untouched', () => {
  const messages = buildConversation(10, 500) // 500 < MID_MAX_CHARS
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  for (let i = 0; i < 5; i++) {
    expect(getResultText(resultMsgs[i])).toBe(bigText(500))
  }
})

test('old tier: content replaced with stub [name args={...} → N chars omitted]', () => {
  // 100k → recent=5, mid=10, old=rest. 20 exchanges → 5 old + 10 mid + 5 recent.
  const messages = buildConversation(20, 5_000)
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  // First 5 are old tier — should be stubs
  for (let i = 0; i < 5; i++) {
    const text = getResultText(resultMsgs[i])
    expect(text).toMatch(/^\[Read args=\{.*\} → 5000 chars omitted\]$/)
  }
})

test('old tier: stub args truncated to 200 chars', () => {
  const longArg = bigText(500)
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    {
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_x',
          name: 'Bash',
          input: { command: longArg },
        },
      ],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'toolu_x', content: 'output' },
      ],
    },
    // Pad with enough recent exchanges to push the above into old tier
    ...buildConversation(20, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)
  const text = getResultText(resultMsgs[0])

  // Stub format: [Bash args=<json≤200chars> → N chars omitted]
  // The args portion (between args= and →) must be ≤ 200 chars.
  const argsMatch = text.match(/args=(.*?) →/)
  expect(argsMatch).not.toBeNull()
  expect(argsMatch![1].length).toBeLessThanOrEqual(200)
})

test('old tier: orphan tool_result (no matching tool_use) falls back to "tool"', () => {
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    // Orphan: tool_result without matching tool_use in history
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'orphan_id', content: 'data' },
      ],
    },
    ...buildConversation(20, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)
  const text = getResultText(resultMsgs[0])

  expect(text).toMatch(/^\[tool args=\{\} → 4 chars omitted\]$/)
})

// ---------- structural preservation ----------

test('tool_use blocks always preserved', () => {
  const messages = buildConversation(20, 5_000)
  const result = compressToolHistory(messages, 'gpt-4o')

  const useCount = (msgs: Msg[]) =>
    msgs.reduce((sum, m) => {
      if (!Array.isArray(m.content)) return sum
      return sum + m.content.filter((b: any) => b.type === 'tool_use').length
    }, 0)

  expect(useCount(result as Msg[])).toBe(useCount(messages))
})

test('text blocks always preserved', () => {
  const messages: Msg[] = [
    { role: 'user', content: 'first' },
    {
      role: 'assistant',
      content: [
        { type: 'text', text: 'reasoning before tool' },
        { type: 'tool_use', id: 'toolu_1', name: 'Read', input: {} },
      ],
    },
    {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: bigText(5000) }],
    },
    ...buildConversation(20, 5_000).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const assistantMsg = (result as Msg[])[1]
  const textBlock = (assistantMsg.content as Block[]).find((b: any) => b.type === 'text')

  expect(textBlock).toEqual({ type: 'text', text: 'reasoning before tool' })
})

test('thinking blocks always preserved', () => {
  const messages: Msg[] = [
    { role: 'user', content: 'first' },
    {
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'internal reasoning', signature: 'sig' },
        { type: 'tool_use', id: 'toolu_1', name: 'Read', input: {} },
      ],
    },
    {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: bigText(5000) }],
    },
    ...buildConversation(20, 5_000).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const assistantMsg = (result as Msg[])[1]
  const thinking = (assistantMsg.content as Block[]).find((b: any) => b.type === 'thinking')

  expect(thinking).toEqual({
    type: 'thinking',
    thinking: 'internal reasoning',
    signature: 'sig',
  })
})

test('non-array content (string) handled gracefully', () => {
  const messages: Msg[] = [
    { role: 'user', content: 'plain string content' },
    ...buildConversation(20, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  expect((result as Msg[])[0].content).toBe('plain string content')
})

test('empty content array handled gracefully', () => {
  const messages: Msg[] = [
    { role: 'user', content: [] },
    ...buildConversation(20, 100).slice(1),
  ]
  expect(() => compressToolHistory(messages, 'gpt-4o')).not.toThrow()
})

// ---------- message shape compatibility ----------

test('wrapped shape ({ message: { role, content } }) handled', () => {
  type WrappedMsg = { message: { role: string; content: Block[] | string } }
  const wrap = (m: Msg): WrappedMsg => ({ message: { role: m.role, content: m.content } })
  const messages = buildConversation(20, 5_000).map(wrap)
  const result = compressToolHistory(messages as any, 'gpt-4o')

  // First wrapped tool-result message should have stub content (old tier)
  const firstResultMsg = (result as WrappedMsg[]).find(
    m =>
      Array.isArray(m.message.content) &&
      m.message.content.some((b: any) => b.type === 'tool_result'),
  )
  const block = (firstResultMsg!.message.content as Block[]).find(
    (b: any) => b.type === 'tool_result',
  ) as Block
  const text = ((block.content as Block[])[0] as any).text
  expect(text).toMatch(/^\[Read args=.*→ 5000 chars omitted\]$/)
})

test('flat shape ({ role, content }) handled', () => {
  const messages = buildConversation(20, 5_000)
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  expect(getResultText(resultMsgs[0])).toMatch(/^\[Read args=.*→ 5000 chars omitted\]$/)
})

// ---------- tier boundary correctness ----------

test('tier boundaries: 6 exchanges → 1 mid + 5 recent (recent=5)', () => {
  const messages = buildConversation(6, 5_000)
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  // Oldest: mid (truncated)
  expect(getResultText(resultMsgs[0])).toContain('[…middle pruned')
  // Last 5: untouched
  for (let i = 1; i < 6; i++) {
    expect(getResultText(resultMsgs[i]).length).toBe(5_000)
  }
})

test('tier boundaries: 16 exchanges → 1 old + 10 mid + 5 recent', () => {
  const messages = buildConversation(16, 5_000)
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  // Oldest 1: stub (old tier)
  expect(getResultText(resultMsgs[0])).toMatch(/^\[Read .*chars omitted\]$/)
  // Next 10: mid (truncated)
  for (let i = 1; i < 11; i++) {
    expect(getResultText(resultMsgs[i])).toContain('[…middle pruned')
  }
  // Last 5: untouched
  for (let i = 11; i < 16; i++) {
    expect(getResultText(resultMsgs[i]).length).toBe(5_000)
  }
})

test('large window (1M) with 30 exchanges: all untouched (recent=25 ≥ 30 - 5)', () => {
  // ≥500k → recent=25, mid=50. 30 exchanges → 5 mid + 25 recent. None old.
  mockState.effectiveWindow = 1_000_000
  const messages = buildConversation(30, 5_000)
  const result = compressToolHistory(messages, 'gpt-4.1')
  const resultMsgs = getResultMessages(result)

  // Last 25: untouched
  for (let i = 5; i < 30; i++) {
    expect(getResultText(resultMsgs[i]).length).toBe(5_000)
  }
})

// ---------- attribute preservation ----------

test('is_error flag preserved in mid tier', () => {
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'toolu_err', name: 'Bash', input: {} }],
    },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'toolu_err',
          is_error: true,
          content: bigText(5_000),
        },
      ],
    },
    // Pad with enough recent exchanges to push the above into MID tier
    ...buildConversation(10, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)
  const block = getResultBlock(resultMsgs[0]) as { is_error?: boolean; content: unknown }

  expect(block.is_error).toBe(true)
  expect(getResultText(resultMsgs[0])).toContain('[…middle pruned')
})

test('is_error flag preserved in old tier (stub)', () => {
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'toolu_err', name: 'Bash', input: {} }],
    },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'toolu_err',
          is_error: true,
          content: bigText(5_000),
        },
      ],
    },
    ...buildConversation(20, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)
  const block = getResultBlock(resultMsgs[0]) as { is_error?: boolean; content: unknown }

  expect(block.is_error).toBe(true)
  expect(getResultText(resultMsgs[0])).toMatch(/^\[Bash .*chars omitted\]$/)
})

// ---------- COMPACTABLE_TOOLS filter ----------

test('non-compactable tool (e.g. Task/Agent) is NEVER compressed', () => {
  // Build conversation where the OLDEST exchange uses a non-compactable tool name
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    {
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'task_1', name: 'Task', input: { goal: 'plan' } },
      ],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'task_1', content: bigText(5_000) },
      ],
    },
    // Pad with 20 compactable exchanges to push Task into old tier
    ...buildConversation(20, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  // First tool_result is for Task (non-compactable) → must remain full
  expect(getResultText(resultMsgs[0]).length).toBe(5_000)
  expect(getResultText(resultMsgs[0])).not.toContain('chars omitted')
  expect(getResultText(resultMsgs[0])).not.toContain('[…middle pruned')
})

test('mcp__ prefixed tools ARE compactable (matches microCompact behavior)', () => {
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    {
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'mcp_1', name: 'mcp__github__get_issue', input: {} },
      ],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'mcp_1', content: bigText(5_000) },
      ],
    },
    ...buildConversation(20, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  // MCP tool result is compressed (gets stub since it's in old tier)
  expect(getResultText(resultMsgs[0])).toMatch(/^\[mcp__github__get_issue .*chars omitted\]$/)
})

// ---------- skip already-cleared blocks ----------

test('blocks already cleared by microCompact are NOT re-compressed', () => {
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'cleared_1', name: 'Read', input: {} }],
    },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'cleared_1',
          content: '[Old tool result content cleared]', // microCompact's marker
        },
      ],
    },
    ...buildConversation(20, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)

  // Already-cleared marker survives untouched (no double processing)
  expect(getResultText(resultMsgs[0])).toBe('[Old tool result content cleared]')
})

test('extra block attributes (e.g. cache_control) preserved across rewrites', () => {
  const cacheControl = { type: 'ephemeral' }
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'toolu_cc', name: 'Read', input: {} }],
    },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'toolu_cc',
          cache_control: cacheControl,
          content: bigText(5_000),
        },
      ],
    },
    ...buildConversation(20, 100).slice(1),
  ]
  const result = compressToolHistory(messages, 'gpt-4o')
  const resultMsgs = getResultMessages(result)
  const block = getResultBlock(resultMsgs[0]) as { cache_control?: unknown }

  // The custom attribute survived the stub rewrite via ...block spread
  expect(block.cache_control).toEqual(cacheControl)
})

// ---------- aggressive mode (context-overflow self-heal retry) ----------

test('aggressive mode: tiers shrink to {recent: 2, mid: 3} regardless of window', () => {
  // 100k window normally → recent=5, mid=10. Aggressive → recent=2, mid=3.
  // 6 exchanges: normal mode keeps 5 recent + 1 mid; aggressive keeps
  // 2 recent + 3 mid + 1 old (stub).
  mockState.effectiveWindow = 100_000
  const messages = buildConversation(6, 5_000)

  const normal = compressToolHistory(messages, 'gpt-4o')
  const aggressive = compressToolHistory(messages, 'gpt-4o', { aggressive: true })

  const normalMsgs = getResultMessages(normal)
  const aggressiveMsgs = getResultMessages(aggressive)

  // Normal: index 0 is mid (truncated), 1-5 recent (full)
  expect(getResultText(normalMsgs[0])).toContain('[…middle pruned')
  for (let i = 1; i < 6; i++) {
    expect(getResultText(normalMsgs[i]).length).toBe(5_000)
  }

  // Aggressive: indices 0 old (stub), 1-3 mid, 4-5 recent. Recent tier keeps
  // full content only when within budget; 5000 chars > MID_MAX_CHARS →
  // truncated by the aggressive recent-tier cap.
  expect(getResultText(aggressiveMsgs[0])).toMatch(/^\[Read .*chars omitted\]$/)
  for (let i = 1; i < 4; i++) {
    expect(getResultText(aggressiveMsgs[i])).toContain('[…middle pruned')
  }
  for (let i = 4; i < 6; i++) {
    expect(getResultText(aggressiveMsgs[i])).toContain('[…middle pruned')
    expect(getResultText(aggressiveMsgs[i]).length).toBeLessThan(5_000)
  }
})

test('aggressive mode: oversized results in the recent tier are truncated', () => {
  // Normal mode never touches the recent tier. Aggressive mode truncates
  // oversized (> MID_MAX_CHARS) results there too — this is what guarantees
  // the retry shrinks strictly more than the first attempt.
  mockState.effectiveWindow = 100_000
  const messages = buildConversation(3, 5_000) // 3 exchanges, all recent normally

  const normal = compressToolHistory(messages, 'gpt-4o')
  expect(normal).toBe(messages) // nothing to do — all recent

  const aggressive = compressToolHistory(messages, 'gpt-4o', { aggressive: true })
  expect(aggressive).not.toBe(messages) // recent-tier oversized results got truncated
  const resultMsgs = getResultMessages(aggressive)
  for (let i = 0; i < 3; i++) {
    // recent=2: indices 0-1 are recent tier (aggressive truncation), index 2
    // is also recent (fromEnd = 0, 1 both < 2)... all three are within recent=2? No:
    // fromEnd for idx 2 = 0, idx 1 = 1, idx 0 = 2 → idx 0 falls in MID window
    // (fromEnd 2 < recent 2 + mid 3). So idx 0 is mid-truncated, idx 1-2 recent-truncated.
    expect(getResultText(resultMsgs[i])).toContain('[…middle pruned')
  }
})

test('aggressive mode: kill-switch off → returns original reference (no retry)', () => {
  mockState.enabled = false
  const messages = buildConversation(6, 5_000)
  const result = compressToolHistory(messages, 'gpt-4o', { aggressive: true })
  expect(result).toBe(messages)
})

test('aggressive mode: nothing compactable → same reference as normal mode', () => {
  // All tool results are for non-compactable tools → aggressive pass returns
  // the same reference, so the shim's retry guard skips the round trip.
  mockState.effectiveWindow = 100_000
  const messages: Msg[] = [
    { role: 'user', content: 'start' },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'task_1', name: 'Task', input: { goal: 'x' } }],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'task_1', content: bigText(5_000) },
      ],
    },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'task_2', name: 'Task', input: { goal: 'y' } }],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'task_2', content: bigText(5_000) },
      ],
    },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'task_3', name: 'Task', input: { goal: 'z' } }],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'task_3', content: bigText(5_000) },
      ],
    },
  ]
  const normal = compressToolHistory(messages, 'gpt-4o')
  const aggressive = compressToolHistory(messages, 'gpt-4o', { aggressive: true })
  expect(normal).toBe(messages)
  expect(aggressive).toBe(messages)
})

// ---------- determinism (prefix-cache stability) ----------

test('deterministic: two structurally identical inputs produce equal output', () => {
  // Prefix cache at OpenAI-compatible endpoints is byte-sensitive. The forked
  // summarization agent re-derives its request from the same raw history as
  // the main thread; only strict determinism keeps those two serialized
  // prefixes identical (cache hit instead of full re-billing).
  const a = buildConversation(20, 5_000)
  const b = buildConversation(20, 5_000)
  expect(a).not.toBe(b)

  const outA = compressToolHistory(a, 'gpt-4o')
  const outB = compressToolHistory(b, 'gpt-4o')
  expect(outA).toEqual(outB)

  const aggA = compressToolHistory(a, 'gpt-4o', { aggressive: true })
  const aggB = compressToolHistory(b, 'gpt-4o', { aggressive: true })
  expect(aggA).toEqual(aggB)
})
