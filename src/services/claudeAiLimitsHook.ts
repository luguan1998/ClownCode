import { currentLimits, type ClaudeAILimits } from './claudeAiLimits.js'

/**
 * OpenClaude: cloud quota tracking was removed. Always return the neutral
 * "allowed" state so UI components render without network access.
 */
export function useClaudeAiLimits(): ClaudeAILimits {
  return currentLimits
}
