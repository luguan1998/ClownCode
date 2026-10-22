import type { ModelSetting } from './model/model.js'

/**
 * OpenClaude: fast mode is an Anthropic cloud/account feature and was removed.
 * This stub keeps the existing call sites compiling while always reporting
 * "off" and never performing network requests.
 */

export const FAST_MODE_MODEL_DISPLAY = 'Opus 4.6'

export type CooldownReason = 'rate_limit' | 'overloaded'

export type FastModeRuntimeState =
  | { status: 'active' }
  | { status: 'cooldown'; resetAt: number; reason: CooldownReason }

export type FastModeDisabledReason = string

export function isFastModeEnabled(): boolean {
  return false
}

export function isFastModeAvailable(): boolean {
  return false
}

export function isFastModeCooldown(): boolean {
  return false
}

export function isFastModeSupportedByModel(_model: ModelSetting): boolean {
  return false
}

export function getFastModeUnavailableReason(): string | null {
  return null
}

export function getFastModeModel(): string {
  return process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || 'gpt-4o'
}

export function getInitialFastModeSetting(_model: ModelSetting): boolean {
  return false
}

export function getFastModeRuntimeState(): FastModeRuntimeState {
  return { status: 'active' }
}

export function triggerFastModeCooldown(
  _resetTimestamp: number,
  _reason: CooldownReason,
): void {}

export function clearFastModeCooldown(): void {}

export function handleFastModeRejectedByAPI(): void {}

export function handleFastModeOverageRejection(_reason: string | null): void {}

export function getFastModeState(
  _model: ModelSetting,
  _fastModeUserEnabled: boolean | undefined,
): 'off' | 'cooldown' | 'on' {
  return 'off'
}

export function resolveFastModeStatusFromCache(): void {}

export async function prefetchFastModeStatus(): Promise<void> {}

export const onCooldownTriggered = (
  _listener: (resetAt: number, reason: CooldownReason) => void,
): (() => void) => () => {}

export const onCooldownExpired = (
  _listener: () => void,
): (() => void) => () => {}

export const onFastModeOverageRejection = (
  _listener: (message: string) => void,
): (() => void) => () => {}

export const onOrgFastModeChanged = (
  _listener: (enabled: boolean) => void,
): (() => void) => () => {}
