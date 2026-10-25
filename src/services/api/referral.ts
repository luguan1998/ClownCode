/**
 * Referral / guest-passes API — permanent no-op.
 *
 * The real implementation calls Anthropic's referral endpoints; unreachable
 * in this intranet build. Eligibility never resolves, so the guest-passes
 * upsell UI never renders. See CLAUDE.md zero-outbound charter.
 */

export type PassesEligibility = {
  eligible: boolean
  [key: string]: unknown
}

export function checkCachedPassesEligibility(): PassesEligibility | null {
  return null
}

export function getCachedReferrerReward(): null {
  return null
}

export function getCachedRemainingPasses(): null {
  return null
}

export function formatCreditAmount(_amount: number): string {
  return ''
}
