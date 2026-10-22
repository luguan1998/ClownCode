import type { ScopedMcpServerConfig } from './types.js'

/**
 * OpenClaude: claude.ai-hosted MCP connectors were removed. Only locally
 * configured MCP servers are supported.
 */

export async function fetchClaudeAIMcpConfigsIfEligible(): Promise<
  Record<string, ScopedMcpServerConfig>
> {
  return {}
}

export function clearClaudeAIMcpConfigsCache(): void {}

export function hasClaudeAiMcpEverConnected(): boolean {
  return false
}

export function markClaudeAiMcpConnected(_serverName: string): void {}
