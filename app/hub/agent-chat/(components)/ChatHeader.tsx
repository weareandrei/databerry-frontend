'use client'

/**
 * Slim top bar for the Ask-AI page. Visually consistent with the
 * home page's top bar (`shrink-0 … pt-6 pb-2 pr-6 bg-main`). The
 * "Clear chat" button is hidden until there's actually something
 * to clear.
 */

import { Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  hasMessages: boolean
  onClear: () => void
}

export function ChatHeader({ hasMessages, onClear }: ChatHeaderProps) {
  return (
    <div className="shrink-0 flex items-center justify-between gap-4 pt-6 pb-3 pr-6">
      <div>
        <h1 className="text-lg font-semibold text-grey-darkest leading-tight">
          Ask AI
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ask anything about your projects and connected data.
        </p>
      </div>
      {hasMessages && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="gap-1.5"
        >
          <Trash size={12} weight="bold" />
          Clear chat
        </Button>
      )}
    </div>
  )
}
