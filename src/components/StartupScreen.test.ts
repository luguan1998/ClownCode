import { afterEach, beforeEach, expect, test } from 'bun:test'
import { detectProvider } from './StartupScreen.js'

const ENV_KEYS = [
  'CLAUDE_CODE_USE_OPENAI',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'CLAUDE_MODEL',
  'OPENAI_BASE_URL',
  'OPENAI_API_BASE',
  'OPENAI_MODEL',
  'OPENAI_API_KEY',
]

const originalEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = originalEnv[key]
    }
  }
})

test('defaults to OpenAI-compatible shim and uses ANTHROPIC_BASE_URL', () => {
  process.env.ANTHROPIC_BASE_URL = 'http://gateway.internal/v1'
  process.env.ANTHROPIC_MODEL = 'internal-model'

  const provider = detectProvider()
  expect(provider.name).toBe('Local OpenAI-compatible')
  expect(provider.baseUrl).toBe('http://gateway.internal/v1')
  expect(provider.model).toBe('internal-model')
  expect(provider.isLocal).toBe(true)
})

test('falls back to OPENAI_BASE_URL when ANTHROPIC_BASE_URL is unset', () => {
  process.env.OPENAI_BASE_URL = 'http://fallback.internal/v1'
  process.env.OPENAI_MODEL = 'fallback-model'

  const provider = detectProvider()
  expect(provider.baseUrl).toBe('http://fallback.internal/v1')
  expect(provider.model).toBe('fallback-model')
})

test('labels local OpenAI-compatible servers', () => {
  process.env.OPENAI_BASE_URL = 'http://localhost:11434/v1'
  process.env.OPENAI_MODEL = 'llama3.1'

  expect(detectProvider().name).toBe('Ollama')
  expect(detectProvider().isLocal).toBe(true)
})

test('modelOverride takes priority', () => {
  process.env.OPENAI_BASE_URL = 'http://gateway.internal/v1'
  process.env.OPENAI_MODEL = 'configured-model'

  expect(detectProvider('override-model').model).toBe('override-model')
})

test('CLAUDE_CODE_USE_OPENAI=0 selects the native Anthropic transport', () => {
  process.env.CLAUDE_CODE_USE_OPENAI = '0'
  process.env.ANTHROPIC_BASE_URL = 'http://anthropic.internal'
  process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6'

  const provider = detectProvider()
  expect(provider.name).toBe('Anthropic-compatible')
  expect(provider.baseUrl).toBe('http://anthropic.internal')
})
