'use client'

/**
 * Per-message bubble. Two variants:
 *
 *  - `role === 'user'`     — right-aligned, brand-coloured pill.
 *  - `role === 'assistant'` — left-aligned plain text with markdown
 *                             rendering. Tool calls (if any) appear
 *                             below as a row of connection chips
 *                             (icon + name) — one chip per distinct
 *                             connection the assistant touched. Click
 *                             a chip to expand and see the params
 *                             that were passed.
 *
 * The markdown component map is deliberately small — no GFM, no
 * syntax highlighter, no math. We're optimising for the actual
 * shapes the assistant emits: bold totals, lists, inline code, and
 * the occasional link.
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Cpu, Warning } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import type { ConnectionType } from '@/types/connection'
import type { ChatMessage as Msg, ToolCallTrace } from './types'
import { Renderables } from './Renderables'

const MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="font-mono text-xs px-1 py-0.5 bg-black/[0.04] rounded text-grey-darkest">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="font-mono text-xs p-3 bg-black/[0.04] rounded overflow-x-auto my-2">
      {children}
    </pre>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-grey-darkest">{children}</strong>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-brand underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-grey-darkest mt-3 mb-1">{children}</h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-grey-darkest mt-3 mb-1">{children}</h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold text-grey-darkest mt-2 mb-1">{children}</h4>
  ),
}

export function ChatMessage({ message }: { message: Msg }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  // ── Error variant ─────────────────────────────────────────────
  // Backend reported a failure (Gemini outage, missing API key,
  // network timeout). We render a red bubble + warning icon so
  // the user can't mistake it for the agent's normal output. No
  // tool-trace row, no renderables — error frames carry only the
  // text. Content goes through markdown still so any inline `code`
  // (e.g. an error code) renders sensibly.
  if (message.isError) {
    return (
      <div className="flex justify-start">
        <div
          className="max-w-[85%] flex items-start gap-2 bg-red-50 border border-red-200 text-red-900 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm leading-relaxed"
          role="alert"
          aria-live="polite"
        >
          <Warning
            size={16}
            weight="fill"
            className="shrink-0 mt-0.5 text-red-500"
          />
          <div className="min-w-0">
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>
              {message.content || 'Something went wrong.'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  // Assistant messages stack three things vertically:
  //   1. Text bubble (capped at 85% to leave room for breathing).
  //   2. Tool-trace chip row (Used N tools).
  //   3. Renderable cards (charts, stats, top lists).
  //
  // The renderables column is WIDER than the bubble (`max-w-[640px]`)
  // — small numbers/lists still feel inline, but the line chart gets
  // enough horizontal room to actually read. Pinned to the left edge
  // so it visually anchors to the same side as the bubble.
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="max-w-[85%] text-sm text-grey-darkest space-y-2">
        {/* Assistant bubble — soft grey so it reads as the
            counterweight to the user's brand-orange pill, with a
            slightly more pronounced rounded shape on the bottom-left
            (mirror of the user bubble's top-right). */}
        <div className="bg-main border border-stroke rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>
            {message.content || '(no response)'}
          </ReactMarkdown>
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallsRow calls={message.toolCalls} />
        )}
      </div>
      {message.renderables && message.renderables.length > 0 && (
        <div className="w-full max-w-[640px]">
          <Renderables items={message.renderables} />
        </div>
      )}
    </div>
  )
}

// ── Tool calls ─────────────────────────────────────────────────────

/**
 * Map a tool name string to one of our known connection types so the
 * `<ConnectionIcon>` can render the right brand mark. We don't have a
 * structured `connectionType` field on `ToolCallTrace` today (the
 * backend just hands us the tool name), so this is a best-effort
 * substring match. New connection types added in the future get a new
 * branch here.
 *
 * Returns `null` when no built-in connection matches — caller renders
 * the generic MCP `<Cpu>` icon and the raw tool name (or "MCP server"
 * label) in that case. Same fallback we'd hit for any tool exposed by
 * a user's MCP server, since we don't know the MCP's display name
 * from the tool string alone.
 */
function detectConnectionType(toolName: string): ConnectionType | null {
  const lower = toolName.toLowerCase()
  if (lower.includes('stripe')) return 'stripe'
  if (lower.includes('posthog')) return 'posthog'
  if (
    lower.includes('google_analytics') ||
    lower.includes('ga4') ||
    lower.startsWith('ga_')
  )
    return 'google_analytics'
  if (lower.includes('calendly')) return 'calendly'
  if (lower.includes('vercel')) return 'vercel'
  if (lower.includes('sentry')) return 'sentry'
  if (lower.includes('github')) return 'github'
  if (lower.includes('gmail')) return 'gmail'
  if (lower.includes('reddit')) return 'reddit'
  return null
}

/** Capitalise + de-snakeify a known connection type for display. */
function displayName(type: ConnectionType): string {
  switch (type) {
    case 'google_analytics':
      return 'Google Analytics'
    case 'stripe_manual':
      return 'Stripe'
    default:
      // 'posthog' → 'Posthog', 'github' → 'Github', etc.
      return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

/**
 * Group the turn's tool calls by detected connection type. Duplicates
 * collapse — if the assistant called three Stripe tools in one turn,
 * we render one "Stripe" chip with all three call entries grouped
 * under it (visible on expand).
 *
 * MCP-sourced calls (those with `call.mcp` set by the backend) group
 * by `mcp.connectionName` so multiple calls into the same MCP server
 * collapse into one chip — same UX as the built-in groupings.
 *
 * Built-in calls without a detectable type fall back to one chip
 * per distinct tool name — we can't safely collapse those without
 * losing information about WHICH built-in tool was used.
 */
type GroupKind =
  | { kind: 'connection'; type: ConnectionType }
  | { kind: 'mcp'; connectionName: string }
  | { kind: 'unknown' }

function groupToolCalls(
  calls: ToolCallTrace[],
): { key: string; kind: GroupKind; label: string; entries: ToolCallTrace[] }[] {
  const groups: Record<
    string,
    { kind: GroupKind; label: string; entries: ToolCallTrace[] }
  > = {}
  const order: string[] = []
  for (const call of calls) {
    let key: string
    let label: string
    let kind: GroupKind
    if (call.mcp) {
      key = `mcp:${call.mcp.connectionName}`
      label = call.mcp.connectionName
      kind = { kind: 'mcp', connectionName: call.mcp.connectionName }
    } else {
      const type = detectConnectionType(call.name)
      if (type) {
        key = `type:${type}`
        label = displayName(type)
        kind = { kind: 'connection', type }
      } else {
        // Each unknown tool keeps its own chip so the user can see
        // which built-in tool actually ran (no useful grouping when
        // we can't categorise).
        key = `unknown:${call.name}`
        label = call.name
        kind = { kind: 'unknown' }
      }
    }
    if (!groups[key]) {
      groups[key] = { kind, label, entries: [] }
      order.push(key)
    }
    groups[key]!.entries.push(call)
  }
  return order.map(k => ({ key: k, ...groups[k]! }))
}

function ToolCallsRow({ calls }: { calls: ToolCallTrace[] }) {
  const groups = groupToolCalls(calls)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="flex items-center flex-wrap gap-2 pl-1">
      <span className="text-[11px] text-grey-light shrink-0">
        Used {calls.length} {calls.length === 1 ? 'tool' : 'tools'}:
      </span>
      {groups.map(g => {
        const isOpen = expanded === g.key
        return (
          <div key={g.key} className="relative">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : g.key)}
              aria-expanded={isOpen}
              className={`inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2 py-1 text-[11px] font-medium text-grey-darkest shadow-sm hover:bg-hover-fill transition-colors ${
                isOpen ? 'ring-1 ring-brand/30' : ''
              }`}
            >
              {/* MCP groups use the generic Cpu mark — we don't have
                  per-server icons. Built-in connection groups use the
                  shared `<ConnectionIcon>` so the chip carries the
                  brand mark the user already associates with that
                  source. Unknown built-ins fall back to Cpu. */}
              {g.kind.kind === 'connection' ? (
                <ConnectionIcon type={g.kind.type} size={12} />
              ) : (
                <Cpu size={12} weight="bold" className="text-grey-dark" />
              )}
              <span className="truncate max-w-[160px]">{g.label}</span>
              {g.entries.length > 1 && (
                <span className="text-grey-light tabular-nums">
                  ×{g.entries.length}
                </span>
              )}
            </button>

            {isOpen && (
              // Expanded popover — anchored to the chip, shows the
              // tool name + params for each call in the group. For
              // MCP calls we surface the ORIGINAL tool name (e.g.
              // `list_posts`) rather than the namespaced internal
              // form (`mcp_0__list_posts`) — that's what the user
              // sees in their MCP server's docs.
              <div className="absolute z-10 top-full mt-1 left-0 min-w-[220px] max-w-[360px] rounded-lg border border-stroke bg-white shadow-card p-2 space-y-1.5">
                {g.entries.map((c, i) => {
                  const displayedName = c.mcp ? c.mcp.toolName : c.name
                  return (
                    <div key={i} className="font-mono text-[10px] leading-snug">
                      <div className="text-grey-dark break-all">
                        {displayedName}
                        <span className="text-grey-light">
                          (
                          {Object.entries(c.input)
                            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                            .join(', ')}
                          )
                        </span>
                      </div>
                      {c.error ? (
                        <div className="text-destructive mt-0.5">✗ {c.error}</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
