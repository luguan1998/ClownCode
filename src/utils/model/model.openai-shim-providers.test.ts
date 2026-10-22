import { afterEach, beforeEach, expect, test } from 'bun:test'

import { saveGlobalConfig } from '../config.js'

async function importFreshModelModule() {
  const nonce = `${Date.now()}-${Math.random()}`
  return import(`./model.js?ts=${nonce}`)
}

const SAVED_ENV = {
  CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_DEFAULT_OPUS_MODEL: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
  ANTHROPIC_DEFAULT_SONNET_MODEL: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
  ANTHROPIC_DEFAULT_HAIKU_MODEL: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  ANTHROPIC_SMALL_FAST_MODEL: process.env.ANTHROPIC_SMALL_FAST_MODEL,
}

function restoreEnv(key: keyof typeof SAVED_ENV): void {
  if (SAVED_ENV[key] === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = SAVED_ENV[key]
  }
}

beforeEach(() => {
  delete process.env.CLAUDE_CODE_USE_OPENAI
  delete process.env.OPENAI_MODEL
  delete process.env.OPENAI_BASE_URL
  delete process.env.ANTHROPIC_MODEL
  delete process.env.ANTHROPIC_DEFAULT_OPUS_MODEL
  delete process.env.ANTHROPIC_DEFAULT_SONNET_MODEL
  delete process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
  delete process.env.ANTHROPIC_SMALL_FAST_MODEL
  saveGlobalConfig(current => ({
    ...current,
    model: undefined,
  }))
})

afterEach(() => {
  restoreEnv('CLAUDE_CODE_USE_OPENAI')
  restoreEnv('OPENAI_MODEL')
  restoreEnv('OPENAI_BASE_URL')
  restoreEnv('ANTHROPIC_MODEL')
  restoreEnv('ANTHROPIC_DEFAULT_OPUS_MODEL')
  restoreEnv('ANTHROPIC_DEFAULT_SONNET_MODEL')
  restoreEnv('ANTHROPIC_DEFAULT_HAIKU_MODEL')
  restoreEnv('ANTHROPIC_SMALL_FAST_MODEL')
})

test('OpenAI shim reads OPENAI_MODEL instead of stale settings.model', async () => {
  process.env.OPENAI_MODEL = 'internal-model'
  const { getMainLoopModel } = await importFreshModelModule()
  expect(getMainLoopModel()).toBe('internal-model')
})

test('OpenAI shim falls back to ANTHROPIC_MODEL for compatibility', async () => {
  process.env.ANTHROPIC_MODEL = 'anthropic-named-model'
  const { getMainLoopModel } = await importFreshModelModule()
  expect(getMainLoopModel()).toBe('anthropic-named-model')
})

test('default Opus/Sonnet/Haiku models use OPENAI_MODEL for the shim', async () => {
  process.env.OPENAI_MODEL = 'internal-model'
  const {
    getDefaultOpusModel,
    getDefaultSonnetModel,
    getDefaultHaikuModel,
    getSmallFastModel,
  } = await importFreshModelModule()

  expect(getDefaultOpusModel()).toBe('internal-model')
  expect(getDefaultSonnetModel()).toBe('internal-model')
  expect(getDefaultHaikuModel()).toBe('internal-model')
  expect(getSmallFastModel()).toBe('internal-model')
})

test('default helpers do not leak claude-* names to the shim', async () => {
  const { getDefaultOpusModel, getDefaultSonnetModel, getDefaultHaikuModel } =
    await importFreshModelModule()

  expect(getDefaultOpusModel()).not.toContain('claude-')
  expect(getDefaultSonnetModel()).not.toContain('claude-')
  expect(getDefaultHaikuModel()).not.toContain('claude-')
})

test('native transport still returns Anthropic defaults', async () => {
  process.env.CLAUDE_CODE_USE_OPENAI = '0'
  const { getDefaultOpusModel } = await importFreshModelModule()
  expect(getDefaultOpusModel()).toContain('claude')
})
