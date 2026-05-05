'use client'

/**
 * First-load welcome panel for the Ask-AI page. Just orientation —
 * brand icon, headline, one-line subtitle. The example-prompt chips
 * used to live here too, but they've moved into `ChatInput`'s white
 * wrapper so the input area doesn't read as empty when the chat
 * hasn't started yet.
 */

import { Robot } from '@phosphor-icons/react'

export function ChatEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white border border-stroke shadow-card flex items-center justify-center mb-5">
        <Robot size={22} weight="bold" className="text-brand" />
      </div>
      <h2 className="text-xl font-semibold text-grey-darkest mb-2">
        Ask anything about your data
      </h2>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
        I can pull live numbers from your Stripe and Calendly connections —
        across all your projects.
      </p>
    </div>
  )
}
