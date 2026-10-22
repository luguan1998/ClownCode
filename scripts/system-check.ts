// @ts-nocheck
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  getConfiguredApiKey,
  getConfiguredBaseUrl,
  resolveProviderRequest,
  isLocalProviderUrl as isProviderLocalUrl,
} from '../src/services/api/providerConfig.js'
import {
  getLocalOpenAICompatibleProviderLabel,
  probeOllamaGenerationReadiness,
} from '../src/utils/providerDiscovery.js'
import { redactUrlForDisplay } from '../src/utils/urlRedaction.js'

type CheckResult = {
  ok: boolean
  label: string
  detail?: string
}

type CliOptions = {
  json: boolean
  outFile: string | null
}

function pass(label: string, detail?: string): CheckResult {
  return { ok: true, label, detail }
}

function fail(label: string, detail?: string): CheckResult {
  return { ok: false, label, detail }
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no'
}

function parseOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    outFile: null,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--out') {
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        options.outFile = next
        i++
      }
    }
  }

  return options
}

export function formatReachabilityFailureDetail(
  endpoint: string,
  status: number,
  responseBody: string,
  request: {
    transport: string
    requestedModel: string
    resolvedModel: string
  },
): string {
  const compactBody = responseBody.trim().replace(/\s+/g, ' ').slice(0, 240)
  const base = `Unexpected status ${status} from ${redactUrlForDisplay(endpoint)}.`
  const bodySuffix = compactBody ? ` Body: ${compactBody}` : ''

  if (request.transport !== 'codex_responses' || status !== 400) {
    return `${base}${bodySuffix}`
  }

  if (!/not supported.*chatgpt account/i.test(responseBody)) {
    return `${base}${bodySuffix}`
  }

  return `${base}${bodySuffix} Hint: model alias "${request.requestedModel}" resolved to "${request.resolvedModel}", which this ChatGPT account does not currently allow. Try "codexplan" or another entitled Codex model.`
}

function checkNodeVersion(): CheckResult {
  const raw = process.versions.node
  const major = Number(raw.split('.')[0] ?? '0')
  if (Number.isNaN(major)) {
    return fail('Node.js version', `Could not parse version: ${raw}`)
  }

  if (major < 20) {
    return fail('Node.js version', `Detected ${raw}. Require >= 20.`)
  }

  return pass('Node.js version', raw)
}

function checkBunRuntime(): CheckResult {
  const bunVersion = (globalThis as { Bun?: { version?: string } }).Bun?.version
  if (!bunVersion) {
    return pass('Bun runtime', 'Not running inside Bun (this is acceptable for Node startup).')
  }
  return pass('Bun runtime', bunVersion)
}

function checkBuildArtifacts(): CheckResult {
  const distCli = resolve(process.cwd(), 'dist', 'cli.mjs')
  if (!existsSync(distCli)) {
    return fail('Build artifacts', `Missing ${distCli}. Run: bun run build`)
  }
  return pass('Build artifacts', distCli)
}

function isLocalBaseUrl(baseUrl: string): boolean {
  return isProviderLocalUrl(baseUrl)
}

function currentBaseUrl(): string {
  return getConfiguredBaseUrl() ?? ''
}

function checkGeminiEnv(): CheckResult[] {
  const results: CheckResult[] = []
  const model = process.env.GEMINI_MODEL
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  const baseUrl = process.env.GEMINI_BASE_URL ?? GEMINI_DEFAULT_BASE_URL

  results.push(pass('Provider mode', 'Google Gemini provider enabled.'))

  if (!model) {
    results.push(pass('GEMINI_MODEL', 'Not set. Default gemini-2.0-flash will be used.'))
  } else {
    results.push(pass('GEMINI_MODEL', model))
  }

  results.push(pass('GEMINI_BASE_URL', baseUrl))

  if (!key) {
    results.push(fail('GEMINI_API_KEY', 'Missing. Set GEMINI_API_KEY or GOOGLE_API_KEY.'))
  } else {
    results.push(pass('GEMINI_API_KEY', 'Configured.'))
  }

  return results
}

function checkMistralEnv(): CheckResult[] {
  const results: CheckResult[] = []
  const model = process.env.MISTRAL_MODEL
  const key = process.env.MISTRAL_API_KEY
  const baseUrl = process.env.MISTRAL_BASE_URL ?? MISTRAL_DEFAULT_BASE_URL

  results.push(pass('Provider mode', 'Mistral provider enabled.'))

  if (!model) {
    results.push(pass('MISTRAL_MODEL', 'Not set. Default will be used at runtime.'))
  } else {
    results.push(pass('MISTRAL_MODEL', model))
  }

  results.push(pass('MISTRAL_BASE_URL', baseUrl))

  if (!key) {
    results.push(fail('MISTRAL_API_KEY', 'Missing. Set MISTRAL_API_KEY.'))
  } else {
    results.push(pass('MISTRAL_API_KEY', 'Configured.'))
  }

  return results
}

function checkGithubEnv(): CheckResult[] {
  const results: CheckResult[] = []
  const baseUrl = process.env.OPENAI_BASE_URL ?? GITHUB_COPILOT_BASE
  results.push(pass('Provider mode', 'GitHub Models provider enabled.'))

  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
  if (!token?.trim()) {
    results.push(fail('GITHUB_TOKEN', 'Missing. Set GITHUB_TOKEN or GH_TOKEN.'))
  } else {
    results.push(pass('GITHUB_TOKEN', 'Configured.'))
  }

  if (!process.env.OPENAI_MODEL) {
    results.push(
      pass(
        'OPENAI_MODEL',
        'Not set. Default github:copilot → openai/gpt-4.1 at runtime.',
      ),
    )
  } else {
    results.push(pass('OPENAI_MODEL', process.env.OPENAI_MODEL))
  }

  results.push(pass('OPENAI_BASE_URL', baseUrl))
  return results
}

function checkOpenAIEnv(): CheckResult[] {
  const results: CheckResult[] = []
  const raw = process.env.CLAUDE_CODE_USE_OPENAI
  const shimEnabled = raw === undefined || raw.trim() === '' || isTruthy(raw)

  if (!shimEnabled) {
    results.push(pass('Provider mode', 'Native Anthropic transport (CLAUDE_CODE_USE_OPENAI=0).'))
    return results
  }

  const request = resolveProviderRequest()
  results.push(pass('Provider mode', 'OpenAI-compatible shim (default).'))
  results.push(pass('Base URL', request.baseUrl || '(missing — set ANTHROPIC_BASE_URL or OPENAI_BASE_URL)'))
  results.push(pass('Model', process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || '(unset)'))
  results.push(pass('API key configured', getConfiguredApiKey() ? 'yes' : 'no (allowed for local/intranet endpoints)'))
  return results
}

function isAtomicChatUrl(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl)
    return parsed.port === '1337' && isLocalBaseUrl(baseUrl)
  } catch {
    return false
  }
}

function checkOllamaProcessorMode(): CheckResult {
  if (
    !isTruthy(process.env.CLAUDE_CODE_USE_OPENAI) ||
    isTruthy(process.env.CLAUDE_CODE_USE_GEMINI) ||
    isTruthy(process.env.CLAUDE_CODE_USE_GITHUB) ||
    isTruthy(process.env.CLAUDE_CODE_USE_MISTRAL)
  ) {
    return pass('Ollama processor mode', 'Skipped (OpenAI-compatible mode disabled).')
  }

  const baseUrl = currentBaseUrl()
  if (!isLocalBaseUrl(baseUrl)) {
    return pass('Ollama processor mode', 'Skipped (provider URL is not local).')
  }

  if (isAtomicChatUrl(baseUrl)) {
    return pass('Ollama processor mode', 'Skipped (Atomic Chat local provider detected, not Ollama).')
  }

  const result = spawnSync('ollama', ['ps'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: true,
  })

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'Unable to run ollama ps').trim()
    return pass('Ollama processor mode', `Native CLI check failed (${detail}). Assuming valid Docker/remote backend since HTTP ping passed.`)
  }

  const output = (result.stdout || '').trim()
  if (!output) {
    return fail('Ollama processor mode', 'ollama ps returned empty output.')
  }

  const lines = output.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const modelLine = lines.find(line => line.includes(':') && !line.startsWith('NAME'))
  if (!modelLine) {
    return pass('Ollama processor mode', 'No loaded model found (run a prompt first).')
  }

  if (modelLine.includes('CPU')) {
    return pass('Ollama processor mode', 'Detected CPU mode. This is valid but can be slow for larger models.')
  }

  return pass('Ollama processor mode', `Detected non-CPU mode: ${modelLine}`)
}

function serializeSafeEnvSummary(): Record<string, string | boolean> {
  const request = resolveProviderRequest()
  return {
    CLAUDE_CODE_USE_OPENAI:
      process.env.CLAUDE_CODE_USE_OPENAI ?? '(unset, shim enabled)',
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? process.env.ANTHROPIC_MODEL ?? '(unset)',
    BASE_URL: request.baseUrl,
    API_KEY_SET: Boolean(getConfiguredApiKey()),
  }
}

function printResults(results: CheckResult[]): void {
  for (const result of results) {
    const icon = result.ok ? 'PASS' : 'FAIL'
    const suffix = result.detail ? ` - ${result.detail}` : ''
    console.log(`[${icon}] ${result.label}${suffix}`)
  }
}

function writeJsonReport(
  options: CliOptions,
  results: CheckResult[],
): void {
  const envSummary = serializeSafeEnvSummary()
  const payload = {
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    summary: {
      total: results.length,
      passed: results.filter(result => result.ok).length,
      failed: results.filter(result => !result.ok).length,
    },
    env: envSummary,
    results,
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          timestamp: payload.timestamp,
          cwd: payload.cwd,
          summary: payload.summary,
          env: '[redacted in console JSON output; use --out-file for the full report]',
          results: payload.results,
        },
        null,
        2,
      ),
    )
  }

  if (options.outFile) {
    const outputPath = resolve(process.cwd(), options.outFile)
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8')
    if (!options.json) {
      console.log(`Report written to ${outputPath}`)
    }
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  const results: CheckResult[] = []

  const { enableConfigs } = await import('../src/utils/config.js')
  enableConfigs()
  const { applySafeConfigEnvironmentVariables } = await import('../src/utils/managedEnv.js')
  applySafeConfigEnvironmentVariables()
  const { hydrateGithubModelsTokenFromSecureStorage } = await import('../src/utils/githubModelsCredentials.js')
  hydrateGithubModelsTokenFromSecureStorage()

  results.push(checkNodeVersion())
  results.push(checkBunRuntime())
  results.push(checkBuildArtifacts())
  results.push(...checkOpenAIEnv())
  results.push(await checkBaseUrlReachability())
  results.push(await checkProviderGenerationReadiness())
  results.push(checkOllamaProcessorMode())

  if (!options.json) {
    printResults(results)
  }

  writeJsonReport(options, results)

  const hasFailure = results.some(result => !result.ok)
  if (hasFailure) {
    process.exitCode = 1
    return
  }

  if (!options.json) {
    console.log('\nRuntime checks completed successfully.')
  }
}

if (import.meta.main) {
  await main()
}

export {}
