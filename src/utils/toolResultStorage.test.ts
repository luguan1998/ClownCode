import { expect, test } from 'bun:test'

import { createUserMessage } from './messages.ts'
import { applyToolResultReplacementsToMessages } from './toolResultStorage.ts'

test('applyToolResultReplacementsToMessages replaces matching tool results and preserves unrelated messages', () => {
  const unrelated = createUserMessage({ content: 'keep me' })
  const oversizedResult = createUserMessage({
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'very large tool output',
        is_error: false,
      },
    ],
    toolUseResult: {
      stdout: 'very large tool output',
      stderr: '',
    },
  })
  const messages = [unrelated, oversizedResult]
  const replacement =
    '<persisted-output>\nOutput too large. Preview\n</persisted-output>'

  const next = applyToolResultReplacementsToMessages(
    messages,
    new Map([['tool-1', replacement]]),
  )

  expect(next).not.toBe(messages)
  expect(next[0]).toBe(unrelated)
  expect(next[1]).not.toBe(oversizedResult)
  const replaced = next[1]
  if (!replaced) throw new Error('expected a replacement message')
  if (replaced.type !== 'user') throw new Error('expected a user message')
  const content = replaced.message.content
  if (typeof content === 'string') throw new Error('expected tool result blocks')
  const firstBlock = content[0]
  if (!firstBlock || firstBlock.type !== 'tool_result') {
    throw new Error('expected a tool_result block')
  }
  expect(firstBlock.content).toBe(replacement)
  expect(replaced.toolUseResult).toBeUndefined()
})

test('applyToolResultReplacementsToMessages is idempotent when messages are already hydrated', () => {
  const hydrated = createUserMessage({
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: '<persisted-output>\nPreview\n</persisted-output>',
        is_error: false,
      },
    ],
  })
  const messages = [hydrated]

  const next = applyToolResultReplacementsToMessages(
    messages,
    new Map([['tool-1', '<persisted-output>\nPreview\n</persisted-output>']]),
  )

  expect(next).toBe(messages)
})
