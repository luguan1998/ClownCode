/**
 * SDK utility types that cannot be expressed as Zod schemas.
 */

import type { BetaUsage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

/**
 * Anthropic API usage object with all nullable fields made non-nullable.
 * Runtime code always populates every field (see EMPTY_USAGE), so the SDK
 * surface exposes the non-optional shape.
 */
export type NonNullableUsage = {
  [K in keyof BetaUsage]: NonNullable<BetaUsage[K]>
}
