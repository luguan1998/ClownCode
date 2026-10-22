/**
 * OpenClaude: OAuth login/token refresh was removed. Stubs keep dormant
 * upstream call sites compiling without any network access.
 */

export async function populateOAuthAccountInfoIfNeeded(): Promise<void> {}

export function isOAuthTokenExpired(_expiresAt: number | null): boolean {
  return true
}
