/** OpenClaude: Claude in Chrome integration was removed. */

export function shouldAutoEnableClaudeInChrome(): boolean {
  return false
}

export function shouldEnableClaudeInChrome(_flag?: boolean): boolean {
  return false
}

export function isChromeExtensionInstalled(): boolean {
  return false
}

export function setupClaudeInChrome(): {
  mcpConfig: Record<string, unknown>
  allowedTools: string[]
  systemPrompt?: string
} {
  return { mcpConfig: {}, allowedTools: [], systemPrompt: '' }
}
