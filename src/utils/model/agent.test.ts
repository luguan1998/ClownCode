import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

const ENV_KEYS = [
  'CLAUDE_CODE_USE_OPENAI',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL',
] as const
const savedEnv: Record<string, string | undefined> = {}

async function importFreshAgentModule() {
  return import(`./agent.js?ts=${Date.now()}-${Math.random()}`)
}

describe('getAgentModel provider-aware fallback', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] ??= process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    }
  })

  test('firstParty resolves haiku alias to a haiku model', async () => {
    process.env.CLAUDE_CODE_USE_OPENAI = '0'
    const { getAgentModel } = await importFreshAgentModule()
    const result = getAgentModel(
      'haiku',
      'claude-sonnet-4-6',
      undefined,
      'default',
    )

    expect(result).toContain('haiku')
    expect(result).not.toBe('claude-sonnet-4-6')
  })

  test('openai shim inherits the parent model for haiku alias', async () => {
    delete process.env.CLAUDE_CODE_USE_OPENAI
    const { getAgentModel } = await importFreshAgentModule()
    const result = getAgentModel(
      'haiku',
      'internal-model',
      undefined,
      'default',
    )

    expect(result).toBe('internal-model')
  })

  test('openai shim inherits the parent model for sonnet alias', async () => {
    delete process.env.CLAUDE_CODE_USE_OPENAI
    const { getAgentModel } = await importFreshAgentModule()
    const result = getAgentModel(
      'sonnet',
      'internal-model',
      undefined,
      'default',
    )

    expect(result).toBe('internal-model')
  })

  test('inherit always returns the parent model', async () => {
    delete process.env.CLAUDE_CODE_USE_OPENAI
    const { getAgentModel } = await importFreshAgentModule()
    expect(
      getAgentModel('inherit', 'parent-model', undefined, 'default'),
    ).toBe('parent-model')
  })

  test('checkIsClaudeNativeProvider distinguishes firstParty from openai', async () => {
    process.env.CLAUDE_CODE_USE_OPENAI = '0'
    const firstPartyModule = await importFreshAgentModule()
    expect(firstPartyModule.checkIsClaudeNativeProvider()).toBe(true)

    delete process.env.CLAUDE_CODE_USE_OPENAI
    const shimModule = await importFreshAgentModule()
    expect(shimModule.checkIsClaudeNativeProvider()).toBe(false)
  })
})
