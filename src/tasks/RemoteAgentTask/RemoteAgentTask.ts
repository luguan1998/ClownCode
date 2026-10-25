/**
 * Remote agent task state (remote-agents feature, currently disabled).
 * Type-only module retained for tasks/types.ts and TaskOutputTool.
 */

import type { TaskStateBase } from '../../Task.js'

/**
 * Progress shape the review pill renders. Emitted by the remote review
 * service, which this build does not talk to — the field is only ever read.
 */
export type RemoteReviewProgress = {
  stage?: 'finding' | 'verifying' | 'synthesizing'
  bugsFound?: number
  bugsVerified?: number
  bugsRefuted?: number
}

export type RemoteAgentTaskState = TaskStateBase & {
  type: 'remote_agent'
  title: string
  /** Prompt the remote session was dispatched with. */
  command?: string
  isUltraplan?: boolean
  ultraplanPhase?: 'planning' | 'plan_ready' | 'needs_input'
  isRemoteReview?: boolean
  reviewProgress?: RemoteReviewProgress
  sessionId?: string
}
