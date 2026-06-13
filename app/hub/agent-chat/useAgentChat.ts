'use client'

/**
 * `useAgentChat` — all the agent-chat STATE: message history
 * (localStorage-persisted per user + per scope), the send pipeline
 * (auth token → POST /chat → error framing → assistant message),
 * and the `?q=` auto-send. `<AgentChatBody>` stays presentational.
 *
 * Scoping: `projectId` keys the stored history (workspace chat and
 * each project's chat are separate conversations) and travels in the
 * POST body so the backend can focus tools on that project.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'
import { EVENT, trackEvent, captureError } from '@/lib/posthog'
import { createClient } from '@/lib/supabase/client'
import type { RootState } from '@/store'
import type {
  ChatMessage as Msg,
  Renderable,
  ToolCallTrace,
} from './(components)/types'

// localStorage key prefix — per-user so two accounts on the same
// browser don't bleed into each other. Bumped if the message shape
// ever changes (today: v1).
const STORAGE_PREFIX = 'databerry:chat:v1:'

const storageKeyFor = (userId: string, projectId?: string) =>
  STORAGE_PREFIX + userId + (projectId ? `:project:${projectId}` : '')

function loadHistory(storageKey: string): Msg[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(storageKey: string, messages: Msg[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages))
  } catch {
    /* quota exceeded — fall back to in-memory only */
  }
}

interface UseAgentChatOpts {
  /** Optional first message to auto-send once hydrated — the
   *  `/hub/agent-chat?q=…` deep-link hand-off. */
  initialQuery?: string
  /** Scope the conversation (history + backend context) to a project. */
  projectId?: string
}

export function useAgentChat({ initialQuery, projectId }: UseAgentChatOpts) {
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const didSendInitial = useRef(false)

  const storageKey = userId ? storageKeyFor(userId, projectId) : null

  // Resolve the auth user once on mount, then hydrate the chat log
  // for that user + scope. localStorage can't be read during render
  // because the user id is async; the empty state flashes briefly,
  // which is acceptable for a chat surface.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id ?? null
      if (cancelled) return
      setUserId(uid)
      if (uid) setMessages(loadHistory(storageKeyFor(uid, projectId)))
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Persist on every message change.
  useEffect(() => {
    if (storageKey) saveHistory(storageKey, messages)
  }, [messages, storageKey])

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
      // (if it happens) the error event — same name on both by
      // design, see the `EVENT.ASK_AI_MESSAGE_SENT` docstring. The
      // prompt is captured so the PostHog inbox shows what users ask.
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
            // Project-scoped chat surfaces send their project id so
            // the backend can narrow tool calls to that project.
            // Undefined (workspace chat) serialises away entirely.
            projectId,
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
          const errorMessage =
            data.error ?? data.message ?? `HTTP ${res.status} with no reply.`
          // `captureError` files BOTH a PostHog exception AND a
          // same-named funnel event (joining the success-side
          // `ask_ai_message_sent` stream). Synthesising an Error
          // because the response was structurally fine — the backend
          // just returned a non-2xx; the stack should point HERE.
          captureError(
            EVENT.ASK_AI_MESSAGE_SENT,
            new Error(`Chat backend error: ${errorMessage}`),
            {
              ...submitProps,
              errorSource: 'backend',
              httpStatus: res.status,
            },
          )
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
            // Backend-error replies render as a red bubble so the
            // user can't mistake an upstream failure for the agent's
            // actual answer.
            isError: isBackendError,
          },
        ])
      } catch (err) {
        // Network failure — fetch threw before any response (offline,
        // DNS, CORS preflight). Distinct from the backend-error case:
        // no HTTP status exists. Pass the original `err` so PostHog
        // gets the real fetch stack frame.
        const message =
          err instanceof Error ? err.message : 'Something went wrong.'
        captureError(EVENT.ASK_AI_MESSAGE_SENT, err, {
          ...submitProps,
          errorSource: 'network',
        })
        setMessages(prev => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: message,
            isError: true,
          },
        ])
      } finally {
        setSending(false)
      }
    },
    [messages, sending, tz, projectId],
  )

  // Auto-send the deep-link `?q=` prompt once we've hydrated.
  useEffect(() => {
    if (initialQuery && !didSendInitial.current && userId) {
      didSendInitial.current = true
      send(initialQuery)
    }
  }, [initialQuery, userId, send])

  const clear = useCallback(() => {
    setMessages([])
    if (storageKey) saveHistory(storageKey, [])
  }, [storageKey])

  return { messages, input, setInput, sending, send, clear }
}
