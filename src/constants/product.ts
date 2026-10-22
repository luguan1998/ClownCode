/**
 * OpenClaude: Claude.ai / Remote Control product URLs were removed. These
 * constants remain as empty compatibility values for dormant call sites.
 */

export const PRODUCT_URL = ''
export const CLAUDE_AI_BASE_URL = ''
export const CLAUDE_AI_STAGING_BASE_URL = ''
export const CLAUDE_AI_LOCAL_BASE_URL = ''

export function isRemoteSessionStaging(
  _sessionId?: string,
  _ingressUrl?: string,
): boolean {
  return false
}

export function isRemoteSessionLocal(
  _sessionId?: string,
  _ingressUrl?: string,
): boolean {
  return false
}

export function getClaudeAiBaseUrl(
  _sessionId?: string,
  _ingressUrl?: string,
): string {
  return ''
}

export function getRemoteSessionUrl(
  _sessionId: string,
  _ingressUrl?: string,
): string {
  return ''
}
