import { existsSync, readFileSync } from 'node:fs'

const DIST = 'dist/cli.mjs'
const BANNED_PATTERNS = [
  'datadoghq.com',
  'api/event_logging/batch',
  'api/claude_code/metrics',
  'getKubernetesNamespace',
  '/var/run/secrets/kubernetes',
  '/proc/self/mountinfo',
  'tengu_internal_record_permission_context',
  'anthropic-serve',
  'infra.ant.dev',
  'claude-code-feedback',
  'C07VBSHV7EV',
  // OpenClaude: no vendor/cloud model endpoints may be bundled.
  'api.openai.com',
  'chatgpt.com',
  'auth.openai.com',
  'api.deepseek.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'models.github.ai',
  'api.githubcopilot.com',
  'api.x.ai',
  'api.minimax.io',
  'integrate.api.nvidia.com',
  'llm.bankr.bot',
  'api.z.ai',
  'api.moonshot.ai',
  'api.moonshot.cn',
  'api.kimi.com',
  'downloads.claude.ai',
  'raw.githubusercontent.com/anthropics/claude-plugins-official',
  // NOTE: `api.anthropic.com`, `platform.claude.com`, and the bare string
  // `claude.ai` are intentionally not banned. The Anthropic SDK bundles its
  // default base URL as an inert fallback (OpenClaude always passes
  // ANTHROPIC_BASE_URL explicitly), and the other occurrences are docs/brand
  // text in warning messages and UI labels, not request targets.
] as const

if (!existsSync(DIST)) {
  console.error(`ERROR: ${DIST} not found. Run 'bun run build' first.`)
  process.exit(1)
}

const contents = readFileSync(DIST, 'utf8')
let exitCode = 0

console.log(`Checking ${DIST} for banned patterns...`)
console.log('')

for (const pattern of BANNED_PATTERNS) {
  const count = contents.split(pattern).length - 1
  if (count > 0) {
    console.log(`  FAIL: '${pattern}' found (${count} occurrences)`)
    exitCode = 1
  } else {
    console.log(`  PASS: '${pattern}' not found`)
  }
}

console.log('')

if (exitCode === 0) {
  console.log('✓ All checks passed — no banned patterns in build output')
} else {
  console.log('✗ FAILED — banned patterns found in build output')
}

process.exit(exitCode)
