/**
 * OAuth/account types. Type-only module.
 * (MCP OAuth client lives in services/oauth/client.ts; these are the
 * account-side shapes referenced by utils/config.ts caches.)
 */

export type BillingType = 'free' | 'pro' | 'max' | 'team' | 'enterprise'

export type ReferralEligibilityResponse = {
  eligible: boolean
  [key: string]: unknown
}
