/**
 * Local workflow task state (workflow feature, currently disabled).
 * Type-only module retained for tasks/types.ts.
 */

import type { TaskStateBase } from '../../Task.js'

export type LocalWorkflowTaskState = TaskStateBase & {
  type: 'local_workflow'
  workflowName?: string
  summary?: string
}
