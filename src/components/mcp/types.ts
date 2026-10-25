/**
 * View-layer types for the /mcp settings UI. Transport/config types come
 * from the single source of truth in services/mcp/types.ts.
 */

import type {
  ConfigScope,
  McpClaudeAIProxyServerConfig,
  McpHTTPServerConfig,
  McpSSEServerConfig,
  MCPServerConnection,
  McpStdioServerConfig,
} from '../../services/mcp/types.js'

interface ServerInfoBase {
  name: string
  client: MCPServerConnection
  scope: ConfigScope
}

export interface StdioServerInfo extends ServerInfoBase {
  transport: 'stdio'
  config: McpStdioServerConfig
}

export interface SSEServerInfo extends ServerInfoBase {
  transport: 'sse'
  isAuthenticated: boolean | undefined
  config: McpSSEServerConfig
}

export interface HTTPServerInfo extends ServerInfoBase {
  transport: 'http'
  isAuthenticated: boolean | undefined
  config: McpHTTPServerConfig
}

export interface ClaudeAIServerInfo extends ServerInfoBase {
  transport: 'claudeai-proxy'
  isAuthenticated: boolean | undefined
  config: McpClaudeAIProxyServerConfig
}

export type ServerInfo =
  | StdioServerInfo
  | SSEServerInfo
  | HTTPServerInfo
  | ClaudeAIServerInfo

/** MCP server defined inline by an agent (from agent .md frontmatter mcpServers). */
export interface AgentMcpServerInfo {
  name: string
  sourceAgents: string[]
  transport: 'stdio' | 'sse' | 'http' | 'ws'
  command?: string
  url?: string
  needsAuth: boolean
}

/** Navigation state of the /mcp settings screen. */
export type MCPViewState =
  | { type: 'list'; defaultTab?: string }
  | { type: 'server-menu'; server: ServerInfo }
  | { type: 'server-tools'; server: ServerInfo }
  | { type: 'server-tool-detail'; server: ServerInfo; toolIndex: number }
  | { type: 'agent-server-menu'; agentServer: AgentMcpServerInfo }
