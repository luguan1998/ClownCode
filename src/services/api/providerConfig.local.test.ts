import { afterEach, expect, test } from 'bun:test'

import {
  getAdditionalModelOptionsCacheScope,
  getLocalProviderRetryBaseUrls,
  isLocalProviderUrl,
  resolveProviderRequest,
  shouldAttemptLocalToollessRetry,
} from './providerConfig.js'

const originalEnv = {
  CLAUDE_CODE_USE_OPENAI: process.env.CLAUDE_CODE_USE_OPENAI,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_API_FORMAT: process.env.OPENAI_API_FORMAT,
}

function clearProviderEnv(): void {
  delete process.env.ANTHROPIC_BASE_URL
  delete process.env.ANTHROPIC_MODEL
  delete process.env.OPENAI_BASE_URL
  delete process.env.OPENAI_MODEL
  delete process.env.OPENAI_API_FORMAT
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}

afterEach(() => {
  restoreEnv('CLAUDE_CODE_USE_OPENAI', originalEnv.CLAUDE_CODE_USE_OPENAI)
  restoreEnv('ANTHROPIC_BASE_URL', originalEnv.ANTHROPIC_BASE_URL)
  restoreEnv('ANTHROPIC_MODEL', originalEnv.ANTHROPIC_MODEL)
  restoreEnv('OPENAI_BASE_URL', originalEnv.OPENAI_BASE_URL)
  restoreEnv('OPENAI_MODEL', originalEnv.OPENAI_MODEL)
  restoreEnv('OPENAI_API_FORMAT', originalEnv.OPENAI_API_FORMAT)
})

test('treats localhost endpoints as local', () => {
  expect(isLocalProviderUrl('http://localhost:11434/v1')).toBe(true)
  expect(isLocalProviderUrl('http://127.0.0.1:11434/v1')).toBe(true)
  expect(isLocalProviderUrl('http://0.0.0.0:11434/v1')).toBe(true)
  // Full 127.0.0.0/8 loopback range should be treated as local
  expect(isLocalProviderUrl('http://127.0.0.2:11434/v1')).toBe(true)
  expect(isLocalProviderUrl('http://127.1.2.3:11434/v1')).toBe(true)
  expect(isLocalProviderUrl('http://127.255.255.255:11434/v1')).toBe(true)
})

test('treats private IPv4 endpoints as local', () => {
  expect(isLocalProviderUrl('http://10.0.0.1:11434/v1')).toBe(true)
  expect(isLocalProviderUrl('http://172.16.0.1:11434/v1')).toBe(true)
  expect(isLocalProviderUrl('http://192.168.0.1:11434/v1')).toBe(true)
})

test('treats .local hostnames as local', () => {
  expect(isLocalProviderUrl('http://ollama.local:11434/v1')).toBe(true)
})

test('treats intranet DNS names as local', () => {
  expect(isLocalProviderUrl('http://gateway.internal/v1')).toBe(true)
  expect(isLocalProviderUrl('http://llm.lan/v1')).toBe(true)
  expect(isLocalProviderUrl('http://api.intranet/v1')).toBe(true)
  // Single-label hostnames resolve via intranet DNS.
  expect(isLocalProviderUrl('http://gateway/v1')).toBe(true)
})

test('treats private IPv6 endpoints as local', () => {
  expect(isLocalProviderUrl('http://[fd00::1]:11434/v1')).toBe(true)
  expect(isLocalProviderUrl('http://[fe80::1]:11434/v1')).toBe(true)
  expect(isLocalProviderUrl('http://[::1]:11434/v1')).toBe(true)
})

test('treats public hosts as remote', () => {
  expect(isLocalProviderUrl('http://203.0.113.1:11434/v1')).toBe(false)
  expect(isLocalProviderUrl('https://example.com/v1')).toBe(false)
  expect(isLocalProviderUrl('http://[2001:4860:4860::8888]:11434/v1')).toBe(false)
})

test('creates a cache scope for local openai-compatible providers', () => {
  clearProviderEnv()
  process.env.CLAUDE_CODE_USE_OPENAI = '1'
  process.env.OPENAI_BASE_URL = 'http://localhost:1234/v1'
  process.env.OPENAI_MODEL = 'llama-3.2-3b-instruct'

  expect(getAdditionalModelOptionsCacheScope()).toBe(
    'openai:http://localhost:1234/v1',
  )
})

test('keeps gpt-5 models on chat completions for local openai-compatible providers', () => {
  clearProviderEnv()
  process.env.CLAUDE_CODE_USE_OPENAI = '1'
  process.env.OPENAI_BASE_URL = 'http://127.0.0.1:8080/v1'
  process.env.OPENAI_MODEL = 'gpt-5.4'

  expect(resolveProviderRequest()).toMatchObject({
    transport: 'chat_completions',
    requestedModel: 'gpt-5.4',
    resolvedModel: 'gpt-5.4',
    baseUrl: 'http://127.0.0.1:8080/v1',
  })
  expect(getAdditionalModelOptionsCacheScope()).toBe(
    'openai:http://127.0.0.1:8080/v1',
  )
})

test('uses responses transport when OpenAI-compatible API format requests responses', () => {
  clearProviderEnv()
  process.env.CLAUDE_CODE_USE_OPENAI = '1'
  process.env.OPENAI_BASE_URL = 'http://gateway.internal/v1'
  process.env.OPENAI_MODEL = 'gpt-5.4'
  process.env.OPENAI_API_FORMAT = 'responses'

  expect(resolveProviderRequest()).toMatchObject({
    transport: 'responses',
    requestedModel: 'gpt-5.4',
    resolvedModel: 'gpt-5.4',
    baseUrl: 'http://gateway.internal/v1',
  })
})

test('ANTHROPIC_BASE_URL takes precedence over OPENAI_BASE_URL', () => {
  clearProviderEnv()
  process.env.ANTHROPIC_BASE_URL = 'http://intranet.example/v1'
  process.env.OPENAI_BASE_URL = 'http://fallback.example/v1'
  process.env.OPENAI_MODEL = 'internal-model'

  expect(resolveProviderRequest()).toMatchObject({
    transport: 'chat_completions',
    requestedModel: 'internal-model',
    resolvedModel: 'internal-model',
    baseUrl: 'http://intranet.example/v1',
  })
})

test('ANTHROPIC_MODEL is used when OPENAI_MODEL is unset', () => {
  clearProviderEnv()
  process.env.ANTHROPIC_BASE_URL = 'http://intranet.example/v1'
  process.env.ANTHROPIC_MODEL = 'anthropic-named-model'

  expect(resolveProviderRequest()).toMatchObject({
    requestedModel: 'anthropic-named-model',
    resolvedModel: 'anthropic-named-model',
  })
})

test('skips local model cache scope for remote openai-compatible providers', () => {
  clearProviderEnv()
  process.env.CLAUDE_CODE_USE_OPENAI = '1'
  process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1'
  process.env.OPENAI_MODEL = 'gpt-4o'

  expect(getAdditionalModelOptionsCacheScope()).toBeNull()
})

test('derives local retry base URLs with /v1 and loopback fallback candidates', () => {
  expect(getLocalProviderRetryBaseUrls('http://localhost:11434')).toEqual([
    'http://localhost:11434/v1',
    'http://127.0.0.1:11434',
    'http://127.0.0.1:11434/v1',
  ])
})

test('does not derive local retry base URLs for remote providers', () => {
  expect(getLocalProviderRetryBaseUrls('https://api.openai.com/v1')).toEqual([])
})

test('enables local toolless retry for likely Ollama endpoints with tools', () => {
  expect(
    shouldAttemptLocalToollessRetry({
      baseUrl: 'http://localhost:11434/v1',
      hasTools: true,
    }),
  ).toBe(true)
})

test('disables local toolless retry when no tools are present', () => {
  expect(
    shouldAttemptLocalToollessRetry({
      baseUrl: 'http://localhost:11434/v1',
      hasTools: false,
    }),
  ).toBe(false)
})

test('disables local toolless retry for non-Ollama local endpoints', () => {
  expect(
    shouldAttemptLocalToollessRetry({
      baseUrl: 'http://localhost:1234/v1',
      hasTools: true,
    }),
  ).toBe(false)
})
