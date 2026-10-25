/**
 * Query loop state-machine transitions. Type-only module.
 */

/** Reason the loop runs another iteration instead of terminating. */
export type Continue =
  | { reason: 'collapse_drain_retry'; committed: unknown }
  | { reason: 'reactive_compact_retry' }
  | { reason: 'max_output_tokens_escalate' }
  | { reason: 'max_output_tokens_recovery'; attempt: number }
  | { reason: 'stop_hook_blocking' }
  | { reason: 'token_budget_continuation' }
  | { reason: 'continuation_nudge' }
  | { reason: 'next_turn' }

/** Terminal result of the query loop. */
export type Terminal =
  | { reason: 'blocking_limit' }
  | { reason: 'image_error' }
  | { reason: 'model_error'; error: unknown }
  | { reason: 'aborted_streaming' }
  | { reason: 'aborted_tools' }
  | { reason: 'prompt_too_long' }
  | { reason: 'stop_hook_prevented' }
  | { reason: 'hook_stopped' }
  | { reason: 'max_turns'; turnCount?: number }
  | { reason: 'completed' }
