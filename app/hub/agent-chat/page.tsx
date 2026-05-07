'use client'

/**
 * Ask AI — chat page.
 *
 * Architecture:
 *   - Single source of truth for the chat log lives in this
 *     component's `messages` state.
 *   - On mount we hydrate from localStorage (per user id) — so a
 *     refresh keeps the conversation. No DB schema, no backend
 *     persistence; this is deliberately a v1 "stupid MCP".
 *   - Each send: append user message → POST /api/chat with the full
 *     log + the user's tz → append the assistant reply (with
 *     tool-call trace) when it lands.
 *
 * Layout mirrors the home page: `h-screen flex flex-col`, header
 * doesn't scroll, the message stream is the only scroll container,
 * the input is pinned to the bottom of the column. Keeps the chat
 * page visually consistent with the rest of the dashboard.
 */

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'
import { Trash, Warning } from '@phosphor-icons/react'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { ChatHeader } from './(components)/ChatHeader'
import { ChatEmpty } from './(components)/ChatEmpty'
import { ChatMessage } from './(components)/ChatMessage'
import { ChatTypingIndicator } from './(components)/ChatTypingIndicator'
import { ChatInput } from './(components)/ChatInput'
import type { ChatMessage as Msg, ToolCallTrace } from './(components)/types'
import { createClient } from '@/lib/supabase/client'
import type { RootState } from '@/store'

// localStorage key prefix. Per-user so two accounts on the same
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

function AgentChat() {
  // Initial-query hand-off from `?q=` (used by other pages that want
  // to send the user straight into a chat with a pre-typed prompt).
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const didSendInitial = useRef(false)

  // Resolve the auth user once on mount, then hydrate the chat log
  // for that user. We can't read localStorage during render because
  // the user id is async; the empty-state flashes briefly but that's
  // acceptable for a chat page.
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
    return () => { cancelled = true }
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
      // Snapshot the next log so we can both render optimistically
      // AND ship the same shape to the API in one go.
      const next = [...messages, userMsg]
      setMessages(next)
      setInput('')
      setSending(true)

      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const authToken = session?.access_token
          ? `Bearer ${session.access_token}`
          : ''

        // Hit the NestJS backend (`POST /chat`) — Anthropic key + tool
        // execution live there now, alongside every other third-party
        // integration. Frontend just forwards the message log.
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authToken },
          body: JSON.stringify({
            // Backend only needs role + content. Strip our local
            // `id` and `toolCalls` fields — the model ignores them
            // and they make the payload bigger.
            messages: next.map(m => ({ role: m.role, content: m.content })),
            tz,
          }),
        })

        // Read the body as text first so we can still surface
        // *something* if the server returned an empty 500 (e.g. a
        // platform-level crash). Without this we'd just get the
        // misleading "Unexpected end of JSON input" from `.json()`
        // on an empty body.
        const rawText = await res.text()
        let data: {
          reply?: string
          toolCalls?: ToolCallTrace[]
          // Backend shapes:
          //  NestJS HttpException → `{ statusCode, message }`
          //  legacy frontend route → `{ error }`
          // Handle both.
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

        const reply =
          data.reply ?? data.message ?? data.error ?? 'Something went wrong.'
        setMessages(prev => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: reply,
            toolCalls: data.toolCalls,
          },
        ])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.'
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

  // Send the initial `?q=` prompt once, after we've hydrated the user
  // (so the first message lands AFTER any restored history, not
  // mid-hydration).
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

  return (
    /*
      `flex-1 min-h-0` instead of `h-screen` so this column fills
      `<main>`'s remaining space *after* its `pt-[60px]` mobile gutter
      (used to reserve room for the fixed `<MobileTopBar>`). With
      `h-screen` the column would extend exactly 100 vh down from
      its origin, overshooting the viewport bottom by 60 px on
      phones. `min-h-0` lets the inner `flex-1 overflow-y-auto` log
      shrink instead of growing past the column — standard flex-
      child shrink trick, same one `home/page.tsx` uses.
    */
    <div className="flex-1 min-h-0 flex flex-col">
      {/*
        Mobile top bar — internally `md:hidden`. Carries the title and
        a Trash icon-button on the right that triggers `clear` (only
        when there's something to clear, mirroring the desktop
        `<ChatHeader>`'s gating). The chat log + input stay shared
        between layouts — single tree, two top-bar variants chosen by
        breakpoint.
      */}
      <MobileTopBar
        variant="page"
        title="Ask AI"
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
      {/* Desktop header — title + subtitle + Clear button. Wrapped in
          `hidden md:block` so the mobile bar is the only header at
          phone widths. */}
      <div className="hidden md:block">
        <ChatHeader hasMessages={messages.length > 0} onClear={clear} />
      </div>

      {/*
        Beta warning — Ask AI is still under active development.
        Persistent (no dismiss) and sits between the header and the
        scrolling message stream so it's always visible regardless of
        scroll position. Amber tone matches the warning treatment used
        for view-tile reattach prompts elsewhere in the app.
      */}
      <div className="shrink-0 mx-4 mt-3 md:mt-0 mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <Warning size={14} weight="bold" className="shrink-0" />
        <span>
          Ask AI is still in early development — answers may be inaccurate,
          slow, or fail entirely. Don&rsquo;t rely on it for critical decisions.
        </span>
      </div>

      {/* Scrollable message stream. `min-h-0` is the flex-child
          shrink trick — same as on home/page.tsx. */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="max-w-4xl mx-auto py-6 space-y-4">
          {messages.length === 0 && !sending ? (
            <ChatEmpty />
          ) : (
            messages.map(m => <ChatMessage key={m.id} message={m} />)
          )}
          {sending && <ChatTypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => send(input)}
        sending={sending}
        // Suggestions always visible — even mid-conversation. Users
        // can re-pull a starter prompt at any time, and the row also
        // fills the white wrapper visually.
        showSuggestions
      />
    </div>
  )
}

export default function AgentChatPage() {
  // `useSearchParams` requires a Suspense boundary in the App
  // Router. Same wrapper the previous version used.
  return (
    <Suspense>
      <AgentChat />
    </Suspense>
  )
}
