/**
 * Bridge (remote-control) kill-switch — permanent.
 *
 * Bridge mode connects to Anthropic's CCR infrastructure; feature-gated off
 * at build time (BRIDGE_MODE=false) and dead here. isBridgeEnabled() stays
 * false forever so runtime checks degrade gracefully.
 */

export function isBridgeEnabled(): boolean {
  return false
}
