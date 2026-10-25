import * as React from 'react';

type Props = {
  voiceState: 'idle' | 'recording' | 'processing';
};

/**
 * Voice mode is unavailable in this build (see voice/voiceModeEnabled.ts), so
 * the indicator never renders. The signature is kept for the call sites.
 */
export function VoiceIndicator(_props: Props): React.ReactNode {
  return null;
}
