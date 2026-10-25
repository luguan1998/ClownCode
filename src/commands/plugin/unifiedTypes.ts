/**
 * Unified installed-items model for the /plugin manage view: one list mixing
 * plugins, standalone MCP servers, and failed plugins.
 */

import type { MCPServerConnection } from '../../services/mcp/types.js'
import type { LoadedPlugin, PluginError } from '../../types/plugin.js'
import type { PersistablePluginScope } from '../../utils/plugins/pluginIdentifier.js'

export type UnifiedInstalledScope =
  | 'user'
  | 'project'
  | 'local'
  | 'managed'
  | 'builtin'
  | 'flagged'
  | 'dynamic'
  | 'enterprise'
  | 'claudeai'

/**
 * Scopes a loaded plugin can have. flagged entries are a separate item type,
 * and dynamic/enterprise/claudeai only occur on MCP server entries.
 */
type LoadedPluginScope = Exclude<
  UnifiedInstalledScope,
  'flagged' | 'dynamic' | 'enterprise' | 'claudeai'
>

export type UnifiedInstalledItem =
  | {
      type: 'plugin'
      id: string
      name: string
      description: string | undefined
      marketplace: string
      scope: LoadedPluginScope
      isEnabled: boolean | undefined
      errorCount: number
      errors: PluginError[]
      plugin: LoadedPlugin
      pendingEnable: unknown
      pendingUpdate: unknown
      pendingToggle: unknown
    }
  | {
      type: 'mcp'
      id: string
      name: string
      description: string | undefined
      scope: UnifiedInstalledScope
      status:
        | 'connected'
        | 'disabled'
        | 'pending'
        | 'needs-auth'
        | 'failed'
      client: MCPServerConnection
      /** Child MCP of a plugin — render indented under its parent. */
      indented?: boolean
    }
  | {
      type: 'failed-plugin'
      id: string
      name: string
      marketplace: string
      scope: PersistablePluginScope
      errorCount: number
      errors: PluginError[]
    }
  | {
      type: 'flagged-plugin'
      id: string
      name: string
      marketplace: string
      scope: 'flagged'
      reason: 'delisted' | 'security' | (string & {})
      text: string
      flaggedAt: string
      errorCount?: number
      errors?: PluginError[]
    }
