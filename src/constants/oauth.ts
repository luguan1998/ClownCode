/**
 * OpenClaude: OAuth login was removed. This module keeps the small set of
 * constants that the native Anthropic transport and MCP OAuth still reference,
 * but contains no outbound endpoints.
 */

export const OAUTH_BETA_HEADER = 'oauth-2025-04-20'

/** OpenClaude: no OAuth config file suffix is used. */
export function fileSuffixForOauthConfig(): string {
  return ''
}

/** OpenClaude: MCP OAuth client metadata is not hosted by this build. */
export const MCP_CLIENT_METADATA_URL = ''

/**
 * Returns endpoint defaults derived from local configuration. There are no
 * hardcoded Anthropic/Claude.ai URLs.
 */
export function getOauthConfig() {
  return {
    BASE_API_URL: process.env.ANTHROPIC_BASE_URL ?? '',
    CLAUDE_AI_ORIGIN: '',
    OAUTH_FILE_SUFFIX: '',
  }
}
