/**
 * Tool progress payload types, centralized here to break import cycles
 * (tools -> Tool.ts -> progress types would otherwise be circular).
 *
 * Type-only module: erased at build time, must not contain runtime code.
 */

import type {
  NormalizedAssistantMessage,
  NormalizedUserMessage,
} from './message.js'

export interface BashProgress {
  type: 'bash_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes: number
  taskId?: string
  timeoutMs?: number
}

export interface PowerShellProgress {
  type: 'powershell_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes: number
  timeoutMs?: number
  taskId?: string
}

export interface ShellProgress {
  type: 'bash_progress' | 'powershell_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes?: number
  taskId?: string
  timeoutMs?: number
}

export interface AgentToolProgress {
  type: 'agent_progress'
  message: NormalizedUserMessage | NormalizedAssistantMessage
  prompt: string
  agentId: string
}

export interface SkillToolProgress {
  type: 'skill_progress'
  message: NormalizedUserMessage | NormalizedAssistantMessage
  prompt: string
  agentId?: string
}

export interface MCPProgress {
  type: 'mcp_progress'
  status: 'started' | 'completed' | 'progress' | 'failed'
  serverName: string
  toolName: string
  elapsedTimeMs?: number
  /** SDK onprogress payload, present when status === 'progress'. */
  progress?: number
  total?: number
  progressMessage?: string
}

export type WebSearchProgress =
  | { type: 'web_search'; query: string; [key: string]: unknown }
  | { type: 'query_update'; query: string }
  | { type: 'search_results_received'; query: string; resultCount: number }

export interface TaskOutputProgress {
  type: 'waiting_for_task'
  taskDescription?: string
  taskType?: string
}

export interface REPLToolProgress {
  type: 'repl_progress'
  [key: string]: unknown
}

/** SDK workflow-progress delta passthrough (upserted by `${type}:${index}`). */
export interface SdkWorkflowProgress {
  type: string
  index: number
  phaseIndex?: number
  [key: string]: unknown
}

export type ToolProgressData =
  | AgentToolProgress
  | BashProgress
  | MCPProgress
  | PowerShellProgress
  | REPLToolProgress
  | SdkWorkflowProgress
  | ShellProgress
  | SkillToolProgress
  | TaskOutputProgress
  | WebSearchProgress
