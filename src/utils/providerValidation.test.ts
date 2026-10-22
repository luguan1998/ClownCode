import { afterEach, expect, test } from 'bun:test'

import {
  getProviderValidationError,
  shouldExitForStartupProviderValidationError,
} from './providerValidation.ts'

const ENV_KEYS = [
  'CLAUDE_CODE_USE_OPENAI',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_API_BASE',
  'OPENAI_MODEL',
  'OPENAI_AUTH_HEADER_VALUE',
] as const

const originalEnv: Record<string, string | undefined> = {}

function clearEnv(): void {
  for (const key of ENV_KEYS) {
    originalEnv[key] ??= process.env[key]
    delete process.env[key]
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const original = originalEnv[key]
    if (original === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = original
    }
  }
})

test('requires a base URL when the shim is enabled by default', async () => {
  clearEnv()
  const message = await getProviderValidationError(process.env)
  expect(message).toContain('No API endpoint configured')
  expect(message).toContain('ANTHROPIC_BASE_URL')
})

test('requires a key for remote endpoints', async () => {
  clearEnv()
  process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1'

  const message = await getProviderValidationError(process.env)
  expect(message).toContain('An API key is required')
  expect(message).toContain('ANTHROPIC_AUTH_TOKEN')
})

test('allows missing key for intranet endpoints', async () => {
  clearEnv()
  process.env.ANTHROPIC_BASE_URL = 'http://gateway.internal/v1'

  await expect(getProviderValidationError(process.env)).resolves.toBeNull()
})

test('accepts ANTHROPIC_AUTH_TOKEN as the shim credential', async () => {
  clearEnv()
  process.env.ANTHROPIC_BASE_URL = 'http://gateway.internal/v1'
  process.env.ANTHROPIC_AUTH_TOKEN = 'token-123'

  await expect(getProviderValidationError(process.env)).resolves.toBeNull()
})

test('native transport requires ANTHROPIC_BASE_URL', async () => {
  clearEnv()
  process.env.CLAUDE_CODE_USE_OPENAI = '0'
  process.env.ANTHROPIC_API_KEY = 'key'

  const message = await getProviderValidationError(process.env)
  expect(message).toContain('ANTHROPIC_BASE_URL is not configured')
})

test('native transport accepts API key with configured endpoint', async () => {
  clearEnv()
  process.env.CLAUDE_CODE_USE_OPENAI = '0'
  process.env.ANTHROPIC_BASE_URL = 'http://anthropic.internal'
  process.env.ANTHROPIC_API_KEY = 'key'

  await expect(getProviderValidationError(process.env)).resolves.toBeNull()
})

test('startup provider validation allows interactive recovery', () => {
  expect(
    shouldExitForStartupProviderValidationError({
      args: [],
      stdoutIsTTY: true,
    }),
  ).toBe(false)
})

test('startup provider validation stays strict for non-interactive launches', () => {
  expect(
    shouldExitForStartupProviderValidationError({
      args: ['-p', 'hello'],
      stdoutIsTTY: true,
    }),
  ).toBe(true)
  expect(
    shouldExitForStartupProviderValidationError({
      args: ['--print', 'hello'],
      stdoutIsTTY: true,
    }),
  ).toBe(true)
  expect(
    shouldExitForStartupProviderValidationError({
      args: [],
      stdoutIsTTY: false,
    }),
  ).toBe(true)
  expect(
    shouldExitForStartupProviderValidationError({
      args: ['--sdk-url', 'ws://127.0.0.1:3000'],
      stdoutIsTTY: true,
    }),
  ).toBe(true)
  expect(
    shouldExitForStartupProviderValidationError({
      args: ['--sdk-url=ws://127.0.0.1:3000'],
      stdoutIsTTY: true,
    }),
  ).toBe(true)
})
