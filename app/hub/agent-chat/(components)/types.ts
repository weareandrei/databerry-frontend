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
}

export interface ToolCallTrace {
  name: string
  input: Record<string, unknown>
  result?: unknown
  error?: string
}
