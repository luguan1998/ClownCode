// Non-serializable SDK runtime types (callbacks, interfaces with methods).
// Stubbed down to what the public type surface needs.

import type { SDKMessage } from './coreTypes.js'

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

// Zod-like raw shape describing an MCP tool's input schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyZodRawShape = Record<string, any>
export type InferShape<_Schema extends AnyZodRawShape> = unknown

export type SdkMcpToolDefinition<
  Schema extends AnyZodRawShape = AnyZodRawShape,
> = {
  name: string
  description: string
  inputSchema: Schema
}

export type McpSdkServerConfigWithInstance = {
  type: 'sdk'
  name: string
  instance: unknown
}

export type Options = Record<string, unknown>
export type InternalOptions = Options

export type Query = AsyncGenerator<SDKMessage, void>
export type InternalQuery = Query

export type SDKSessionOptions = { model?: string } & Record<string, unknown>

export type SDKSession = {
  send(prompt: string): Promise<void>
  close(): Promise<void>
}

export type SessionMessage = SDKMessage

export type ListSessionsOptions = {
  dir?: string
  limit?: number
  offset?: number
}

export type GetSessionInfoOptions = { dir?: string }

export type GetSessionMessagesOptions = GetSessionInfoOptions & {
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export type SessionMutationOptions = { dir?: string }

export type ForkSessionOptions = SessionMutationOptions & {
  upToMessageId?: string
  title?: string
}

export type ForkSessionResult = { sessionId: string }
