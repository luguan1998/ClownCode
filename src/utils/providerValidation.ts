import {
  isLocalProviderUrl,
  MISSING_BASE_URL_MESSAGE,
} from '../services/api/providerConfig.js'
import { isEnvTruthy } from './envUtils.js'
import { redactSecretValueForDisplay } from './providerSecrets.js'

function isOpenAIShimEnabledForEnv(env: NodeJS.ProcessEnv): boolean {
  const raw = env.CLAUDE_CODE_USE_OPENAI
  if (raw === undefined || raw.trim() === '') return true
  return isEnvTruthy(raw)
}

function getEnvValue(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key]?.trim()
  return value && value !== 'undefined' ? value : undefined
}

function getMissingKeyMessage(baseUrl: string): string {
  return [
    `An API key is required for non-local endpoint ${baseUrl}.`,
    'Set ANTHROPIC_AUTH_TOKEN, ANTHROPIC_API_KEY, or OPENAI_API_KEY in settings.json env',
    '(or set OPENAI_AUTH_HEADER_VALUE when using a custom auth header).',
  ].join('\n')
}

export async function getProviderValidationError(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  const shimEnabled = isOpenAIShimEnabledForEnv(env)
  const baseUrl =
    getEnvValue(env, 'ANTHROPIC_BASE_URL') ??
    getEnvValue(env, 'OPENAI_BASE_URL') ??
    getEnvValue(env, 'OPENAI_API_BASE')

  if (shimEnabled) {
    if (!baseUrl) {
      return MISSING_BASE_URL_MESSAGE
    }

    const apiKey =
      getEnvValue(env, 'ANTHROPIC_AUTH_TOKEN') ??
      getEnvValue(env, 'ANTHROPIC_API_KEY') ??
      getEnvValue(env, 'OPENAI_API_KEY')

    if (apiKey === 'SUA_CHAVE') {
      return 'Invalid API key: placeholder value SUA_CHAVE detected. Set a real key or unset it for local providers.'
    }

    if (
      !apiKey &&
      !getEnvValue(env, 'OPENAI_AUTH_HEADER_VALUE') &&
      !isLocalProviderUrl(baseUrl)
    ) {
      return getMissingKeyMessage(
        redactSecretValueForDisplay(baseUrl, env) ?? baseUrl,
      )
    }
  } else {
    // Native Anthropic SDK path (CLAUDE_CODE_USE_OPENAI=0).
    if (!baseUrl) {
      return [
        'CLAUDE_CODE_USE_OPENAI=0 selected the native Anthropic transport, but ANTHROPIC_BASE_URL is not configured.',
        MISSING_BASE_URL_MESSAGE,
      ].join('\n')
    }
    const authToken =
      getEnvValue(env, 'ANTHROPIC_AUTH_TOKEN') ??
      getEnvValue(env, 'ANTHROPIC_API_KEY') ??
      getEnvValue(env, 'CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR')
    if (!authToken && !isLocalProviderUrl(baseUrl)) {
      return [
        'CLAUDE_CODE_USE_OPENAI=0 selected the native Anthropic transport, but no credential was found.',
        'Set ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY in settings.json env.',
      ].join('\n')
    }
  }

  return null
}

export async function validateProviderEnvOrExit(
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const error = await getProviderValidationError(env)
  if (error) {
    console.error(error)
    process.exit(1)
  }
}

export function shouldExitForStartupProviderValidationError(options: {
  args?: string[]
  stdoutIsTTY?: boolean
} = {}): boolean {
  const args = options.args ?? process.argv.slice(2)
  const stdoutIsTTY = options.stdoutIsTTY ?? process.stdout.isTTY

  if (!stdoutIsTTY) {
    return true
  }

  return (
    args.includes('-p') ||
    args.includes('--print') ||
    args.includes('--init-only') ||
    args.some(arg => arg.startsWith('--sdk-url'))
  )
}

export async function validateProviderEnvForStartupOrExit(
  env: NodeJS.ProcessEnv = process.env,
  options?: {
    args?: string[]
    stdoutIsTTY?: boolean
  },
): Promise<void> {
  const error = await getProviderValidationError(env)
  if (!error) {
    return
  }

  if (shouldExitForStartupProviderValidationError(options)) {
    console.error(error)
    process.exit(1)
  }

  console.error(`Warning: provider configuration is incomplete.\n${error}`)
}
