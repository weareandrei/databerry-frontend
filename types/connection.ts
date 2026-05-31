export type ConnectionType =
  | 'posthog'
  | 'stripe'
  | 'stripe_manual'
  | 'calendly'
  | 'google_analytics'
  | 'vercel'
  | 'x'
  | 'reddit'
  | 'gmail'
  | 'sentry'
  | 'github'
  | 'webhook'
  | 'custom'
  // Model Context Protocol — generic remote MCP server. Server URL +
  // auth (none / bearer / custom header) live in `connections_mcp`.
  // Used by Ask AI to call tools the user's MCP servers expose.
  | 'mcp'

export interface Connection {
  id: string
  name: string
  type: ConnectionType
  userId: string
  projectId?: string | null
  createdAt: string
  webhookId?: string | null
  gaPropertyId?: string | null
  gaPropertyName?: string | null
  vercelProjectName?: string | null
  /** Set when `type === 'mcp'` — the MCP server endpoint. Shown on
   *  the row in the MCP connections section so the user can identify
   *  which server it points at. Credentials are NOT round-tripped. */
  mcpServerUrl?: string | null
  /** Set when `type === 'mcp'` — `'none' | 'bearer' | 'custom_header'`. */
  mcpAuthType?: string | null
}
