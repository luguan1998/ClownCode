import { afterEach, expect, test } from 'bun:test'

// MACRO is replaced at build time by Bun.define but not in test mode.
;(globalThis as Record<string, unknown>).MACRO = {
  VERSION: '99.0.0',
  DISPLAY_VERSION: '0.0.0-test',
  BUILD_TIME: new Date().toISOString(),
  ISSUES_EXPLAINER: 'report the issue at https://github.com/anthropics/claude-code/issues',
  PACKAGE_URL: '@gitlawb/openclaude',
  NATIVE_PACKAGE_URL: undefined,
}

import { clearSystemPromptSections } from './systemPromptSections.js'
import { getSystemPrompt } from './prompts.js'

const originalSimpleEnv = process.env.CLAUDE_CODE_SIMPLE

afterEach(() => {
  process.env.CLAUDE_CODE_SIMPLE = originalSimpleEnv
  clearSystemPromptSections()
})

test('lean system prompt keeps the 2.1.288 skeleton', async () => {
  delete process.env.CLAUDE_CODE_SIMPLE

  const prompt = await getSystemPrompt([], 'test-internal-model')
  const text = prompt.join('\n\n')

  expect(text).toContain('You are OpenClaude, an interactive agent')
  expect(text).toContain('# Harness')
  expect(text).toContain('# Memory')
  expect(text).toContain('# Environment')
  expect(text).toContain('# Context management')
})

test('lean system prompt drops the retired sections', async () => {
  delete process.env.CLAUDE_CODE_SIMPLE

  const text = (await getSystemPrompt([], 'test-internal-model')).join('\n\n')

  for (const retired of [
    '# System',
    '# Doing tasks',
    '# Executing actions with care',
    '# Using your tools',
    '# Tone and style',
    '# Text output',
  ]) {
    expect(text).not.toContain(retired)
  }
})

test('lean system prompt stays within the size budget', async () => {
  delete process.env.CLAUDE_CODE_SIMPLE

  const text = (await getSystemPrompt([], 'test-internal-model')).join('\n\n')

  expect(text.length).toBeLessThan(9000)
})

test('lean system prompt keeps the model identity line', async () => {
  delete process.env.CLAUDE_CODE_SIMPLE

  const text = (await getSystemPrompt([], 'test-internal-model')).join('\n\n')

  expect(text).toContain('You are powered by the model test-internal-model.')
})
