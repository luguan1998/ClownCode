import { afterEach, beforeEach, expect, mock, test } from 'bun:test'

const originalEnv = { ...process.env }
const originalFetch = globalThis.fetch

async function importFreshModule() {
  mock.restore()
  return import(`./apiPreconnect.ts?ts=${Date.now()}-${Math.random()}`)
}

beforeEach(() => {
  process.env = { ...originalEnv }
  delete process.env.ANTHROPIC_BASE_URL
})

afterEach(() => {
  process.env = { ...originalEnv }
  globalThis.fetch = originalFetch
  mock.restore()
})

test('does not preconnect when the OpenAI shim is active', async () => {
  delete process.env.CLAUDE_CODE_USE_OPENAI
  const fetchMock = mock(() =>
    Promise.resolve(new Response(null, { status: 200 })),
  )
  globalThis.fetch = fetchMock as typeof globalThis.fetch

  const { preconnectAnthropicApi } = await importFreshModule()
  preconnectAnthropicApi()

  expect(fetchMock).not.toHaveBeenCalled()
})

test('preconnects to an explicitly configured native endpoint', async () => {
  process.env.CLAUDE_CODE_USE_OPENAI = '0'
  process.env.ANTHROPIC_BASE_URL = 'http://anthropic.internal'
  const fetchMock = mock(() =>
    Promise.resolve(new Response(null, { status: 200 })),
  )
  globalThis.fetch = fetchMock as typeof globalThis.fetch

  const { preconnectAnthropicApi } = await importFreshModule()
  preconnectAnthropicApi()

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://anthropic.internal')
})

test('does not preconnect without a configured endpoint', async () => {
  process.env.CLAUDE_CODE_USE_OPENAI = '0'
  const fetchMock = mock(() =>
    Promise.resolve(new Response(null, { status: 200 })),
  )
  globalThis.fetch = fetchMock as typeof globalThis.fetch

  const { preconnectAnthropicApi } = await importFreshModule()
  preconnectAnthropicApi()

  expect(fetchMock).not.toHaveBeenCalled()
})
