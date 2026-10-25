import * as React from 'react';

/**
 * Guest-pass referrals are a vendor-cloud feature. The eligibility and reward
 * lookups in services/api/referral.ts are stubbed to null in this build, so
 * the upsell can never qualify. These exports stay for the LogoV2 /
 * CondensedLogo call sites.
 */
export function useShowGuestPassesUpsell(): boolean {
  return false;
}

export function incrementGuestPassesSeenCount(): void {}

export function GuestPassesUpsell(): React.ReactNode {
  return null;
}
