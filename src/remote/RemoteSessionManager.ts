/**
 * Remote session types (remote-control feature, currently disabled).
 * Type-only module retained for live files that reference the shapes.
 */

export type RemoteSessionConfig = {
  sessionId: string
  hasInitialPrompt?: boolean
  [key: string]: unknown
}

export type RemotePermissionResponse = {
  behavior: 'allow' | 'deny'
  updatedInput?: Record<string, unknown>
  message?: string
}
