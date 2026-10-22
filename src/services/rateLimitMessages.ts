/**
 * OpenClaude: subscription-specific rate-limit classification was removed.
 * Provider errors are surfaced verbatim by the shim.
 */
export function isRateLimitErrorMessage(_text: string): boolean {
  return false
}
