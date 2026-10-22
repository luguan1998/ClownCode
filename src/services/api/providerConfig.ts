import { isIP } from 'node:net'

import { logForDebugging } from '../../utils/debug.js'
import { isOpenAIShimEnabled } from '../../utils/model/providers.js'

/**
 * OpenClaude: this module resolves the single OpenAI-compatible endpoint used
 * by the shim. There are no vendor-specific defaults: the endpoint must come
 * from settings/env. Base URL precedence is:
 *
 *   explicit option > ANTHROPIC_BASE_URL > OPENAI_BASE_URL > OPENAI_API_BASE
 *
 * The same precedence is used for credentials:
 *
 *   explicit option > ANTHROPIC_AUTH_TOKEN > ANTHROPIC_API_KEY > OPENAI_API_KEY
 */

export type ProviderTransport = 'chat_completions' | 'responses'
export type OpenAICompatibleApiFormat = 'chat_completions' | 'responses'

type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh'

export type ResolvedProviderRequest = {
  transport: ProviderTransport
  requestedModel: string
  resolvedModel: string
  baseUrl: string
  reasoning?: {
    effort: ReasoningEffort
  }
}

type ModelDescriptor = {
  raw: string
  baseModel: string
  reasoning?: {
    effort: ReasoningEffort
  }
}

export const MISSING_BASE_URL_MESSAGE =
  'No API endpoint configured. Set ANTHROPIC_BASE_URL (preferred) or OPENAI_BASE_URL in settings.json env.'

const DEFAULT_SHIM_MODEL = 'gpt-4o'

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

// OpenClaude: internal DNS names should be treated like local endpoints, so
// they do not require an API key and get local retry/caching behaviour.
const INTERNAL_HOST_SUFFIXES = [
  '.local',
  '.internal',
  '.lan',
  '.intranet',
  '.corp',
  '.home.arpa',
] as const

const warnedUndefinedEnvNames = new Set<string>()

function isPrivateIpv4Address(hostname: string): boolean {
  const octets = hostname.split('.').map(part => Number.parseInt(part, 10))
  if (octets.length !== 4 || octets.some(octet => Number.isNaN(octet))) {
    return false
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)
  )
}

function isPrivateIpv6Address(hostname: string): boolean {
  const firstHextet = hostname.split(':', 1)[0]
  if (!firstHextet) return false

  const prefix = Number.parseInt(firstHextet, 16)
  if (Number.isNaN(prefix)) return false

  return (prefix & 0xfe00) === 0xfc00 || (prefix & 0xffc0) === 0xfe80
}

// Reads an env-var-style string intended as a URL or path, rejecting both
// empty strings and the literal string "undefined" that Windows shells can
// write when a variable is unset-then-referenced without quotes (issue #336).
function asEnvUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'undefined') {
    return undefined
  }
  return trimmed
}

function asNamedEnvUrl(
  value: string | undefined,
  envName: string,
): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (trimmed === 'undefined') {
    if (!warnedUndefinedEnvNames.has(envName)) {
      warnedUndefinedEnvNames.add(envName)
      logForDebugging(
        `[provider-config] Environment variable ${envName} is the literal string "undefined"; ignoring it.`,
        { level: 'warn' },
      )
    }
    return undefined
  }

  return trimmed
}

function parseReasoningEffort(
  value: string | undefined,
): ReasoningEffort | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'low' ||
    normalized === 'medium' ||
    normalized === 'high' ||
    normalized === 'xhigh'
  ) {
    return normalized
  }
  return undefined
}

export function parseOpenAICompatibleApiFormat(
  value: string | undefined,
): OpenAICompatibleApiFormat | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase().replace(/[- ]+/g, '_')
  if (
    normalized === 'responses' ||
    normalized === 'response' ||
    normalized === 'responses_api'
  ) {
    return 'responses'
  }
  if (
    normalized === 'chat_completions' ||
    normalized === 'chat_completion' ||
    normalized === 'completions' ||
    normalized === 'completion' ||
    normalized === 'chat'
  ) {
    return 'chat_completions'
  }
  return undefined
}

function parseModelDescriptor(model: string): ModelDescriptor {
  const trimmed = model.trim()
  const queryIndex = trimmed.indexOf('?')
  if (queryIndex === -1) {
    return { raw: trimmed, baseModel: trimmed }
  }

  const baseModel = trimmed.slice(0, queryIndex).trim()
  const params = new URLSearchParams(trimmed.slice(queryIndex + 1))
  const reasoning = parseReasoningEffort(params.get('reasoning') ?? undefined)

  return {
    raw: trimmed,
    baseModel,
    reasoning: reasoning ? { effort: reasoning } : undefined,
  }
}

export function isLocalProviderUrl(baseUrl: string | undefined): boolean {
  if (!baseUrl) return false
  try {
    let hostname = new URL(baseUrl).hostname.toLowerCase()

    // Strip IPv6 brackets added by the URL parser (e.g. "[::1]" -> "::1")
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1)
    }

    // Strip RFC6874 IPv6 zone identifiers (e.g. "fe80::1%25en0" -> "fe80::1")
    const zoneIdIndex = hostname.indexOf('%25')
    if (zoneIdIndex !== -1) {
      hostname = hostname.slice(0, zoneIdIndex)
    }

    if (LOCALHOST_HOSTNAMES.has(hostname) || hostname === '0.0.0.0') {
      return true
    }

    if (
      INTERNAL_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix)) ||
      (!hostname.includes('.') && isIP(hostname) === 0)
    ) {
      return true
    }

    const ipVersion = isIP(hostname)
    if (ipVersion === 4) {
      // Treat the full 127.0.0.0/8 loopback range as local
      const firstOctet = Number.parseInt(hostname.split('.', 1)[0] ?? '', 10)
      return firstOctet === 127 || isPrivateIpv4Address(hostname)
    }
    if (ipVersion === 6) {
      return isPrivateIpv6Address(hostname)
    }

    return false
  } catch {
    return false
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizePathWithV1(pathname: string): string {
  const trimmed = trimTrailingSlash(pathname)
  if (!trimmed || trimmed === '/') {
    return '/v1'
  }

  if (trimmed.toLowerCase().endsWith('/v1')) {
    return trimmed
  }

  return `${trimmed}/v1`
}

function isLikelyOllamaEndpoint(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl)
    const hostname = parsed.hostname.toLowerCase()
    const pathname = parsed.pathname.toLowerCase()

    if (parsed.port === '11434') {
      return true
    }

    return hostname.includes('ollama') || pathname.includes('ollama')
  } catch {
    return false
  }
}

export function getLocalProviderRetryBaseUrls(baseUrl: string): string[] {
  if (!isLocalProviderUrl(baseUrl)) {
    return []
  }

  try {
    const parsed = new URL(baseUrl)
    const original = trimTrailingSlash(parsed.toString())
    const seen = new Set<string>([original])
    const candidates: string[] = []

    const addCandidate = (hostname: string, pathname: string): void => {
      const next = new URL(parsed.toString())
      next.hostname = hostname
      next.pathname = pathname
      next.search = ''
      next.hash = ''

      const normalized = trimTrailingSlash(next.toString())
      if (seen.has(normalized)) {
        return
      }

      seen.add(normalized)
      candidates.push(normalized)
    }

    const v1Pathname = normalizePathWithV1(parsed.pathname)
    if (v1Pathname !== trimTrailingSlash(parsed.pathname)) {
      addCandidate(parsed.hostname, v1Pathname)
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (hostname === 'localhost' || hostname === '::1') {
      addCandidate('127.0.0.1', parsed.pathname || '/')
      addCandidate('127.0.0.1', v1Pathname)
    }

    return candidates
  } catch {
    return []
  }
}

export function shouldAttemptLocalToollessRetry(options: {
  baseUrl: string
  hasTools: boolean
}): boolean {
  if (!options.hasTools) {
    return false
  }

  if (!isLocalProviderUrl(options.baseUrl)) {
    return false
  }

  return isLikelyOllamaEndpoint(options.baseUrl)
}

/**
 * OpenClaude: centralized endpoint/credential lookup for the shim.
 */
export function getConfiguredBaseUrl(): string | undefined {
  return (
    asNamedEnvUrl(process.env.ANTHROPIC_BASE_URL, 'ANTHROPIC_BASE_URL') ??
    asNamedEnvUrl(process.env.OPENAI_BASE_URL, 'OPENAI_BASE_URL') ??
    asNamedEnvUrl(process.env.OPENAI_API_BASE, 'OPENAI_API_BASE')
  )
}

export function getConfiguredApiKey(): string | undefined {
  return (
    asEnvUrl(process.env.ANTHROPIC_AUTH_TOKEN) ??
    asEnvUrl(process.env.ANTHROPIC_API_KEY) ??
    asEnvUrl(process.env.OPENAI_API_KEY)
  )
}

export function getConfiguredModel(): string | undefined {
  return (
    asEnvUrl(process.env.OPENAI_MODEL) ??
    asEnvUrl(process.env.ANTHROPIC_MODEL)
  )
}

export function resolveProviderRequest(options?: {
  model?: string
  baseUrl?: string
  fallbackModel?: string
  reasoningEffortOverride?: ReasoningEffort
  apiFormat?: OpenAICompatibleApiFormat | string
}): ResolvedProviderRequest {
  const requestedModel =
    options?.model?.trim() ||
    getConfiguredModel() ||
    options?.fallbackModel?.trim() ||
    DEFAULT_SHIM_MODEL
  const descriptor = parseModelDescriptor(requestedModel)

  const baseUrl = trimTrailingSlash(
    asEnvUrl(options?.baseUrl) ?? getConfiguredBaseUrl() ?? '',
  )

  const requestedApiFormat =
    parseOpenAICompatibleApiFormat(options?.apiFormat) ??
    parseOpenAICompatibleApiFormat(process.env.OPENAI_API_FORMAT)
  const transport: ProviderTransport =
    requestedApiFormat === 'responses' ? 'responses' : 'chat_completions'

  const reasoning = options?.reasoningEffortOverride
    ? { effort: options.reasoningEffortOverride }
    : descriptor.reasoning

  return {
    transport,
    requestedModel,
    resolvedModel: descriptor.baseModel,
    baseUrl,
    reasoning,
  }
}

export function getAdditionalModelOptionsCacheScope(): string | null {
  if (!isOpenAIShimEnabled()) {
    return 'firstParty'
  }

  const request = resolveProviderRequest()
  if (request.transport !== 'chat_completions') {
    return null
  }

  if (!request.baseUrl || !isLocalProviderUrl(request.baseUrl)) {
    return null
  }

  return `openai:${request.baseUrl.toLowerCase()}`
}

export function getReasoningEffortForModel(
  model: string,
): ReasoningEffort | undefined {
  return parseModelDescriptor(model).reasoning?.effort
}

export function supportsCodexReasoningEffort(model: string): boolean {
  const normalized = model.trim().toLowerCase()
  const base = normalized.split('?', 1)[0] ?? normalized

  if (getReasoningEffortForModel(model) !== undefined) {
    return true
  }

  return /^gpt-5(?:[.-]|$)/.test(base)
}
