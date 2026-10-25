/**
 * Skill discovery signal types. Type-only module.
 */

export type DiscoverySignal =
  | 'tool_reference'
  | 'skill_listing'
  | 'command'
  | (string & {})
