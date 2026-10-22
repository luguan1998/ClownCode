import { afterEach, beforeEach, expect, mock, test } from 'bun:test'

const originalEnv = {
  CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI,
}

beforeEach(() => {
  mock.restore()
})

afterEach(() => {
  process.env.CLAUDE_CODE_USE_OPENAI = originalEnv.CLAUDE_CODE_USE_OPENAI
  mock.restore()
})

async function importFreshProvidersModule() {
  return import(`./providers.ts?ts=${Date.now()}-${Math.random()}`)
}

function clearProviderEnv(): void {
  delete process.env.CLAUDE_CODE_USE_OPENAI
}

test('defaults to the OpenAI-compatible shim when CLAUDE_CODE_USE_OPENAI is unset', async () => {
  clearProviderEnv()
  const { getAPIProvider, isOpenAIShimEnabled, usesAnthropicAccountFlow } =
    await importFreshProvidersModule()

  expect(isOpenAIShimEnabled()).toBe(true)
  expect(getAPIProvider()).toBe('openai')
  // OpenClaude removed Anthropic account/OAuth flows entirely.
  expect(usesAnthropicAccountFlow()).toBe(false)
})

test('explicit CLAUDE_CODE_USE_OPENAI=1 keeps the shim enabled', async () => {
  clearProviderEnv()
  process.env.CLAUDE_CODE_USE_OPENAI = '1'
  const { getAPIProvider, isOpenAIShimEnabled } =
    await importFreshProvidersModule()

  expect(isOpenAIShimEnabled()).toBe(true)
  expect(getAPIProvider()).toBe('openai')
})

test.each(['0', 'false', 'no'])(
  'CLAUDE_CODE_USE_OPENAI=%s selects the native Anthropic transport',
  async value => {
    clearProviderEnv()
    process.env.CLAUDE_CODE_USE_OPENAI = value
    const { getAPIProvider, isOpenAIShimEnabled } =
      await importFreshProvidersModule()

    expect(isOpenAIShimEnabled()).toBe(false)
    expect(getAPIProvider()).toBe('firstParty')
  },
)

test('empty string is treated as unset (shim enabled)', async () => {
  clearProviderEnv()
  process.env.CLAUDE_CODE_USE_OPENAI = ''
  const { getAPIProvider, isOpenAIShimEnabled } =
    await importFreshProvidersModule()

  expect(isOpenAIShimEnabled()).toBe(true)
  expect(getAPIProvider()).toBe('openai')
})

test('isFirstPartyAnthropicBaseUrl treats configured intranet endpoints as first-party', async () => {
  const { isFirstPartyAnthropicBaseUrl } = await importFreshProvidersModule()
  expect(isFirstPartyAnthropicBaseUrl()).toBe(true)
})
