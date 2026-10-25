/**
 * Overage credit grant API — permanent no-op.
 *
 * Cloud-subscription accounting; unreachable in this intranet build. The
 * cached grant never exists, so the overage upsell UI never renders.
 */

export function getCachedOverageCreditGrant(): null {
  return null
}

export function refreshOverageCreditGrantCache(): Promise<null> {
  return Promise.resolve(null)
}

export function formatGrantAmount(_amount: number): string {
  return ''
}
