'use client'

/**
 * Demo Agent chat body — embedded under the Dashboard / Agent mode
 * switch on the demo home page. Replaces the old standalone
 * `DemoAskAIPage` (a full demo "page" of its own) with a body that
 * lives inside `<DemoHomePage>` and behaves like the real
 * `<AgentChatBody>` does inside `/hub/home`: same surface, no route
 * change, just a different body under the same top-bar.
 *
 * Behaviour:
 *   1. On first mount (only if the chat is empty — preserves any
 *      user-typed history across toggles), starts an auto-play
 *      sequence:
 *        - Types the first scripted question one character at a
 *          time into the empty-state input pill.
 *        - "Sends" it — the user message lands in the chat, the
 *          empty state unmounts, the active state mounts.
 *        - Shows a typing indicator briefly.
 *        - Appends the assistant reply.
 *        - Pauses, then types the second question into the
 *          bottom input pill in the active state.
 *        - "Sends" and replies the same way.
 *      End — the visitor can now type into the chat normally.
 *   2. All scroll movement stays INSIDE the chat container (via
 *      `scrollTo` on a ref'd `overflow-y-auto` element). The
 *      previous `bottomRef + scrollIntoView` pattern bubbled up the
 *      DOM and pulled the landing page around with it — the bug
 *      that triggered this rewrite.
 *   3. Empty state mirrors the real product's `<ChatEmpty>`:
 *      centred title, integrated input pill, MCP chip row at the
 *      bottom with two fake user MCPs (`Beehiiv`, `Notion`) plus
 *      the orange "Config MCP's" chip.
 *
 * State plumbing:
 *   - `chat`, `pushChatMessage`, `sendChatMessage`, `clearChat`
 *     come from `DemoContext`.
 *   - Auto-play state (typing index, waiting-for-reply flag, the
 *     "has played in this mount" guard) lives locally — it's a
 *     pure UI concern.
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowUp, CaretRight, Sparkle } from '@phosphor-icons/react'
import { ChatMessage } from '@/app/hub/agent-chat/(components)/ChatMessage'
import { ChatTypingIndicator } from '@/app/hub/agent-chat/(components)/ChatTypingIndicator'
import type { ChatMessage as Msg } from '@/app/hub/agent-chat/(components)/types'
import { DEMO_SCRIPT, useDemoContext } from './context/DemoContext'

// Timings — extracted so the auto-play feel can be retuned without
// reading the state-machine code below. Same values as the landing-
// page showcase so both surfaces have the same cadence.
const TYPING_CHAR_MS = 45
const POST_TYPE_PAUSE_MS = 400
const REPLY_TYPING_MS = 1500
const POST_REPLY_PAUSE_MS = 2200

export function DemoAgentBody() {
  const { chat, sendChatMessage, pushChatMessage, goToPage } = useDemoContext()
  const [inputValue, setInputValue] = useState('')
  const [autoPlaying, setAutoPlaying] = useState(false)
  // Drives the typing indicator between scripted "send" and reply.
  const [waitingForReply, setWaitingForReply] = useState(false)
  // Per-mount guard so we don't restart auto-play when state ticks
  // re-run the mount effect (StrictMode double-invokes, etc.).
  const startedRef = useRef(false)
  // Inner scroll container — `scrollTop` is set on THIS element so
  // the landing page never moves. Replaces the old `bottomRef +
  // scrollIntoView` pattern, which scrolled the whole window.
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // ── Auto-scroll (inner container only) ──────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [chat, waitingForReply])

  // ── Auto-play state machine ─────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return
    // Skip auto-play if the user already has chat history from a
    // previous interaction — they don't want their conversation
    // wiped just because they toggled away and back.
    if (chat.length > 0) return
    startedRef.current = true
    setAutoPlaying(true)

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const schedule = (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
      timers.push(t)
    }

    const typeQuestion = (i: number, charIdx: number) => {
      if (cancelled) return
      if (i >= DEMO_SCRIPT.length) {
        setAutoPlaying(false)
        setInputValue('')
        return
      }
      const entry = DEMO_SCRIPT[i]!
      if (charIdx <= entry.q.length) {
        setInputValue(entry.q.slice(0, charIdx))
        schedule(TYPING_CHAR_MS, () => typeQuestion(i, charIdx + 1))
        return
      }
      // Finished typing — pause, "send", show indicator, reply.
      schedule(POST_TYPE_PAUSE_MS, () => {
        pushChatMessage('user', entry.q)
        setInputValue('')
        setWaitingForReply(true)
        schedule(REPLY_TYPING_MS, () => {
          setWaitingForReply(false)
          pushChatMessage('assistant', entry.a)
          schedule(POST_REPLY_PAUSE_MS, () => typeQuestion(i + 1, 0))
        })
      })
    }

    typeQuestion(0, 0)

    return () => {
      cancelled = true
      timers.forEach(t => clearTimeout(t))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived UI state ────────────────────────────────────────────
  // `sending` drives the typing indicator AND disables the input —
  // covers both the scripted (autoplaying + waitingForReply) and
  // the user-initiated (chat tail is a user message, awaiting the
  // DemoContext.sendChatMessage 600 ms reply) cases.
  const sending =
    waitingForReply ||
    (chat.length > 0 && chat[chat.length - 1]!.role === 'user')
  // Disable input during the scripted run; visitor can type freely
  // once auto-play completes.
  const inputLocked = autoPlaying || sending
  const isEmpty = chat.length === 0 && !sending

  // `<ChatMessage>` accepts the production `Msg` shape — the demo
  // chat message is structurally compatible (optional `toolCalls`,
  // `renderables`, `isError` all unused here).
  const messages: Msg[] = chat

  const handleSubmit = () => {
    if (!inputValue.trim() || inputLocked) return
    sendChatMessage(inputValue)
    setInputValue('')
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Scrollable message column. `ref={scrollRef}` lets the
          auto-scroll effect set `scrollTop` directly on THIS
          element — no DOM bubbling, no page hijack. */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-3">
        <div className="max-w-2xl mx-auto py-3 space-y-3">
          {isEmpty ? (
            <DemoAgentEmpty
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSubmit={handleSubmit}
              locked={inputLocked}
              onConfigMcp={() => goToPage('connections')}
            />
          ) : (
            messages.map(m => <ChatMessage key={m.id} message={m} />)
          )}
          {sending && <ChatTypingIndicator />}
        </div>
      </div>

      {/* Bottom input mounts only in the active state — the empty
          state has its own integrated input pill (mirrors real
          product). */}
      {!isEmpty && (
        <div className="shrink-0 px-3 pb-3">
          <DemoInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            locked={inputLocked}
          />
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────

/**
 * Empty-state surface — what visitors see BEFORE any messages have
 * been sent. Mirrors the real `<ChatEmpty>`:
 *   - Centred "What do you want to know?" title (Bricolage face).
 *   - Integrated grey input pill with a Sparkle icon + orange send.
 *   - MCP chip row at the bottom (two fake user MCPs + the orange
 *     "Config MCP's" chip that navigates to Connections).
 *
 * No "Play demo" button — the auto-play is triggered automatically
 * on mount by `<DemoAgentBody>`'s effect, not by a manual click.
 */
function DemoAgentEmpty({
  inputValue,
  onInputChange,
  onSubmit,
  locked,
  onConfigMcp,
}: {
  inputValue: string
  onInputChange: (next: string) => void
  onSubmit: () => void
  locked: boolean
  onConfigMcp: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center py-6 px-2">
      <h2
        className="text-lg font-semibold text-grey-darkest mb-4 tracking-tight"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        What do you want to know ?
      </h2>

      <div className="w-full max-w-md">
        <DemoInput
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSubmit}
          locked={locked}
        />
        <p className="mt-2 text-[10px] text-grey-light">
          Demo only — answers are scripted, not live data.
        </p>
      </div>

      {/* MCP chip row — two fake user MCPs (`Beehiiv`, `Notion`)
          plus the trailing orange "Config MCP's" chip. The user
          chips are informational only (no click handler); Config
          routes to the demo's Connections page so visitors can see
          where MCPs would live. */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <DemoUserMcpChip name="Beehiiv" />
        <DemoUserMcpChip name="Notion" />
        <DemoConfigMcpChip onClick={onConfigMcp} />
      </div>
    </div>
  )
}

// ── MCP chips (demo-local, smaller than the production versions) ──
//
// The real `UserMcpChip` from `<ChatEmpty>` is `hidden md:inline-flex`
// (hidden on mobile by design). The demo card has its own internal
// `md:` breakpoints AND we want the chips visible at every demo
// width, so we inline smaller demo variants instead of reusing the
// production component. Same visual language, just scaled down.

function DemoUserMcpChip({ name }: { name: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-stroke shadow-sm px-2 py-1">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-main">
        <Image
          src="/icons/mcp.svg"
          alt=""
          width={12}
          height={12}
          className="opacity-90"
        />
      </span>
      <span className="text-xs font-semibold text-grey-darkest">{name}</span>
    </div>
  )
}

function DemoConfigMcpChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 rounded-lg bg-white border border-stroke shadow-sm px-2 py-1 hover:bg-main transition-colors cursor-pointer"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-brand">
        <Image
          src="/icons/mcp.svg"
          alt=""
          width={12}
          height={12}
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </span>
      <span className="text-xs font-semibold text-grey-darkest">
        Config MCP&rsquo;s
      </span>
      <CaretRight
        size={10}
        weight="bold"
        className="text-grey-light shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
      />
    </button>
  )
}

// ── Input pill ────────────────────────────────────────────────────

/**
 * Slim chat input pill, sized for the demo card. Same visual idiom
 * as the real product's `<ChatEmpty>` / `<ChatInput>`:
 *   - `bg-main` (soft grey) so the input reads as inset against
 *     the white surrounding surface.
 *   - Brand-orange Sparkle icon top-left as the AI affordance.
 *   - Brand-orange ArrowUp square in the bottom-right as the send.
 *
 * `locked={true}` means the auto-play is driving the value — the
 * textarea becomes read-only (so a stray keystroke doesn't fight
 * the animation) and the send button greys out. Cleared once
 * auto-play finishes; the visitor can then type normally.
 *
 * Enter to send, Shift+Enter for newline — same keyboard contract
 * the real product ships. Enter is ignored when `locked`.
 */
function DemoInput({
  value,
  onChange,
  onSubmit,
  locked,
}: {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  locked: boolean
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (locked) return
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (value.trim()) onSubmit()
    }
  }
  const canSend = value.trim().length > 0 && !locked
  return (
    <div className="relative rounded-xl bg-main border border-stroke px-3 pt-3 pb-2 min-h-[72px]">
      <div className="flex items-start gap-2">
        <Sparkle
          size={14}
          weight="fill"
          className="text-brand shrink-0 mt-0.5"
        />
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          rows={1}
          readOnly={locked}
          className="flex-1 bg-transparent outline-none resize-none text-xs text-grey-darkest placeholder:text-grey-light disabled:opacity-60 leading-relaxed"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          if (canSend) onSubmit()
        }}
        disabled={!canSend}
        aria-label="Send message"
        className="absolute bottom-2 right-2 flex items-center justify-center w-6 h-6 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-default cursor-pointer transition-colors"
      >
        <ArrowUp size={11} weight="bold" />
      </button>
    </div>
  )
}
