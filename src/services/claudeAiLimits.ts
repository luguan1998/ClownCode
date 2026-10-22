/**
 * OpenClaude: Anthropic subscription quota/limit tracking was removed.
 * These stubs keep SDK/UI call sites compiling without network access.
 */

export type OverageDisabledReason = string

export type ClaudeAILimits = {
  status: 'allowed' | 'warning' | 'limited' | string
  isUsingOverage: boolean
  [key: string]: unknown
}

export const currentLimits: ClaudeAILimits = {
  status: 'allowed',
  isUsingOverage: false,
}

export const statusListeners = new Set<(limits: ClaudeAILimits) => void>()

export function extractQuotaStatusFromHeaders(_headers: unknown): void {}

export function extractQuotaStatusFromError(_error: unknown): void {}

export function getRateLimitWarning(
  _limits: ClaudeAILimits,
  _model?: string,
): string | null {
  return null
}

export function getUsingOverageText(_limits: ClaudeAILimits): string | null {
  return null
}

export function getRateLimitErrorMessage(
  _limits: ClaudeAILimits,
  _model?: string,
): string | null {
  return null
}

export function getRawUtilization(): {
  five_hour?: { utilization: number; resets_at: number | string }
  seven_day?: { utilization: number; resets_at: number | string }
} {
  return {}
}
