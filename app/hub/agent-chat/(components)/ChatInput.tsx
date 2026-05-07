'use client'

/**
 * Input row pinned to the bottom of the chat page. Auto-resizing
 * textarea + brand-coloured send button. Plain Enter inserts a
 * newline; ⌘/Ctrl+Enter submits — matches macOS chat conventions
 * and avoids accidental sends.
 *
 * When `showSuggestions` is true, a row of starter prompt chips
 * renders inside the white wrapper, above the input pill. Clicking a
 * chip fills the textarea via `onChange` and the user then submits
 * normally. The chips moved here from the welcome panel because the
 * white wrapper is wide and reads as empty without something above
 * the input.
 */

import { useEffect, useRef } from 'react'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

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
  // scrollHeight (capped via Tailwind's `max-h-32`). This is the
  // standard textarea-autoresize pattern.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const canSend = value.trim().length > 0 && !sending

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    /*
      Two-layer card, mirroring the pinned-views pattern on the home
      page (white card containing view tiles).

         page bg (cream)
          └─ wide white wrapper (rounded-xl border shadow-card)  ← outer
              ├─ grey "view tile" textarea (rounded + border + shadow-sm)  ← inner
              └─ keyboard hint

      The outer is the same chrome as `<div className="rounded-xl
      border border-stroke bg-white shadow-card p-5">` that wraps the
      pinned-views grid. The inner uses a soft grey bg
      (`bg-black/[0.04]`) plus a subtle border + `shadow-sm` so it
      reads as a distinct "view tile" embedded in the white card,
      not just a tinted region. Same depth language as the rest of
      the dashboard.
    */
    <div className="shrink-0 px-4 pt-2 pb-5">
      {/*
        White wrapper fills the page column — no max-width — exactly
        like the pinned-views card on /hub/home (`rounded-xl border
        border-stroke bg-white shadow-card`, no max-w applied). The
        only constraint is the parent's px-4 padding.
      */}
      <div className="rounded-xl border border-stroke bg-white shadow-card p-4">
        {showSuggestions && suggestions.length > 0 && (
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
        <div className="flex items-end gap-2 rounded-xl bg-black/[0.04] border border-black/5 shadow-sm px-4 py-3 focus-within:ring-2 focus-within:ring-brand/30 transition-shadow">
          <textarea
            ref={textareaRef}
            rows={2}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your data…"
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-40 leading-relaxed py-1"
            disabled={sending}
          />
          <Button
            onClick={() => canSend && onSubmit()}
            disabled={!canSend}
            size="icon"
            className="bg-brand hover:bg-brand/90 text-white rounded-full shrink-0 disabled:opacity-30 disabled:hover:bg-brand"
          >
            <PaperPlaneTilt size={14} weight="bold" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2 mb-0.5">
          ⌘+Enter to send · Enter for new line
        </p>
      </div>
    </div>
  )
}
