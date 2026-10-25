/**
 * Bridge (remote-control) permission callback contract. The bridge feature
 * is disabled in this build; the type is retained for AppStateStore.
 */

import type { PermissionUpdate } from '../utils/permissions/PermissionUpdateSchema.js'

export type BridgePermissionResponse = {
  behavior: 'allow' | 'deny'
  updatedInput?: Record<string, unknown>
  updatedPermissions?: PermissionUpdate[]
  message?: string
}

export type BridgePermissionCallbacks = {
  /** Forward a pending permission request to the remote side. */
  sendRequest(
    requestId: string,
    toolName: string,
    input: Record<string, unknown>,
    toolUseID: string,
    description: string,
    suggestions: PermissionUpdate[],
    blockedPath: string | undefined,
  ): void
  /** Report the local decision back to the remote side. */
  sendResponse(requestId: string, response: BridgePermissionResponse): void
  /** Drop a request that is no longer pending. */
  cancelRequest(requestId: string): void
  /** Subscribe to remote-side outcomes; returns an unsubscribe function. */
  onResponse(
    requestId: string,
    handler: (response: BridgePermissionResponse) => void,
  ): () => void
}
