/**
 * Voice stream STT — permanent no-op.
 *
 * The real implementation streams audio to Anthropic's claude.ai
 * voice_stream endpoint, which is unreachable (and auth is removed) in this
 * intranet build. `isVoiceStreamAvailable()` returning false makes every
 * voice entry point degrade gracefully. See voice/voiceModeEnabled.ts.
 */

export type FinalizeSource =
  | 'key_release'
  | 'timeout'
  | 'cancel'
  | 'no_data_timeout'

export type VoiceStreamConnection = {
  close(): void
  send(data: Buffer): void
  finalize(source?: FinalizeSource): Promise<FinalizeSource | undefined>
}

export type VoiceStreamOptions = {
  onTranscript(text: string, isFinal: boolean): void
  onError(error?: unknown): void
  onClose(): void
  onReady(connection: VoiceStreamConnection): void
}

export function isVoiceStreamAvailable(): boolean {
  return false
}

export async function connectVoiceStream(
  _options?: VoiceStreamOptions,
): Promise<VoiceStreamConnection> {
  throw new Error('Voice mode is unavailable in this build.')
}
