/**
 * Chat-page message shape. Lives in localStorage between sessions
 * (via the parent page) and gets sent verbatim to `/api/chat` on
 * each turn. The message log is the single source of truth on the
 * client; the server is stateless.
 *
 * The Anthropic API's `MessageParam.content` is `string |
 * ContentBlockParam[]`. For the chat UI we always store strings —
 * the multi-block tool_use / tool_result content lives only inside
 * the API route's loop and never leaks to the client.
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallTrace[]
  /**
   * Visual cards the backend derived from tool results — stat
   * numbers, mini line charts, top-N lists. Render order matches
   * the order the backend appended them in (which mirrors the
   * order the agent called the tools in). Stored verbatim in
   * localStorage so historical messages keep their charts on
   * reload.
   */
  renderables?: Renderable[]
}

export interface ToolCallTrace {
  name: string
  input: Record<string, unknown>
  result?: unknown
  error?: string
  /**
   * Present when the tool came from one of the user's MCP servers
   * (Beehiiv, Notion, internal API, …). The backend tags the trace
   * so the frontend can render the chip with the connection's
   * display name instead of the internal namespaced name like
   * `mcp_0__list_posts`. Built-in tools (Stripe / PostHog / etc.)
   * omit this field.
   */
  mcp?: { connectionName: string; toolName: string }
}

/**
 * Renderable card emitted by the backend alongside the assistant's
 * text reply. Kept in sync with `backend/src/chat/renderables.ts`
 * — these are the same shapes the server produces.
 */
export type Renderable =
  | StatRenderable
  | ChartRenderable
  | TopListRenderable

export interface StatRenderable {
  kind: 'stat'
  label: string
  value: string
  sublabel?: string
}

export interface ChartRenderable {
  kind: 'chart'
  title: string
  sublabel?: string
  series: { label: string; value: number }[]
  unit?: 'currency' | 'count' | 'rate'
}

export interface TopListRenderable {
  kind: 'top_list'
  title: string
  sublabel?: string
  rows: { label: string; value: string }[]
}
