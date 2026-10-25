/**
 * OpenClaude: Anthropic subscription quota/limit tracking was removed.
 * These stubs keep SDK/UI call sites compiling without network access.
 */

export type OverageDisabledReason =
  | 'overage_not_provisioned'
  | 'org_level_disabled'
  | 'org_level_disabled_until'
  | 'out_of_credits'
  | 'seat_tier_level_disabled'
  | 'member_level_disabled'
  | 'seat_tier_zero_credit_limit'
  | 'group_zero_credit_limit'
  | 'member_zero_credit_limit'
  | 'org_service_level_disabled'
  | 'org_service_zero_credit_limit'
  | 'no_limits_configured'
  | 'unknown'

export type ClaudeAILimits = {
  status: 'allowed' | 'warning' | 'limited' | string
  isUsingOverage: boolean
  /**
   * Quota fields are typed because SDK call sites map them
   * (`toSDKRateLimitInfo`); they stay unset unless 429 responses carry
   * Anthropic's quota headers.
   */
  resetsAt?: number
  rateLimitType?:
    | 'five_hour'
    | 'seven_day'
    | 'seven_day_opus'
    | 'seven_day_sonnet'
    | 'overage'
  utilization?: number
  overageStatus?: 'allowed' | 'allowed_warning' | 'rejected'
  overageResetsAt?: number
  overageDisabledReason?: OverageDisabledReason
  surpassedThreshold?: number
  unifiedRateLimitFallbackAvailable?: boolean
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
