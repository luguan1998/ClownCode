/**
 * Voice mode kill-switch (permanent).
 *
 * Voice STT streams to Anthropic's claude.ai voice_stream endpoint via
 * OAuth — both are removed in this intranet build. These gates stay false
 * forever, mirroring `isAnalyticsDisabled()` in services/analytics/config.ts.
 */

export function isVoiceModeEnabled(): boolean {
  return false
}

export function hasVoiceAuth(): boolean {
  return false
}

export function isVoiceGrowthBookEnabled(): boolean {
  return false
}
