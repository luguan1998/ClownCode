import { afterEach, beforeEach, expect, test } from 'bun:test'
import { getAnthropicClient } from './client.js'

type FetchType = typeof globalThis.fetch

type ShimClient = {
  beta: {
    messages: {
      create: (params: Record<string, unknown>) => Promise<unknown>
    }
  }
}

const originalFetch = globalThis.fetch
const originalMacro = (globalThis as Record<string, unknown>).MACRO
const originalEnv = {
  CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_API_BASE: process.env.OPENAI_API_BASE,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
  ANTHROPIC_CUSTOM_HEADERS: process.env.ANTHROPIC_CUSTOM_HEADERS,
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}

beforeEach(() => {
  ;(globalThis as Record<string, unknown>).MACRO = { VERSION: 'test-version' }

  // OpenClaude defaults to the OpenAI-compatible shim.
  delete process.env.CLAUDE_CODE_USE_OPENAI
  process.env.OPENAI_API_KEY = 'openai-test-key'
  process.env.OPENAI_BASE_URL = 'http://example.test/v1'
  process.env.OPENAI_MODEL = 'test-model'
  delete process.env.OPENAI_API_BASE
  delete process.env.ANTHROPIC_BASE_URL
  delete process.env.ANTHROPIC_MODEL
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_AUTH_TOKEN
  delete process.env.ANTHROPIC_CUSTOM_HEADERS
})

afterEach(() => {
  ;(globalThis as Record<string, unknown>).MACRO = originalMacro
  restoreEnv('CLAUDE_CODE_USE_OPENAI', originalEnv.CLAUDE_CODE_USE_OPENAI)
  restoreEnv('OPENAI_API_KEY', originalEnv.OPENAI_API_KEY)
  restoreEnv('OPENAI_BASE_URL', originalEnv.OPENAI_BASE_URL)
  restoreEnv('OPENAI_API_BASE', originalEnv.OPENAI_API_BASE)
  restoreEnv('OPENAI_MODEL', originalEnv.OPENAI_MODEL)
  restoreEnv('ANTHROPIC_BASE_URL', originalEnv.ANTHROPIC_BASE_URL)
  restoreEnv('ANTHROPIC_MODEL', originalEnv.ANTHROPIC_MODEL)
  restoreEnv('ANTHROPIC_API_KEY', originalEnv.ANTHROPIC_API_KEY)
  restoreEnv('ANTHROPIC_AUTH_TOKEN', originalEnv.ANTHROPIC_AUTH_TOKEN)
  restoreEnv('ANTHROPIC_CUSTOM_HEADERS', originalEnv.ANTHROPIC_CUSTOM_HEADERS)
  globalThis.fetch = originalFetch
})

test('routes default provider requests through the OpenAI-compatible shim', async () => {
  let capturedUrl: string | undefined
  let capturedHeaders: Headers | undefined
  let capturedBody: Record<string, unknown> | undefined

  globalThis.fetch = (async (input, init) => {
    capturedUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    capturedHeaders = new Headers(init?.headers)
    capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>

    return new Response(
      JSON.stringify({
        id: 'chatcmpl-test',
        model: 'test-model',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'shim ok',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 3,
          total_tokens: 11,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }) as FetchType

  const client = (await getAnthropicClient({
    maxRetries: 0,
    model: 'test-model',
  })) as unknown as ShimClient

  const response = await client.beta.messages.create({
    model: 'test-model',
    system: 'test system',
    messages: [{ role: 'user', content: 'hello' }],
    max_tokens: 64,
    stream: false,
  })

  expect(capturedUrl).toBe('http://example.test/v1/chat/completions')
  expect(capturedHeaders?.get('authorization')).toBe('Bearer openai-test-key')
  expect(capturedBody?.model).toBe('test-model')
  expect(response).toMatchObject({
    role: 'assistant',
    model: 'test-model',
  })
})

test('strips Anthropic-specific custom headers before sending OpenAI-compatible shim requests', async () => {
  let capturedHeaders: Headers | undefined

  process.env.CLAUDE_CODE_USE_OPENAI = '1'
  process.env.OPENAI_API_KEY = 'openai-test-key'
  process.env.OPENAI_BASE_URL = 'http://example.test/v1'
  process.env.OPENAI_MODEL = 'gpt-4o'
  process.env.ANTHROPIC_CUSTOM_HEADERS = [
    'anthropic-version: 2023-06-01',
    'anthropic-beta: prompt-caching-2024-07-31',
    'x-anthropic-additional-protection: true',
    'x-claude-remote-session-id: remote-123',
    'x-app: cli',
    'x-safe-header: keep-me',
  ].join('\n')

  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = new Headers(init?.headers)

    return new Response(
      JSON.stringify({
        id: 'chatcmpl-openai',
        model: 'gpt-4o',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'ok',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 3,
          total_tokens: 11,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }) as FetchType

  const client = (await getAnthropicClient({
    maxRetries: 0,
    model: 'gpt-4o',
  })) as unknown as ShimClient

  await client.beta.messages.create({
    model: 'gpt-4o',
    system: 'test system',
    messages: [{ role: 'user', content: 'hello' }],
    max_tokens: 64,
    stream: false,
  })

  expect(capturedHeaders?.get('anthropic-version')).toBeNull()
  expect(capturedHeaders?.get('anthropic-beta')).toBeNull()
  expect(capturedHeaders?.get('x-anthropic-additional-protection')).toBeNull()
  expect(capturedHeaders?.get('x-claude-remote-session-id')).toBeNull()
  expect(capturedHeaders?.get('x-app')).toBeNull()
  expect(capturedHeaders?.get('x-safe-header')).toBe('keep-me')
  expect(capturedHeaders?.get('authorization')).toBe('Bearer openai-test-key')
})

test('strips Anthropic-specific custom headers on providerOverride shim requests too', async () => {
  let capturedHeaders: Headers | undefined

  process.env.ANTHROPIC_CUSTOM_HEADERS = [
    'anthropic-version: 2023-06-01',
    'anthropic-beta: prompt-caching-2024-07-31',
    'x-claude-remote-session-id: remote-123',
    'x-safe-header: keep-me',
  ].join('\n')

  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = new Headers(init?.headers)

    return new Response(
      JSON.stringify({
        id: 'chatcmpl-provider-override',
        model: 'gpt-4o',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'ok',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 3,
          total_tokens: 11,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }) as FetchType

  const client = (await getAnthropicClient({
    maxRetries: 0,
    providerOverride: {
      model: 'gpt-4o',
      baseURL: 'http://example.test/v1',
      apiKey: 'provider-test-key',
    },
  })) as unknown as ShimClient

  await client.beta.messages.create({
    model: 'unused',
    system: 'test system',
    messages: [{ role: 'user', content: 'hello' }],
    max_tokens: 64,
    stream: false,
  })

  expect(capturedHeaders?.get('anthropic-version')).toBeNull()
  expect(capturedHeaders?.get('anthropic-beta')).toBeNull()
  expect(capturedHeaders?.get('x-claude-remote-session-id')).toBeNull()
  expect(capturedHeaders?.get('x-safe-header')).toBe('keep-me')
  expect(capturedHeaders?.get('authorization')).toBe('Bearer provider-test-key')
})
