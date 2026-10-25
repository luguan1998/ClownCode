import * as React from 'react';
import { Text } from '../../ink.js';
import type { FeedConfig } from './Feed.js';

/**
 * Overage-credit grants come from the vendor billing API, which is stubbed to
 * null in this build (services/api/overageCreditGrant.ts). Nothing can qualify,
 * so every entry point below is inert; the exports stay because LogoV2,
 * CondensedLogo and the tip registry reference them.
 */
export function shouldShowOverageCreditUpsell(): boolean {
  return false;
}

export function useShowOverageCreditUpsell(): boolean {
  return false;
}

export function incrementOverageCreditUpsellSeenCount(): void {}

type Props = {
  maxWidth?: number;
  twoLine?: boolean;
};
export function OverageCreditUpsell(_props: Props): React.ReactNode {
  return null;
}

const FEED_SUBTITLE = 'On us. Works on third-party apps · /extra-usage';

/** Feed config for the homescreen rotating feed; unreachable in this build. */
export function createOverageCreditFeed(): FeedConfig {
  const title = 'extra usage credit';
  return {
    title,
    lines: [],
    customContent: {
      content: <Text dimColor>{FEED_SUBTITLE}</Text>,
      width: Math.max(title.length, FEED_SUBTITLE.length)
    }
  };
}
