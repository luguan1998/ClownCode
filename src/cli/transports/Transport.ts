/**
 * Transport interface for headless/stream-json IO (WebSocket, SSE, hybrid).
 */

import type { StdoutMessage } from '../../entrypoints/sdk/controlTypes.js'
import type { StreamClientEvent } from './SSETransport.js'

export interface Transport {
  connect(): Promise<void>
  write(message: StdoutMessage): Promise<void>
  setOnData(callback: (data: string) => void): void
  setOnClose(callback: (closeCode?: number) => void): void
  /** SSE/hybrid transports surface parsed client events; WS does not. */
  setOnEvent?(callback: (event: StreamClientEvent) => void): void
  close(): void
}
