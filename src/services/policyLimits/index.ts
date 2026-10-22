/**
 * OpenClaude: Anthropic-hosted policy limits were removed. Local settings are
 * the only policy source.
 */

export function isPolicyLimitsEligible(): boolean {
  return false
}

export function initializePolicyLimitsLoadingPromise(): void {}

export async function waitForPolicyLimitsToLoad(): Promise<void> {}

export async function loadPolicyLimits(): Promise<void> {}

export async function refreshPolicyLimits(): Promise<void> {}

export function isPolicyAllowed(_policy: string): boolean {
  return true
}
