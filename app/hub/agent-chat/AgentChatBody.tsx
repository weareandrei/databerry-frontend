'use client'

/**
 * Reusable agent-chat body. Owns ALL the chat state + send logic +
 * the message-stream / input UI. Renders inside any flex-column
 * parent that gives it `flex-1 min-h-0`.
 *
 * Used by:
 *   - `/hub/agent-chat/page.tsx` (the dedicated route) — passes
 *     `showChrome` so the body renders its own mobile top-bar +
 *     desktop ChatHeader (with the Clear button).
 *   - `/hub/home/page.tsx` (the Dashboard / Ask-agent in-page toggle)
 *     — passes nothing, so the body skips its own chrome and slots
 *     under the home page's existing top bar (with the switch).
 *
 * The `?q=` initial-prompt hand-off is now a prop instead of a
 * `useSearchParams()` call so this file doesn't drag in a Suspense
 * boundary requirement. The standalone page reads `?q=` and passes
 * it through; the embedded home version simply omits it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash, Warning } from '@phosphor-icons/react'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { ChatHeader } from './(components)/ChatHeader'
import {
  ChatEmpty,
  ConfigMcpChip,
  UserMcpChip,
} from './(components)/ChatEmpty'
import { ChatMessage } from './(components)/ChatMessage'
import { ChatTypingIndicator } from './(components)/ChatTypingIndicator'
import { ChatInput } from './(components)/ChatInput'
import { EVENT, trackEvent } from '@/lib/posthog'
import type {
  ChatMessage as Msg,
  Renderable,
  ToolCallTrace,
} from './(components)/types'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '@/contexts/DashboardContext'
import type { RootState } from '@/store'

// Cap on how many user-MCP chips render in the active-state footer
// before the trailing `<ConfigMcpChip>`. Matches the empty-state
// row's limit — same row, same overflow behaviour.
const MAX_USER_MCP_CHIPS = 4

// localStorage key prefix — per-user so two accounts on the same
// browser don't bleed into each other. Bumped if the message shape
// ever changes (today: v1).
const STORAGE_PREFIX = 'databerry:chat:v1:'

function loadHistory(userId: string): Msg[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(userId: string, messages: Msg[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(messages))
  } catch {
    /* quota exceeded — fall back to in-memory only */
  }
}

interface AgentChatBodyProps {
  /** Optional first message to auto-send on mount — used by the
   *  standalone `/hub/agent-chat?q=…` deep-link entry-point. */
  initialQuery?: string
  /** When true, the body renders its own mobile top-bar + desktop
   *  ChatHeader (with the Clear button). Default false so the body
   *  embeds cleanly under another page's chrome (home page). */
  showChrome?: boolean
}

export function AgentChatBody({
  initialQuery,
  showChrome = false,
}: AgentChatBodyProps) {
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const didSendInitial = useRef(false)

  // Resolve the auth user once on mount, then hydrate the chat log
  // for that user. We can't read localStorage during render because
  // the user id is async; the empty state flashes briefly but that's
  // acceptable for a chat surface.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id ?? null
      if (cancelled) return
      setUserId(uid)
      if (uid) setMessages(loadHistory(uid))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist on every message change.
  useEffect(() => {
    if (userId) saveHistory(userId, messages)
  }, [messages, userId])

  // Keep the latest message visible.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const send = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim()
      if (!content || sending) return

      const userMsg: Msg = { id: uuidv4(), role: 'user', content }
      const next = [...messages, userMsg]
      setMessages(next)
      setInput('')
      setSending(true)

      // Submit-side props that travel on BOTH the submit event and
      // (if it happens) the error event. Same name on both events
      // by design — see the `EVENT.ASK_AI_MESSAGE_SENT` docstring.
      // The prompt itself is captured so the PostHog inbox shows
      // what users are actually asking; PostHog event properties
      // aren't affected by the `maskAllInputs` session-recording
      // setting, so this is opt-in by site policy. If we ever want
      // to scrub these, do it here.
      const submitProps = {
        prompt: content,
        promptLength: content.length,
        messageIndex: messages.length,
      }
      trackEvent(EVENT.ASK_AI_MESSAGE_SENT, submitProps)

      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const authToken = session?.access_token
          ? `Bearer ${session.access_token}`
          : ''

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            messages: next.map(m => ({ role: m.role, content: m.content })),
            tz,
          }),
        })

        const rawText = await res.text()
        let data: {
          reply?: string
          toolCalls?: ToolCallTrace[]
          renderables?: Renderable[]
          error?: string
          message?: string
        }
        try {
          data = rawText ? JSON.parse(rawText) : {}
        } catch {
          data = {
            error: `Server returned non-JSON response (HTTP ${res.status}). Body: ${
              rawText.slice(0, 200) || '(empty)'
            }`,
          }
        }

        // Backend error path — anything that's NOT a clean 2xx with a
        // `reply` payload counts. (`data.message` is a NestJS error
        // body field; the controller also returns `data.error` for
        // its own framed failures.)
        const isBackendError = !res.ok || (data.reply == null && data.error != null)
        if (isBackendError) {
          trackEvent(EVENT.ASK_AI_MESSAGE_SENT, {
            ...submitProps,
            error:
              data.error ?? data.message ?? `HTTP ${res.status} with no reply.`,
            errorSource: 'backend',
            httpStatus: res.status,
          })
        }

        const reply =
          data.reply ?? data.message ?? data.error ?? 'Something went wrong.'
        setMessages(prev => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: reply,
            toolCalls: data.toolCalls,
            renderables: data.renderables,
          },
        ])
      } catch (err) {
        // Network failure — fetch threw before we got a response. The
        // browser couldn't reach the server at all (offline, DNS,
        // CORS preflight rejected, etc.). Distinct from the
        // backend-error case above because there's no HTTP status to
        // report.
        const message =
          err instanceof Error ? err.message : 'Something went wrong.'
        trackEvent(EVENT.ASK_AI_MESSAGE_SENT, {
          ...submitProps,
          error: message,
          errorSource: 'network',
        })
        setMessages(prev => [
          ...prev,
          { id: uuidv4(), role: 'assistant', content: `Error: ${message}` },
        ])
      } finally {
        setSending(false)
      }
    },
    [messages, sending, tz],
  )

  // Auto-send the deep-link `?q=` prompt once we've hydrated.
  useEffect(() => {
    if (initialQuery && !didSendInitial.current && userId) {
      didSendInitial.current = true
      send(initialQuery)
    }
  }, [initialQuery, userId, send])

  const clear = () => {
    setMessages([])
    if (userId) saveHistory(userId, [])
  }

  // MCP connections feed the empty-state chip row. Filter to the
  // owner's MCP connections (Common + project-scoped both — the
  // user owns them either way). Memoised so the array identity is
  // stable across renders that don't change the underlying list,
  // which keeps `<ChatEmpty>` from re-running its render for no
  // reason.
  const { connections } = useDashboard()
  const mcpConnections = useMemo(
    () => connections.connections.filter(c => c.type === 'mcp'),
    [connections.connections],
  )

  const isEmpty = messages.length === 0 && !sending

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {showChrome && (
        <>
          <MobileTopBar
            variant="page"
            title="Agent"
            rightSlot={
              messages.length > 0 ? (
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Clear chat"
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-stroke bg-white shadow-pill text-grey-darkest hover:bg-hover-fill transition-colors shrink-0"
                >
                  <Trash size={14} weight="bold" />
                </button>
              ) : null
            }
          />
          <div className="hidden md:block">
            <ChatHeader hasMessages={messages.length > 0} onClear={clear} />
          </div>
        </>
      )}

      {/* ── White card wrapper ────────────────────────────────────
          All chat content sits inside a single white card —
          rounded, soft-shadow, breathing room around it so it
          doesn't hug the page edges. The card chrome is the same
          `rounded-2xl border-stroke shadow-card` family used by
          other "primary content" surfaces (view tiles' parent
          containers, the connections card).

          Margin rhythm:
          - Mobile (<md): symmetric `mx-4 mb-4`. The home-page mobile
            branch wraps this in a `px-4`-less container, so we own
            the side gutters here. Matches the rhythm of the pinned
            views / projects cards stacked above us.
          - Desktop (md+): `mr-6 mb-6` only — flush against the
            sidebar's right edge so the card occupies the same
            column as the dashboard body's content (`pr-6 pb-8`). */}
      <div className="flex-1 min-h-0 mx-4 md:ml-0 md:mr-6 mb-4 md:mb-6 bg-white rounded-2xl border border-stroke shadow-card flex flex-col overflow-hidden">
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
              <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-grey-darkest">
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

            {/* Row 3 — bottom footer. `relative` so the floating
                New-chat pill below can anchor to it. */}
            <div className="shrink-0 px-4 pb-4 relative">
              {/* Floating "New chat" pill — positioned ABSOLUTELY
                  above the footer's top edge so it visually overlaps
                  the message scroll area (messages can scroll behind
                  it) rather than living inside a full-width white
                  strip that hid the last bubble. Only the pill itself
                  carries chrome; the surrounding area is transparent
                  to whatever's behind it.
                  - `-top-12` lifts it ~48 px above the footer.
                  - `left-8` aligns it with the input's left edge
                    (footer has `px-4`, inner column uses
                    `max-w-3xl mx-auto`, so 8 = 4 footer pad + 4
                    breathing).
                  - `z-10` keeps it above the scroll area's content
                    (default stacking already does, but explicit).
                  Message column's `pb-12` (above) is what reserves
                  the empty space the floating pill sits over — so
                  scrolling all the way down still shows the last
                  message ABOVE the pill, not behind it. */}
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="absolute -top-12 left-8 z-10 inline-flex items-center gap-2 rounded-xl border border-stroke bg-white pl-1.5 pr-3 py-1.5 shadow-sm cursor-pointer"
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-main">
                    <Plus
                      size={14}
                      weight="bold"
                      className="text-grey-darkest"
                    />
                  </span>
                  <span className="text-sm font-semibold text-grey-darkest">
                    New chat
                  </span>
                </button>
              )}

              <div className="max-w-3xl mx-auto">

                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSubmit={() => send(input)}
                  sending={sending}
                />

                {/* Same disclaimer copy as the empty state — keeps
                    the AI-inaccuracy warning visible regardless of
                    which surface the user is on. */}
                <p className="mt-3 text-[11px] text-grey-light text-center">
                  Databerry AI copilot can be inaccurate. Please double-check
                  responses.
                </p>

                {/* MCP chip row — user's MCP connections (cap at
                    `MAX_USER_MCP_CHIPS` so the row doesn't blow past
                    one line on narrow viewports), then the trailing
                    Config affordance. Same row as the empty state;
                    consistent shape across both surfaces. */}
                <div className="mt-4 flex items-center justify-center flex-wrap gap-3">
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
