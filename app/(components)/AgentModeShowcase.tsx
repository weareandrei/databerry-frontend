'use client'

/**
 * Auto-playing Agent Mode showcase for the landing page.
 *
 * What it does:
 *   1. Waits for the surface to come into view (IntersectionObserver).
 *   2. Plays a scripted two-turn conversation forever:
 *        - Types out the user's question one character at a time in
 *          a visual "input" pill (same shape as the real product).
 *        - "Sends" — the typed text moves into the message stream.
 *        - Shows a typing indicator.
 *        - Appends the assistant reply.
 *        - Pauses, repeats with the next question.
 *        - After the last Q&A, clears and restarts the loop.
 *   3. On unmount, all pending timers are cleared.
 *
 * Why not reuse `DemoAgentBody`:
 *   - That component is INTERACTIVE — user types, presses Enter,
 *     gets a scripted reply. This one is passive — visitor watches.
 *     Different state model (scripted timeline vs. user input),
 *     different input UX (animated typing vs. live textarea).
 *   - Sharing would require threading a `playMode` prop through both,
 *     and the production-side input pill is already overloaded with
 *     suggestion-chip logic. Cleaner to keep them as two siblings
 *     that share the same chat-message renderer.
 *
 * Components reused: `<ChatMessage>` + `<ChatTypingIndicator>` from
 * the real agent-chat tree (provider-free, no `useDashboard()`).
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Sparkle } from '@phosphor-icons/react'
import { ChatMessage } from '@/app/hub/agent-chat/(components)/ChatMessage'
import { ChatTypingIndicator } from '@/app/hub/agent-chat/(components)/ChatTypingIndicator'
import type { ChatMessage as Msg } from '@/app/hub/agent-chat/(components)/types'

// ── Script ────────────────────────────────────────────────────────
//
// Same shape as `DEMO_SCRIPT` in the interactive demo so both
// surfaces tell the same story. Two turns: revenue, then traffic —
// shows that one agent routes to multiple data sources. Reply text
// is markdown-friendly (`**` bold + paragraphs survive through the
// real `ChatMessage` markdown renderer).

const SCRIPT: { q: string; a: string }[] = [
  {
    q: "How's my revenue this week?",
    a: "**$4,832 this week** (Apr 1 – Apr 7) — up **18%** from last week.\n\nThe biggest day was Wednesday at **$1,240**. Source: Stripe on your main project.",
  },
  {
    q: 'And what about traffic — any spike worth knowing about?',
    a: "**12,847 pageviews** this week (Google Analytics), up **6%** vs. last week.\n\nWednesday's session count spiked too — likely the same audience that drove the revenue bump.",
  },
]

// Timings — every number is in milliseconds and lives at the top of
// the file so the whole feel of the loop can be retuned without
// reading the state-machine logic below.
const TYPING_CHAR_MS = 45        // per-character typing speed
const POST_TYPE_PAUSE_MS = 400   // pause after question is fully typed, before "send"
const REPLY_TYPING_MS = 1500     // how long the typing indicator shows before the reply
const POST_REPLY_PAUSE_MS = 2200 // pause between assistant reply and next question
const LOOP_RESTART_MS = 3500     // pause after the last reply, before clearing and restarting

export function AgentModeShowcase() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Inner scroll container — the `overflow-y-auto` div that holds
  // the message stream. We scroll THIS element directly when new
  // messages land, instead of using `<div ref={bottomRef}/>` +
  // `scrollIntoView`, which bubbles up the DOM and ends up moving
  // the whole landing page to the showcase. That bug was the
  // "page snaps to the demo every time a message types" symptom.
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const [messages, setMessages] = useState<Msg[]>([])
  // Currently-typed text in the visual input pill. Mirrors what
  // would appear in a real chat textarea while the user types.
  const [typingText, setTypingText] = useState('')
  // True between "send" and the reply arriving — drives the typing
  // indicator above the message stream.
  const [waitingForReply, setWaitingForReply] = useState(false)

  // ── Visibility gate ──────────────────────────────────────────────
  //
  // Don't start the animation until the section is at least 30%
  // visible — saves CPU + makes the first impression land when the
  // visitor has actually scrolled to look at it, rather than the
  // loop already being halfway through.
  const [hasStarted, setHasStarted] = useState(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el || hasStarted) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setHasStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasStarted])

  // ── Auto-scroll (inner container only) ──────────────────────────
  //
  // `scrollIntoView` (the obvious choice) walks UP the DOM and
  // scrolls EVERY containing scrollable ancestor, including the
  // page body — which on the landing page snaps the whole viewport
  // down to the showcase every time a character is typed. Lethal
  // UX.
  //
  // Setting `scrollRef.current.scrollTop = scrollHeight` instead
  // moves only the inner overflow-y-auto div. The page stays
  // exactly where the visitor put it.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, waitingForReply])

  // ── Scripted timeline ───────────────────────────────────────────
  //
  // State-machine driven by a stack of setTimeout calls collected in
  // `timers` so cleanup on unmount cancels everything in flight —
  // otherwise React's strict-mode double-effect would queue two
  // overlapping loops.
  useEffect(() => {
    if (!hasStarted) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const schedule = (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
      timers.push(t)
    }

    const runQuestion = (i: number) => {
      if (cancelled) return
      // End-of-script — pause, clear, restart from question 0.
      if (i >= SCRIPT.length) {
        schedule(LOOP_RESTART_MS, () => {
          setMessages([])
          setTypingText('')
          runQuestion(0)
        })
        return
      }
      const entry = SCRIPT[i]!
      // ── Typing animation ────────────────────────────────────────
      let charIdx = 0
      const typeNextChar = () => {
        if (cancelled) return
        charIdx++
        setTypingText(entry.q.slice(0, charIdx))
        if (charIdx < entry.q.length) {
          schedule(TYPING_CHAR_MS, typeNextChar)
          return
        }
        // ── Send + reply ────────────────────────────────────────
        schedule(POST_TYPE_PAUSE_MS, () => {
          setMessages(prev => [
            ...prev,
            { id: `q-${i}-${Date.now()}`, role: 'user', content: entry.q },
          ])
          setTypingText('')
          setWaitingForReply(true)
          schedule(REPLY_TYPING_MS, () => {
            setWaitingForReply(false)
            setMessages(prev => [
              ...prev,
              { id: `a-${i}-${Date.now()}`, role: 'assistant', content: entry.a },
            ])
            schedule(POST_REPLY_PAUSE_MS, () => runQuestion(i + 1))
          })
        })
      }
      typeNextChar()
    }

    runQuestion(0)

    return () => {
      cancelled = true
      timers.forEach(t => clearTimeout(t))
    }
  }, [hasStarted])

  return (
    // Full-height column — messages take the remaining space, input
    // pill pins to the bottom. `bg-white` because the section's
    // outer card wrapper supplies the semi-transparent backdrop;
    // this body is the "page" inside that card.
    <div ref={containerRef} className="flex flex-col h-full bg-white">
      {/* Scrollable message stream. `ref={scrollRef}` lets the
          auto-scroll effect manipulate THIS element's `scrollTop`
          directly instead of bubbling a `scrollIntoView` up the
          DOM. The previous bottom-sentinel `<div ref={bottomRef}/>`
          is gone — `scrollTo({top: scrollHeight})` reaches the
          bottom without needing a marker. */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="max-w-2xl mx-auto py-4 space-y-4">
          {messages.map(m => (
            <ChatMessage key={m.id} message={m} />
          ))}
          {waitingForReply && <ChatTypingIndicator />}
        </div>
      </div>

      {/* Visual input pill — non-interactive. Shows the auto-typed
          text plus a blinking caret while the script is mid-question.
          Same chrome as `<ChatEmpty>`'s integrated input so the look
          matches the real product. */}
      <div className="shrink-0 px-4 pb-4">
        <div className="max-w-2xl mx-auto">
          <ShowcaseInput typingText={typingText} />
        </div>
      </div>
    </div>
  )
}

// ── Visual input pill ────────────────────────────────────────────

/**
 * Non-interactive input pill. Displays whatever the script is
 * currently typing (or an empty pill between messages) plus a
 * blinking caret to sell the "AI is being asked something" effect.
 *
 * No `onChange`, no `onKeyDown` — visitors can't type into it. If
 * they try, the caret stays where it is and the focus ring shows
 * briefly, which is the standard browser behaviour for a readonly
 * textarea and reads as "this is a preview, not a control."
 */
function ShowcaseInput({ typingText }: { typingText: string }) {
  return (
    <div className="relative rounded-2xl bg-main border border-stroke px-4 pt-4 pb-3 min-h-[90px]">
      <div className="flex items-start gap-2.5">
        <Sparkle
          size={18}
          weight="fill"
          className="text-brand shrink-0 mt-0.5"
        />
        {/* Live-typed text + animated caret. Placeholder shows when
            nothing is being typed yet (or right after a "send"
            clears the field) — same copy as the real `<ChatEmpty>`. */}
        <div className="flex-1 text-sm text-grey-darkest leading-relaxed min-h-[2.25rem]">
          {typingText ? (
            <span>
              {typingText}
              <span
                aria-hidden
                className="inline-block align-baseline w-[1px] h-[1em] bg-grey-darkest ml-0.5 animate-pulse"
              />
            </span>
          ) : (
            <span className="text-grey-light">Ask anything</span>
          )}
        </div>
      </div>
      {/* Send button — visually present but never lights up; the
          script does the "sending" automatically. Kept here so the
          pill reads as the same shape as the real product. */}
      <div
        aria-hidden
        className="absolute bottom-2.5 right-2.5 flex items-center justify-center w-8 h-8 rounded-md bg-brand text-white opacity-40"
      >
        <ArrowUp size={14} weight="bold" />
      </div>
    </div>
  )
}
