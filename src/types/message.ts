/**
 * Core transcript message types.
 *
 * This module is the single source of truth for the message family persisted
 * to session transcripts and rendered by the UI. It is type-only: imports of
 * this module are erased at build time, so it must not contain runtime code.
 *
 * Shape notes:
 * - Transcripts persisted by `utils/sessionStorage.ts` enrich messages with
 *   chain metadata (parentUuid/isSidechain/cwd/sessionId/version/gitBranch).
 *   Constructors in `utils/messages.ts` do not set them, so they are optional
 *   here to satisfy both construction and consumption sites.
 */

import type { UUID } from 'crypto'
import type { APIError } from '@anthropic-ai/sdk'
import type {
  BetaContentBlock,
  BetaMessage,
  BetaRawMessageStreamEvent,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { SDKAssistantMessageError } from 'src/entrypoints/agentSdkTypes.js'
import type { Attachment } from '../utils/attachments.js'

// ============================================================================
// Shared
// ============================================================================

export type SystemMessageLevel =
  | 'info'
  | 'warning'
  | 'error'
  | 'debug'
  | 'suggestion'

/** Provenance of a user message. undefined = typed by the human on the keyboard. */
export type MessageOrigin =
  | { kind: 'human' }
  | { kind: 'task-notification' }
  | { kind: 'coordinator' }
  | { kind: 'channel'; server: string }

export type PartialCompactDirection = 'from' | 'to' | 'up_to'

export type CompactMetadata = {
  trigger: 'manual' | 'auto'
  preTokens: number
  userContext?: string
  messagesSummarized?: number
  /** Relink metadata for messages preserved across a compact boundary. */
  preservedSegment?: {
    headUuid: UUID
    anchorUuid: UUID
    tailUuid: UUID
  }
  /** Deferred tool names loaded pre-compact, so post-compact requests keep them. */
  preCompactDiscoveredTools?: string[]
}

export type StopHookInfo = {
  command: string
  promptText?: string
  durationMs?: number
}

interface ChainMeta {
  parentUuid?: UUID | null
  isSidechain?: boolean
  userType?: 'external' | 'internal'
  cwd?: string
  sessionId?: string
  version?: string
  gitBranch?: string | undefined
  /** Logical parent used to link compact boundaries across the physical chain. */
  logicalParentUuid?: UUID
  isMeta?: boolean
  origin?: MessageOrigin
}

// ============================================================================
// User / Assistant
// ============================================================================

export interface UserMessage extends ChainMeta {
  type: 'user'
  uuid: UUID
  timestamp: string
  message: {
    role: 'user'
    content: string | ContentBlockParam[]
  }
  isVisibleInTranscriptOnly?: boolean
  isVirtual?: true
  isCompactSummary?: true
  /** Summary provenance, set on the compact-summary message. */
  summarizeMetadata?: {
    messagesSummarized: number
    userContext?: string
    direction?: PartialCompactDirection
  }
  /** Opaque tool output attached to tool_result messages. */
  toolUseResult?: unknown
  /** MCP protocol metadata passed through to SDK consumers (never sent to model). */
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
  imagePasteIds?: number[]
  /** For tool_result messages: UUID of the assistant message holding the tool_use. */
  sourceToolAssistantUUID?: UUID
  /** Tool-use ID for tool_result messages (name used by older call sites). */
  sourceToolUseID?: string
  /** Permission mode when the message was sent (for rewind restoration). */
  permissionMode?: import('./permissions.js').PermissionMode
  /** Plan-mode messages carry the plan text for display and verification. */
  planContent?: string
}

export interface AssistantMessage extends ChainMeta {
  type: 'assistant'
  uuid: UUID
  timestamp: string
  message: BetaMessage
  requestId?: string
  duration?: {
    apiDuration?: number
    totalApiDuration?: number
  }
  costUSD?: number
  isVirtual?: true
  isApiErrorMessage?: boolean
  apiError?: string
  error?: SDKAssistantMessageError
  errorDetails?: string
  advisorModel?: string
  /** Ant-internal research metadata; not set in this build. */
  research?: unknown
}

export interface NormalizedUserMessage extends UserMessage {
  message: {
    role: 'user'
    content: ContentBlockParam[]
  }
}

export interface NormalizedAssistantMessage<
  B extends BetaContentBlock = BetaContentBlock,
> extends AssistantMessage {
  message: Omit<BetaMessage, 'content'> & { content: B[] }
}

// ============================================================================
// Progress / events
// ============================================================================

/**
 * Progress update emitted by a running tool. `data` carries the tool-specific
 * progress payload (see `types/tools.ts` and `HookProgress` in Tool.ts).
 */
export interface ProgressMessage<P = any> extends ChainMeta {
  type: 'progress'
  uuid: UUID
  timestamp: string
  toolUseID: string
  parentToolUseID: string
  data: P
}

/** Raw Anthropic SSE part forwarded through the query loop. */
export interface StreamEvent {
  type: 'stream_event'
  event: BetaRawMessageStreamEvent
  ttftMs?: number
}

export interface RequestStartEvent {
  type: 'stream_request_start'
}

// ============================================================================
// Attachments
// ============================================================================

export interface AttachmentMessage<A extends Attachment = Attachment>
  extends ChainMeta {
  type: 'attachment'
  uuid: UUID
  timestamp: string
  attachment: A
}

/** Message yielded from hook execution (always an attachment today). */
export type HookResultMessage = AttachmentMessage

/** Either an attachment or a progress message emitted while hooks run. */
export type HookOutputMessage = AttachmentMessage | ProgressMessage

// ============================================================================
// System messages
// ============================================================================

interface SystemMeta extends ChainMeta {
  type: 'system'
  uuid: UUID
  timestamp: string
  content?: string
  level?: SystemMessageLevel
  toolUseID?: string
}

export interface SystemInformationalMessage extends SystemMeta {
  subtype: 'informational'
  content: string
  level: SystemMessageLevel
  preventContinuation?: boolean
}

export interface SystemLocalCommandMessage extends SystemMeta {
  subtype: 'local_command'
  content: string
  level: SystemMessageLevel
}

export interface SystemThinkingMessage extends SystemMeta {
  subtype: 'thinking'
}

export interface SystemPermissionRetryMessage extends SystemMeta {
  subtype: 'permission_retry'
  content: string
  commands: string[]
  level: SystemMessageLevel
}

export interface SystemBridgeStatusMessage extends SystemMeta {
  subtype: 'bridge_status'
  content: string
  url: string
  upgradeNudge?: string
}

export interface SystemScheduledTaskFireMessage extends SystemMeta {
  subtype: 'scheduled_task_fire'
  content: string
}

export interface SystemStopHookSummaryMessage extends SystemMeta {
  subtype: 'stop_hook_summary'
  hookCount: number
  hookInfos: StopHookInfo[]
  hookErrors: string[]
  preventedContinuation: boolean
  stopReason: string | undefined
  hasOutput: boolean
  level: SystemMessageLevel
  hookLabel?: string
  totalDurationMs?: number
}

export interface SystemTurnDurationMessage extends SystemMeta {
  subtype: 'turn_duration'
  durationMs: number
  budgetTokens?: number
  budgetLimit?: number
  budgetNudges?: number
  messageCount?: number
}

export interface SystemAwaySummaryMessage extends SystemMeta {
  subtype: 'away_summary'
  content: string
}

export interface SystemMemorySavedMessage extends SystemMeta {
  subtype: 'memory_saved'
  writtenPaths: string[]
  /** How many of `writtenPaths` are team-memory files; absent for pre-team-memory transcripts. */
  teamCount?: number
  /** Display verb; defaults to "Saved". */
  verb?: string
}

export interface SystemAgentsKilledMessage extends SystemMeta {
  subtype: 'agents_killed'
}

export interface SystemApiMetricsMessage extends SystemMeta {
  subtype: 'api_metrics'
  ttftMs: number
  otps: number
  isP50?: boolean
  hookDurationMs?: number
  turnDurationMs?: number
  toolDurationMs?: number
  classifierDurationMs?: number
  toolCount?: number
  hookCount?: number
  classifierCount?: number
  configWriteCount?: number
}

export interface SystemCompactBoundaryMessage extends SystemMeta {
  subtype: 'compact_boundary'
  content: string
  level: SystemMessageLevel
  compactMetadata: CompactMetadata
}

export interface SystemMicrocompactBoundaryMessage extends SystemMeta {
  subtype: 'microcompact_boundary'
  content: string
  level: SystemMessageLevel
  microcompactMetadata: {
    trigger: 'auto'
    preTokens: number
    tokensSaved: number
    compactedToolIds: string[]
    clearedAttachmentUUIDs: string[]
  }
}

export interface SystemAPIErrorMessage extends SystemMeta {
  subtype: 'api_error'
  level: 'error'
  error: APIError
  cause?: Error
  retryInMs: number
  retryAttempt: number
  maxRetries: number
}

export interface SystemFileSnapshotMessage extends SystemMeta {
  subtype: 'file_snapshot'
  content: string
  level: SystemMessageLevel
  isMeta: boolean
  snapshotFiles: Array<{ key: string; path: string; content: string }>
}

export type SystemMessage =
  | SystemInformationalMessage
  | SystemLocalCommandMessage
  | SystemThinkingMessage
  | SystemPermissionRetryMessage
  | SystemBridgeStatusMessage
  | SystemScheduledTaskFireMessage
  | SystemStopHookSummaryMessage
  | SystemTurnDurationMessage
  | SystemAwaySummaryMessage
  | SystemMemorySavedMessage
  | SystemAgentsKilledMessage
  | SystemApiMetricsMessage
  | SystemCompactBoundaryMessage
  | SystemMicrocompactBoundaryMessage
  | SystemAPIErrorMessage
  | SystemFileSnapshotMessage

// ============================================================================
// Tool use summary / tombstones
// ============================================================================

/** SDK-facing summary of a completed tool batch. */
export interface ToolUseSummaryMessage {
  type: 'tool_use_summary'
  uuid: UUID
  timestamp: string
  summary: string
  precedingToolUseIds: string[]
}

/** Marks messages removed from the UI and transcript (e.g. orphaned streaming fallbacks). */
export interface TombstoneMessage {
  type: 'tombstone'
  message: AssistantMessage
}

// ============================================================================
// UI grouping (render-only, never persisted)
// ============================================================================

export interface GroupedToolUseMessage {
  type: 'grouped_tool_use'
  toolName: string
  messages: NormalizedAssistantMessage[]
  results: NormalizedUserMessage[]
  displayMessage: NormalizedAssistantMessage
  uuid: string
  timestamp: string
  messageId?: string
}

export interface CollapsedReadSearchGroup {
  type: 'collapsed_read_search'
  searchCount: number
  readCount: number
  listCount: number
  replCount: number
  memorySearchCount: number
  memoryReadCount: number
  memoryWriteCount: number
  teamMemorySearchCount?: number
  teamMemoryReadCount?: number
  teamMemoryWriteCount?: number
  readFilePaths: string[]
  searchArgs?: string[]
  latestDisplayHint?: string
  messages: Array<
    NormalizedAssistantMessage | NormalizedUserMessage | GroupedToolUseMessage
  >
  displayMessage:
    | NormalizedAssistantMessage
    | NormalizedUserMessage
    | GroupedToolUseMessage
  uuid: string
  timestamp: string
  mcpCallCount?: number
  mcpServerNames?: string[]
  bashCount?: number
  gitOpBashCount?: number
  commits?: Array<{
    kind: 'committed' | 'amended' | 'cherry-picked'
    sha: string
  }>
  pushes?: Array<{ branch: string }>
  branches?: Array<{
    action: 'merged' | 'rebased'
    ref: string
  }>
  prs?: Array<{
    action: 'created' | 'edited' | 'merged' | 'commented' | 'closed' | 'ready'
    number: number
    url?: string
  }>
  hookTotalMs?: number
  hookCount?: number
  hookInfos?: StopHookInfo[]
  relevantMemories?: Array<{
    path: string
    content: string
    mtimeMs?: number
  }>
}

/** Messages eligible for read/search collapse grouping. */
export type CollapsibleMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | GroupedToolUseMessage

// ============================================================================
// Unions
// ============================================================================

/** Full transcript message. */
export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage

/** Transcript messages after block-splitting (`normalizeMessages`). */
export type NormalizedMessage =
  | NormalizedUserMessage
  | NormalizedAssistantMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage

/** Flattened list the UI renders (normalized messages plus render groups). */
export type RenderableMessage =
  | NormalizedMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup
