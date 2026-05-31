'use client'

/**
 * Active-chat input pill. Visual language matches the empty-state
 * input on `<ChatEmpty>` — soft `bg-main` rounded box, brand-orange
 * `Sparkle` icon top-left, auto-resizing textarea, small brand-orange
 * square send button bottom-right. The pair (empty + active) reads
 * as the SAME input that just slides into different surrounding
 * chrome; the user shouldn't feel like a different control replaced
 * the one they were typing into.
 *
 * Enter submits; Shift+Enter inserts a newline — standard chat
 * platform convention (Slack, ChatGPT, iMessage web). We guard
 * against IME composition by checking `nativeEvent.isComposing`,
 * which is the recommended way to detect mid-composition Enter
 * presses (e.g. Japanese / Chinese input methods finishing a
 * candidate selection) — without this, a Korean user would lose
 * the trailing character every time they hit Enter to commit.
 *
 * `showSuggestions` is still supported so the InteractableDemo can
 * surface its preset Q&A chips above the input. In the real chat
 * the parent never sets it — the active-state footer carries the
 * MCP chips row instead, which is a separate concept.
 */

import { useEffect, useRef } from 'react'
import { ArrowUp, Sparkle } from '@phosphor-icons/react'

const EXAMPLE_PROMPTS = [
  "What's my MRR right now?",
  'Top customers last month',
  'How many meetings this week?',
  'Compare revenue between projects',
]

interface ChatInputProps {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  sending: boolean
  showSuggestions?: boolean
  /**
   * Override the suggestion chips shown above the input. Real callers
   * omit this and get the default `EXAMPLE_PROMPTS`. The demo passes
   * its preconfigured-Q&A questions so taps fill the textarea with a
   * prompt the demo can actually answer.
   */
  suggestions?: string[]
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  sending,
  showSuggestions = false,
  suggestions = EXAMPLE_PROMPTS,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-resize: shrink to 0 first to remeasure, then grow to
  // scrollHeight (capped via the `max-h-40` class). Standard textarea
  // autoresize pattern.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const canSend = value.trim().length > 0 && !sending

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Shift+Enter → newline (let the textarea handle it natively).
    // Plain Enter → submit, BUT only if the user isn't mid-IME
    // composition — finishing a CJK candidate also fires Enter, and
    // submitting there would eat the trailing character.
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <div>
      {showSuggestions && suggestions.length > 0 && (
        // Suggestion chips sit ABOVE the gray input pill. Only the
        // demo turns these on today; real chat shows MCP chips in
        // the parent footer instead.
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-grey-light font-medium mb-2 px-1">
            Try asking
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(p => (
              <button
                key={p}
                onClick={() => onChange(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-stroke hover:bg-hover-fill text-grey-dark transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gray input pill — same chrome as `<ChatEmpty>`'s integrated
          input so the visual identity is consistent across both
          states. Sparkle (top-left) is decorative AI affordance,
          ArrowUp (bottom-right) is the send. */}
      <div className="relative rounded-2xl bg-main border border-stroke px-4 pt-4 pb-3 min-h-[90px]">
        <div className="flex items-start gap-2.5">
          <Sparkle
            size={18}
            weight="fill"
            className="text-brand shrink-0 mt-0.5"
          />
          <textarea
            ref={textareaRef}
            rows={2}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            disabled={sending}
            className="flex-1 bg-transparent outline-none resize-none text-sm text-grey-darkest placeholder:text-grey-light disabled:opacity-60 max-h-40 leading-relaxed"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (canSend) onSubmit()
          }}
          disabled={!canSend}
          aria-label="Send message"
          className="absolute bottom-2.5 right-2.5 flex items-center justify-center w-8 h-8 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-default cursor-pointer transition-colors"
        >
          <ArrowUp size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
