'use client'

/**
 * Bouncing-dot typing indicator shown while the assistant is
 * generating a reply. Mirrors the previous indicator's animation but
 * lives in its own component so the page doesn't get cluttered.
 */

export function ChatTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/[0.04]">
        <span className="w-1.5 h-1.5 rounded-full bg-subtle animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-subtle animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-subtle animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
