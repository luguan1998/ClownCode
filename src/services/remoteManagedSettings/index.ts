/**
 * OpenClaude: remote (Anthropic-hosted) managed settings were removed.
 * Configuration is local-only.
 */

export function isEligibleForRemoteManagedSettings(): boolean {
  return false
}

export function initializeRemoteManagedSettingsLoadingPromise(): void {}

export async function waitForRemoteManagedSettingsToLoad(): Promise<void> {}

export async function loadRemoteManagedSettings(): Promise<void> {}

export async function refreshRemoteManagedSettings(): Promise<void> {}
