import { isEnvTruthy } from '../envUtils.js'

/**
 * OpenClaude: internal deployments only support two transports.
 *
 * - `openai`     OpenAI-compatible shim (the default)
 * - `firstParty` native Anthropic SDK (`CLAUDE_CODE_USE_OPENAI=0`)
 */
export type APIProvider = 'firstParty' | 'openai'

/**
 * OpenClaude: the OpenAI-compatible shim is the default. It is only disabled
 * when `CLAUDE_CODE_USE_OPENAI` is explicitly set to a falsey value.
 */
export function isOpenAIShimEnabled(): boolean {
  const raw = process.env.CLAUDE_CODE_USE_OPENAI
  if (raw === undefined || raw.trim() === '') {
    return true
  }
  return isEnvTruthy(raw)
}

export function getAPIProvider(): APIProvider {
  return isOpenAIShimEnabled() ? 'openai' : 'firstParty'
}

/**
 * OpenClaude: Anthropic account/OAuth flows were removed. API keys and
 * bearer tokens are always configured explicitly.
 */
export function usesAnthropicAccountFlow(): boolean {
  return false
}

export function getAPIProviderForStatsig(): 'firstParty' | 'openai' {
  return getAPIProvider()
}

/**
 * OpenClaude: custom Anthropic-compatible endpoints are the normal case in
 * internal deployments, so treat the configured endpoint as first-party.
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  return true
}
