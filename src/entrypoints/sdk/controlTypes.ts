/**
 * SDK Control Protocol types for SDK builders (bridge subpath consumers).
 * Types are z.infer over the Zod schemas in controlSchemas.ts.
 */

import type { z } from 'zod/v4'
import type * as CS from './controlSchemas.js'
import type * as Core from './coreSchemas.js'

export type SDKControlInitializeRequest = z.infer<
  ReturnType<typeof CS.SDKControlInitializeRequestSchema>
>
export type SDKControlInitializeResponse = z.infer<
  ReturnType<typeof CS.SDKControlInitializeResponseSchema>
>
export type SDKControlInterruptRequest = z.infer<
  ReturnType<typeof CS.SDKControlInterruptRequestSchema>
>
export type SDKControlPermissionRequest = z.infer<
  ReturnType<typeof CS.SDKControlPermissionRequestSchema>
>
export type SDKControlSetPermissionModeRequest = z.infer<
  ReturnType<typeof CS.SDKControlSetPermissionModeRequestSchema>
>
export type SDKControlSetModelRequest = z.infer<
  ReturnType<typeof CS.SDKControlSetModelRequestSchema>
>
export type SDKControlSetMaxThinkingTokensRequest = z.infer<
  ReturnType<typeof CS.SDKControlSetMaxThinkingTokensRequestSchema>
>
export type SDKControlMcpStatusRequest = z.infer<
  ReturnType<typeof CS.SDKControlMcpStatusRequestSchema>
>
export type SDKControlMcpStatusResponse = z.infer<
  ReturnType<typeof CS.SDKControlMcpStatusResponseSchema>
>
export type SDKControlGetContextUsageRequest = z.infer<
  ReturnType<typeof CS.SDKControlGetContextUsageRequestSchema>
>
export type SDKControlGetContextUsageResponse = z.infer<
  ReturnType<typeof CS.SDKControlGetContextUsageResponseSchema>
>
export type SDKControlRewindFilesRequest = z.infer<
  ReturnType<typeof CS.SDKControlRewindFilesRequestSchema>
>
export type SDKControlRewindFilesResponse = z.infer<
  ReturnType<typeof CS.SDKControlRewindFilesResponseSchema>
>
export type SDKControlCancelAsyncMessageRequest = z.infer<
  ReturnType<typeof CS.SDKControlCancelAsyncMessageRequestSchema>
>
export type SDKControlCancelAsyncMessageResponse = z.infer<
  ReturnType<typeof CS.SDKControlCancelAsyncMessageResponseSchema>
>
export type SDKControlSeedReadStateRequest = z.infer<
  ReturnType<typeof CS.SDKControlSeedReadStateRequestSchema>
>
export type SDKHookCallbackRequest = z.infer<
  ReturnType<typeof CS.SDKHookCallbackRequestSchema>
>
export type SDKControlMcpMessageRequest = z.infer<
  ReturnType<typeof CS.SDKControlMcpMessageRequestSchema>
>
export type SDKControlMcpSetServersRequest = z.infer<
  ReturnType<typeof CS.SDKControlMcpSetServersRequestSchema>
>
export type SDKControlMcpSetServersResponse = z.infer<
  ReturnType<typeof CS.SDKControlMcpSetServersResponseSchema>
>
export type SDKControlReloadPluginsRequest = z.infer<
  ReturnType<typeof CS.SDKControlReloadPluginsRequestSchema>
>
export type SDKControlReloadPluginsResponse = z.infer<
  ReturnType<typeof CS.SDKControlReloadPluginsResponseSchema>
>
export type SDKControlMcpReconnectRequest = z.infer<
  ReturnType<typeof CS.SDKControlMcpReconnectRequestSchema>
>
export type SDKControlMcpToggleRequest = z.infer<
  ReturnType<typeof CS.SDKControlMcpToggleRequestSchema>
>
export type SDKControlStopTaskRequest = z.infer<
  ReturnType<typeof CS.SDKControlStopTaskRequestSchema>
>
export type SDKControlApplyFlagSettingsRequest = z.infer<
  ReturnType<typeof CS.SDKControlApplyFlagSettingsRequestSchema>
>
export type SDKControlGetSettingsRequest = z.infer<
  ReturnType<typeof CS.SDKControlGetSettingsRequestSchema>
>
export type SDKControlGetSettingsResponse = z.infer<
  ReturnType<typeof CS.SDKControlGetSettingsResponseSchema>
>
export type SDKControlElicitationRequest = z.infer<
  ReturnType<typeof CS.SDKControlElicitationRequestSchema>
>
export type SDKControlElicitationResponse = z.infer<
  ReturnType<typeof CS.SDKControlElicitationResponseSchema>
>
export type SDKControlRequestInner = z.infer<
  ReturnType<typeof CS.SDKControlRequestInnerSchema>
>
export type SDKControlRequest = z.infer<
  ReturnType<typeof CS.SDKControlRequestSchema>
>
export type ControlResponse = z.infer<
  ReturnType<typeof CS.ControlResponseSchema>
>
export type ControlErrorResponse = z.infer<
  ReturnType<typeof CS.ControlErrorResponseSchema>
>
export type SDKControlResponse = z.infer<
  ReturnType<typeof CS.SDKControlResponseSchema>
>
export type SDKControlCancelRequest = z.infer<
  ReturnType<typeof CS.SDKControlCancelRequestSchema>
>
export type SDKKeepAliveMessage = z.infer<
  ReturnType<typeof CS.SDKKeepAliveMessageSchema>
>
export type SDKUpdateEnvironmentVariablesMessage = z.infer<
  ReturnType<typeof CS.SDKUpdateEnvironmentVariablesMessageSchema>
>
export type StdoutMessage = z.infer<
  ReturnType<typeof CS.StdoutMessageSchema>
>
export type StdinMessage = z.infer<
  ReturnType<typeof CS.StdinMessageSchema>
>
export type SDKPartialAssistantMessage = z.infer<
  ReturnType<typeof Core.SDKPartialAssistantMessageSchema>
>
