'use client'

/**
 * Reusable agent-chat body — the PRESENTATION half of the agent
 * surface: empty-state launcher, message stream, input footer, MCP
 * chip rows. All chat state + the send pipeline live in
 * `useAgentChat.ts`. Renders inside any flex-column parent that
 * gives it `flex-1 min-h-0`.
 *
 * Used by:
 *   - `/hub/agent-chat/page.tsx` — the workspace-wide chat
 *   - `/hub/project/[id]/agent-chat/page.tsx` — the project-scoped
 *     chat (separate history, project id sent with every message)
 *
 * The `?q=` initial-prompt hand-off is a prop (not a
 * `useSearchParams()` call) so this file doesn't drag in a Suspense
 * boundary; the standalone pages read `?q=` and pass it through.
 */

import { useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Trash, Warning } from '@phosphor-icons/react'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar/MobileTopBar'
import {
  ChatEmpty,
  ConfigMcpChip,
  UserMcpChip,
} from './(components)/ChatEmpty'
import { ChatMessage } from './(components)/ChatMessage'
import { ChatTypingIndicator } from './(components)/ChatTypingIndicator'
import { ChatInput } from './(components)/ChatInput'
import { useAgentChat } from './useAgentChat'
import { useDashboard } from '@/contexts/DashboardContext'

// Cap on how many user-MCP chips render in the active-state footer
// before the trailing `<ConfigMcpChip>`. Matches the empty-state
// row's limit — same row, same overflow behaviour.
const MAX_USER_MCP_CHIPS = 4

interface AgentChatBodyProps {
  /** Optional first message to auto-send on mount — used by the
   *  `/hub/agent-chat?q=…` deep-link entry-point. */
  initialQuery?: string
  /** When true, the body renders its own mobile top-bar. Default
   *  false so the body embeds cleanly under another page's chrome. */
  showChrome?: boolean
  /**
   * Scope the chat to one project (`[project]/agent-chat`) — see
   * `useAgentChat` for the two effects (separate stored history;
   * project id in the POST body).
   */
  projectId?: string
}

export function AgentChatBody({
  initialQuery,
  showChrome = false,
  projectId,
}: AgentChatBodyProps) {
  const router = useRouter()
  const { messages, input, setInput, sending, send, clear } = useAgentChat({
    initialQuery,
    projectId,
  })
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Keep the latest message visible.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // MCP connections feed the chip rows. Memoised so the array
  // identity is stable across renders that don't change the list,
  // which keeps `<ChatEmpty>` from re-rendering for no reason.
  const { connections } = useDashboard()
  const mcpConnections = useMemo(
    () => connections.connections.filter(c => c.type === 'mcp'),
    [connections.connections],
  )

  const isEmpty = messages.length === 0 && !sending

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Mobile-only chrome. The desktop `ChatHeader` that used to
          render here is gone — the white card now starts at the top
          of the page (with the shared 16-px margin) and stretches
          the full viewport height; "clear" stays reachable via the
          floating "New chat" pill inside the active chat. */}
      {showChrome && (
        <MobileTopBar
          variant="page"
          title="Agent"
          rightSlot={
            messages.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                aria-label="Clear chat"
                className="flex items-center justify-center w-9 h-9 rounded-full border border-stroke bg-white shadow-pill text-foreground hover:bg-hover-fill transition-colors shrink-0"
              >
                <Trash size={14} weight="bold" />
              </button>
            ) : null
          }
        />
      )}

      {/* ── White card wrapper ────────────────────────────────────
          All chat content sits inside a single white card —
          rounded, soft-shadow, breathing room around it so it
          doesn't hug the page edges. The card chrome is the same
          `rounded-2xl border-stroke shadow-card` family used by
          other "primary content" surfaces (view tiles' parent
          containers, the connections card).

          Margin rhythm: symmetric `mx-4 mt-4 mb-4` on every
          breakpoint — the shared 16-px rhythm of the hub's body
          panels (home, overview, filtered views), aligned with
          `HubTopBar`'s `px-4` and the project sidebar card's
          `top-4/bottom-4`. With the desktop header gone, `mt-4` is
          what keeps the card off the viewport's top edge while it
          stretches the full height. */}
      <div className="flex-1 min-h-0 mx-4 mt-4 mb-4 bg-white rounded-2xl border border-stroke shadow-card flex flex-col overflow-hidden">
        {isEmpty ? (
          // Empty state owns its own input. The bottom-pinned
          // `<ChatInput>` below is gated on `!isEmpty` so it
          // doesn't double up.
          <ChatEmpty
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            sending={sending}
            mcpConnections={mcpConnections}
          />
        ) : (
          // Active chat — three-row flex column inside the white
          // card:
          //
          //   1. Top row (shrink-0) — inset beta banner. Visually
          //      "sticky" by virtue of the parent's `overflow-hidden`:
          //      the middle row is the only scrollable child, so the
          //      banner never moves.
          //   2. Middle row (flex-1 min-h-0 overflow-y-auto) — the
          //      message stream. Scroll container goes edge-to-edge
          //      (wider) so generous data tables / lists have room,
          //      but an inner `max-w-3xl` column keeps individual
          //      message bubbles at a readable width — chat reads
          //      uncomfortable past ~70ch. `pb-12` adds breathing
          //      room above the bottom footer so the last message
          //      isn't crammed against the input.
          //   3. Bottom row (shrink-0) — "+ New chat" pill, the
          //      input, the disclaimer, and the MCP chip row
          //      (mirroring the empty state's chip row).
          <>
            {/* Row 1 — top banner. Outlined-only look: thin amber
                border on a near-white background (`amber-50/40`),
                with the Warning icon in our amber-500 brand-warning
                colour and the text in regular grey-darkest. Content
                is horizontally centred inside the banner so the
                short copy reads as one balanced unit rather than
                pinning to the left. */}
            <div className="shrink-0 px-4 pt-4 pb-2">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-foreground">
                <Warning
                  size={14}
                  weight="fill"
                  className="shrink-0 text-amber-500"
                />
                <span>
                  Databerry agent is still in early development. Agent can be
                  slow or break sometimes. Don&rsquo;t rely on it for critical
                  decisions.
                </span>
              </div>
            </div>

            {/* Row 2 — scrollable messages. The message column gets
                its own wider cap (`max-w-4xl`) so data tables /
                bulleted answers have room; the footer below stays
                at `max-w-3xl` so the input pill doesn't read as a
                wall of textarea on big screens. */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4">
              <div className="max-w-4xl mx-auto py-4 space-y-4 pb-12">
                {messages.map(m => (
                  <ChatMessage key={m.id} message={m} />
                ))}
                {sending && <ChatTypingIndicator />}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Row 3 — bottom footer. The floating "New chat" pill
                anchors to the INNER (`max-w-3xl mx-auto`) column —
                not the outer footer — so it sits above the input's
                actual left edge on any viewport width. When the
                viewport is wide, the outer footer spans the full
                card while the input is centred in a 3xl column;
                anchoring to the outer would put the pill out at
                the left wall, far away from the input. */}
            <div className="shrink-0 px-4 pb-4">
              <div className="max-w-3xl mx-auto relative">
                {/* Floating "New chat" pill — positioned ABSOLUTELY
                    above the inner column's top edge so it visually
                    overlaps the message scroll area (messages can
                    scroll behind it) rather than living inside a
                    full-width white strip that hid the last bubble.
                    Only the pill itself carries chrome; the
                    surrounding area is transparent.
                    - `-top-12` lifts it ~48 px above the column.
                    - `left-0` aligns its left edge with the input's
                      left edge.
                    - `z-10` keeps it above the scroll area's content
                      (default stacking already does, but explicit).
                    Message column's `pb-12` (above) is what reserves
                    the empty space the floating pill sits over — so
                    scrolling all the way down still shows the last
                    message ABOVE the pill, not behind it. */}
                {messages.length > 0 && (
                  // Floating row above the input. New-chat pill is
                  // always shown; Config-MCP's pill is mobile-only —
                  // on mobile the bottom MCP chip row is hidden (no
                  // vertical budget for it), so we surface the
                  // Config affordance up here next to New chat
                  // instead. Desktop keeps the bottom MCP row, so
                  // it doesn't need the duplicate.
                  <div className="absolute -top-12 left-0 z-10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clear}
                      className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-white pl-1.5 pr-3 py-1.5 shadow-sm cursor-pointer"
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface">
                        <Plus
                          size={14}
                          weight="bold"
                          className="text-foreground"
                        />
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        New chat
                      </span>
                    </button>
                    {/* Mobile-only Config MCP's — sized to match the
                        New chat pill exactly (same outer chrome, same
                        `w-7 h-7` icon tile) so they read as a pair.
                        Identical structure to `<ConfigMcpChip>` but
                        without the chevron — at this size the chevron
                        crowded the label. */}
                    <button
                      type="button"
                      onClick={() => router.push('/hub/connections')}
                      className="md:hidden inline-flex items-center gap-2 rounded-xl border border-stroke bg-white pl-1.5 pr-3 py-1.5 shadow-sm cursor-pointer"
                      aria-label="Configure MCP connections"
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
                        <Image
                          src="/icons/mcp.svg"
                          alt=""
                          width={14}
                          height={14}
                          style={{ filter: 'brightness(0) invert(1)' }}
                        />
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        Config MCP&rsquo;s
                      </span>
                    </button>
                  </div>
                )}

                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSubmit={() => send(input)}
                  sending={sending}
                />

                {/* Same disclaimer copy as the empty state — keeps
                    the AI-inaccuracy warning visible regardless of
                    which surface the user is on. */}
                <p className="mt-3 text-[11px] text-subtle text-center">
                  Databerry AI copilot can be inaccurate. Please double-check
                  responses.
                </p>

                {/* MCP chip row — user's MCP connections (cap at
                    `MAX_USER_MCP_CHIPS` so the row doesn't blow past
                    one line on narrow viewports), then the trailing
                    Config affordance.
                    DESKTOP ONLY: `hidden md:flex`. On mobile the
                    active-chat surface already has the Config MCP's
                    button up next to New chat, and the user chips
                    would otherwise add a second row at the bottom
                    that competes with the input for vertical space.
                    Empty state still shows the row on mobile because
                    it has no input-overlap problem. */}
                <div className="mt-4 hidden md:flex items-center justify-center flex-wrap gap-3">
                  {mcpConnections
                    .slice(0, MAX_USER_MCP_CHIPS)
                    .map(conn => (
                      <UserMcpChip key={conn.id} name={conn.name} />
                    ))}
                  <ConfigMcpChip
                    onClick={() => router.push('/hub/connections')}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
