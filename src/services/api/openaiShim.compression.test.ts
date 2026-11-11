import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { createOpenAIShimClient } from './openaiShim.js'

type FetchType = typeof globalThis.fetch
const originalFetch = globalThis.fetch

const originalEnv = {
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
}

// Mock config + autoCompact so the shim sees deterministic state.
const mockState = {
  enabled: true,
  effectiveWindow: 100_000, // Copilot gpt-4o tier
}

mock.module('../../utils/config.js', () => ({
  getGlobalConfig: () => ({
    toolHistoryCompressionEnabled: mockState.enabled,
    autoCompactEnabled: false,
  }),
}))

mock.module('../compact/autoCompact.js', () => ({
  getEffectiveContextWindowSize: () => mockState.effectiveWindow,
}))

type OpenAIShimClient = {
  beta: {
    messages: {
      create: (
        params: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Promise<unknown>
    }
  }
}

function bigText(n: number): string {
  return 'A'.repeat(n)
}

function buildToolExchange(id: number, resultLength: number) {
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

function buildLongConversation(numExchanges: number, resultLength = 5_000) {
  const out: Array<{ role: string; content: unknown }> = [
    { role: 'user', content: 'start the work' },
  ]
  for (let i = 0; i < numExchanges; i++) {
    out.push(...buildToolExchange(i, resultLength))
  }
  return out
}

function makeFakeResponse(): Response {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-1',
      model: 'gpt-4o',
      choices: [
        {
          message: { role: 'assistant', content: 'done' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}

beforeEach(() => {
  process.env.OPENAI_BASE_URL = 'http://example.test/v1'
  process.env.OPENAI_API_KEY = 'test-key'
  delete process.env.OPENAI_MODEL
  mockState.enabled = true
  mockState.effectiveWindow = 100_000
})

afterEach(() => {
  if (originalEnv.OPENAI_BASE_URL === undefined) delete process.env.OPENAI_BASE_URL
  else process.env.OPENAI_BASE_URL = originalEnv.OPENAI_BASE_URL
  if (originalEnv.OPENAI_API_KEY === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY
  if (originalEnv.OPENAI_MODEL === undefined) delete process.env.OPENAI_MODEL
  else process.env.OPENAI_MODEL = originalEnv.OPENAI_MODEL
  globalThis.fetch = originalFetch
})

async function captureRequestBody(
  messages: Array<{ role: string; content: unknown }>,
  model: string,
): Promise<Record<string, unknown>> {
  let captured: Record<string, unknown> | undefined

  globalThis.fetch = (async (_input, init) => {
    captured = JSON.parse(String(init?.body))
    return makeFakeResponse()
  }) as FetchType

  const client = createOpenAIShimClient({}) as OpenAIShimClient
  await client.beta.messages.create({
    model,
    system: 'system prompt',
    messages,
  })

  if (!captured) throw new Error('request not captured')
  return captured
}

function getToolMessages(body: Record<string, unknown>): Array<{ content: string }> {
  const messages = body.messages as Array<{ role: string; content: string }>
  return messages.filter(m => m.role === 'tool')
}

function getAssistantToolCalls(body: Record<string, unknown>): unknown[] {
  const messages = body.messages as Array<{
    role: string
    tool_calls?: unknown[]
  }>
  return messages
    .filter(m => m.role === 'assistant' && Array.isArray(m.tool_calls))
    .flatMap(m => m.tool_calls ?? [])
}

// ============================================================================
// BUG REPRO: without compression, full tool history is resent every turn
// ============================================================================

test('BUG REPRO: without compression, all 30 tool results are sent at full size', async () => {
  mockState.enabled = false
  const messages = buildLongConversation(30, 5_000)

  const body = await captureRequestBody(messages, 'gpt-4o')
  const toolMessages = getToolMessages(body)
  const payloadSize = JSON.stringify(body).length

  // All 30 tool results present, none truncated
  expect(toolMessages.length).toBe(30)
  for (const m of toolMessages) {
    expect(m.content.length).toBeGreaterThanOrEqual(5_000)
    expect(m.content).not.toContain('[…middle pruned')
    expect(m.content).not.toContain('chars omitted')
  }

  // Total payload is large (~150KB raw) — this is the cost being paid every turn
  expect(payloadSize).toBeGreaterThan(150_000)
})

// ============================================================================
// FIX: with compression, recent kept full, mid truncated, old stubbed
// ============================================================================

test('FIX: with compression on Copilot gpt-4o (tier 5/10/rest), 30 turns shrinks dramatically', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000 // 64–128k → recent=5, mid=10
  const messages = buildLongConversation(30, 5_000)

  const body = await captureRequestBody(messages, 'gpt-4o')
  const toolMessages = getToolMessages(body)
  const payloadSize = JSON.stringify(body).length

  // Structure preserved: still 30 tool messages, no orphan tool_calls
  expect(toolMessages.length).toBe(30)
  expect(getAssistantToolCalls(body).length).toBe(30)

  // Tier breakdown (oldest → newest):
  //   indices 0..14  → old tier (stubs)
  //   indices 15..24 → mid tier (truncated)
  //   indices 25..29 → recent (full)
  for (let i = 0; i <= 14; i++) {
    expect(toolMessages[i].content).toMatch(/^\[Read args=.*chars omitted\]$/)
  }
  for (let i = 15; i <= 24; i++) {
    expect(toolMessages[i].content).toContain('[…middle pruned')
  }
  for (let i = 25; i <= 29; i++) {
    expect(toolMessages[i].content.length).toBe(5_000)
    expect(toolMessages[i].content).not.toContain('[…middle pruned')
    expect(toolMessages[i].content).not.toContain('chars omitted')
  }

  // Significant reduction: from ~150KB to <60KB (10 mid×2KB + structure overhead)
  expect(payloadSize).toBeLessThan(60_000)
})

// ============================================================================
// FIX: large-context model gets generous tiers — compression effectively inert
// ============================================================================

test('FIX: gpt-4.1 (1M context) with 25 exchanges keeps all full (recent tier=25)', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 1_000_000 // ≥500k → recent=25, mid=50
  const messages = buildLongConversation(25, 5_000)

  const body = await captureRequestBody(messages, 'gpt-4.1')
  const toolMessages = getToolMessages(body)

  expect(toolMessages.length).toBe(25)
  for (const m of toolMessages) {
    expect(m.content.length).toBe(5_000)
    expect(m.content).not.toContain('[…middle pruned')
    expect(m.content).not.toContain('chars omitted')
  }
})

test('FIX: gpt-4.1 (1M context) with 30 exchanges → only first 5 mid-truncated', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 1_000_000 // recent=25, mid=50
  const messages = buildLongConversation(30, 5_000)

  const body = await captureRequestBody(messages, 'gpt-4.1')
  const toolMessages = getToolMessages(body)

  // 30 total: indices 0..4 mid, indices 5..29 recent
  for (let i = 0; i < 5; i++) {
    expect(toolMessages[i].content).toContain('[…middle pruned')
  }
  for (let i = 5; i < 30; i++) {
    expect(toolMessages[i].content.length).toBe(5_000)
  }
})

// ============================================================================
// FIX: stub preserves tool name and args — model can re-invoke if needed
// ============================================================================

test('FIX: stub format includes original tool name and arguments', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000
  const messages = buildLongConversation(30, 5_000)

  const body = await captureRequestBody(messages, 'gpt-4o')
  const toolMessages = getToolMessages(body)
  const oldestStub = toolMessages[0].content

  // Format: [<tool_name> args=<json> → <N> chars omitted]
  expect(oldestStub).toMatch(/^\[Read /)
  expect(oldestStub).toMatch(/file_path/)
  expect(oldestStub).toMatch(/→ 5000 chars omitted\]$/)
})

// ============================================================================
// FIX: tool_use blocks (assistant tool_calls) are never modified
// ============================================================================

test('FIX: every tool_call retains its full id, name, and arguments', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000
  const messages = buildLongConversation(30, 5_000)

  const body = await captureRequestBody(messages, 'gpt-4o')
  const toolCalls = getAssistantToolCalls(body) as Array<{
    id: string
    function: { name: string; arguments: string }
  }>

  expect(toolCalls.length).toBe(30)
  for (let i = 0; i < toolCalls.length; i++) {
    expect(toolCalls[i].id).toBe(`toolu_${i}`)
    expect(toolCalls[i].function.name).toBe('Read')
    expect(JSON.parse(toolCalls[i].function.arguments)).toEqual({
      file_path: `/path/to/file${i}.ts`,
    })
  }
})

// ============================================================================
// FIX: small-context provider (Mistral 32k) gets aggressive compression
// ============================================================================

test('FIX: 32k window (Mistral tier) → recent=3 keeps last 3 only', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 24_000 // 16–32k → recent=3, mid=5
  const messages = buildLongConversation(15, 3_000)

  const body = await captureRequestBody(messages, 'mistral-large-latest')
  const toolMessages = getToolMessages(body)

  // 15 total: indices 0..6 old, 7..11 mid, 12..14 recent
  for (let i = 0; i <= 6; i++) {
    expect(toolMessages[i].content).toContain('chars omitted')
  }
  for (let i = 7; i <= 11; i++) {
    expect(toolMessages[i].content).toContain('[…middle pruned')
  }
  for (let i = 12; i <= 14; i++) {
    expect(toolMessages[i].content.length).toBe(3_000)
  }
})

// ============================================================================
// Context-overflow self-heal: retry once with aggressive compression
// ============================================================================

test('context_overflow: 400 with overflow message triggers ONE aggressive retry, second attempt succeeds', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000 // recent=5, mid=10 normally; aggressive → 2/3

  const original = process.env.OPENAI_API_FORMAT
  delete process.env.OPENAI_API_FORMAT

  const messages = buildLongConversation(8, 5_000)
  const bodies: Array<Record<string, unknown>> = []
  let callCount = 0

  globalThis.fetch = (async (_input, init) => {
    callCount++
    const body = JSON.parse(String(init?.body))
    bodies.push(body)
    if (callCount === 1) {
      // OpenAI-style context-length 400
      return new Response(
        JSON.stringify({
          error: {
            message:
              "This model's maximum context length is 8192 tokens. However, your messages resulted in 21000 tokens.",
            type: 'invalid_request_error',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return makeFakeResponse()
  }) as FetchType

  const client = createOpenAIShimClient({}) as OpenAIShimClient
  const result = await client.beta.messages.create({
    model: 'gpt-4o',
    system: 'system prompt',
    messages,
  })

  // Retry happened and succeeded
  expect(callCount).toBe(2)
  expect(bodies.length).toBe(2)

  // First body: recent tier = 5 → last 5 results full-size (5000 chars)
  const firstToolMessages = getToolMessages(bodies[0])
  for (let i = 3; i < 8; i++) {
    expect(firstToolMessages[i].content.length).toBe(5_000)
  }

  // Second body: aggressive tiers (recent=2, mid=3) with recent-tier truncation.
  // 8 results: indices 0-2 old (stub), 3-5 mid (head+tail), 6-7 recent.
  // Recent tier in aggressive mode ALSO truncates oversized results (>2k),
  // so index 7 (5000 chars) is truncated too — everything shrinks vs attempt 1.
  const secondToolMessages = getToolMessages(bodies[1])
  expect(secondToolMessages.length).toBe(8)
  for (let i = 0; i < 3; i++) {
    expect(secondToolMessages[i].content).toMatch(/chars omitted/)
  }
  for (let i = 3; i < 8; i++) {
    expect(secondToolMessages[i].content).toContain('[…middle pruned')
    expect(secondToolMessages[i].content.length).toBeLessThan(5_000)
  }

  // The retry actually shrank the payload
  expect(JSON.stringify(bodies[1]).length).toBeLessThan(
    JSON.stringify(bodies[0]).length,
  )

  if (original !== undefined) process.env.OPENAI_API_FORMAT = original
  void result
})

test('context_overflow: no shrink room → error surfaces after single attempt', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000

  const original = process.env.OPENAI_API_FORMAT
  delete process.env.OPENAI_API_FORMAT

  // Tiny conversation: aggressive pass has nothing to shrink → same reference
  // as the first pass → the retry guard skips the round trip entirely.
  const messages = buildLongConversation(1, 100)
  let callCount = 0

  globalThis.fetch = (async (_input, _init) => {
    void _input; void _init
    callCount++
    return new Response(
      JSON.stringify({
        error: {
          message: 'This model maximum context length is 8192 tokens. Your messages resulted in 9000 tokens.',
          type: 'invalid_request_error',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }) as FetchType

  const client = createOpenAIShimClient({}) as OpenAIShimClient
  await expect(
    client.beta.messages.create({
      model: 'gpt-4o',
      system: 'system prompt',
      messages,
    }),
  ).rejects.toThrow()

  expect(callCount).toBe(1)

  if (original !== undefined) process.env.OPENAI_API_FORMAT = original
})

test('context_overflow: overflow retry does not loop — only once even if second also overflows', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000

  const original = process.env.OPENAI_API_FORMAT
  delete process.env.OPENAI_API_FORMAT

  const messages = buildLongConversation(8, 5_000)
  let callCount = 0

  globalThis.fetch = (async (_input, _init) => {
    void _input; void _init
    callCount++
    return new Response(
      JSON.stringify({
        error: {
          message: "This model's maximum context length is 8192 tokens.",
          type: 'invalid_request_error',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }) as FetchType

  const client = createOpenAIShimClient({}) as OpenAIShimClient
  await expect(
    client.beta.messages.create({
      model: 'gpt-4o',
      system: 'system prompt',
      messages,
    }),
  ).rejects.toThrow()

  // First attempt + exactly one aggressive retry, then the error surfaces.
  expect(callCount).toBe(2)

  if (original !== undefined) process.env.OPENAI_API_FORMAT = original
})

test('context_overflow: kill-switch off → no retry, error surfaces immediately', async () => {
  mockState.enabled = false
  mockState.effectiveWindow = 100_000

  const original = process.env.OPENAI_API_FORMAT
  delete process.env.OPENAI_API_FORMAT

  const messages = buildLongConversation(8, 5_000)
  let callCount = 0

  globalThis.fetch = (async (_input, _init) => {
    void _input; void _init
    callCount++
    return new Response(
      JSON.stringify({
        error: {
          message: "This model's maximum context length is 8192 tokens.",
          type: 'invalid_request_error',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }) as FetchType

  const client = createOpenAIShimClient({}) as OpenAIShimClient
  await expect(
    client.beta.messages.create({
      model: 'gpt-4o',
      system: 'system prompt',
      messages,
    }),
  ).rejects.toThrow()

  expect(callCount).toBe(1)

  if (original !== undefined) process.env.OPENAI_API_FORMAT = original
})

test('context_overflow: 413 Payload Too Large also triggers the aggressive retry', async () => {
  mockState.enabled = true
  mockState.effectiveWindow = 100_000

  const original = process.env.OPENAI_API_FORMAT
  delete process.env.OPENAI_API_FORMAT

  const messages = buildLongConversation(8, 5_000)
  let callCount = 0

  globalThis.fetch = (async (_input, init) => {
    callCount++
    if (callCount === 1) {
      void init
      return new Response('Payload Too Large', { status: 413 })
    }
    return makeFakeResponse()
  }) as FetchType

  const client = createOpenAIShimClient({}) as OpenAIShimClient
  await client.beta.messages.create({
    model: 'gpt-4o',
    system: 'system prompt',
    messages,
  })

  expect(callCount).toBe(2)

  if (original !== undefined) process.env.OPENAI_API_FORMAT = original
})
