/**
 * OpenClaude: the official first-party MCP registry was removed. Only MCP
 * servers configured locally (settings, .mcp.json, --mcp-config) are used.
 */

export async function prefetchOfficialMcpUrls(): Promise<void> {}

export function isOfficialMcpUrl(_normalizedUrl: string): boolean {
  return false
}

export function resetOfficialMcpUrlsForTesting(): void {}
