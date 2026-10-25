/**
 * LSP server types. The config shape is z.infer over the plugin schema
 * in utils/plugins/schemas.ts (single source of truth).
 */

import type { z } from 'zod/v4'
import type { LspServerConfigSchema } from '../../utils/plugins/schemas.js'
import type { ConfigScope } from '../mcp/types.js'

export type LspServerConfig = z.infer<ReturnType<typeof LspServerConfigSchema>>

export type ScopedLspServerConfig = LspServerConfig & {
  /** Where the server was configured from (settings source or plugin). */
  scope: ConfigScope
}

export type LspServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'
