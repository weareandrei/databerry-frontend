'use client'

import { type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ExpandableTimelineCardProps {
  /** Left accent bar color. */
  color: string
  expanded: boolean
  onToggle: () => void
  header: ReactNode
  /** Extra content below the header when expanded. */
  expandedBody?: ReactNode
  maxWidth?: number
  /** Min height for the expanded overlay (e.g. range nodes). */
  expandedMinHeight?: number
  headerClassName?: string
  /** Fixed collapsed height — card won't stretch to fill range slots. */
  collapsedHeight?: number
}

function stopBubble(fn: () => void) {
  return (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    fn()
  }
}

function onExpandedKeyDown(e: KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    e.stopPropagation()
    fn()
  }
}

/**
 * Shared expand/collapse chrome for timeline node cards. Domain wrappers
 * supply header (and optional expanded body) content; this handles layout,
 * the accent bar, and the collapsed → overlay expand interaction.
 */
export function ExpandableTimelineCard({
  color,
  expanded,
  onToggle,
  header,
  expandedBody,
  maxWidth,
  expandedMinHeight,
  headerClassName,
  collapsedHeight,
}: ExpandableTimelineCardProps) {
  const body = (
    <div className={cn('min-w-0 flex-1 px-2.5 py-2', headerClassName)}>
      {header}
      {expanded && expandedBody}
    </div>
  )

  return (
    <div className="relative h-full w-full" style={maxWidth != null ? { maxWidth } : undefined}>
      <button
        type="button"
        onClick={stopBubble(onToggle)}
        className={cn(
          'flex w-full overflow-hidden rounded-lg border bg-white text-left transition-shadow cursor-pointer',
          collapsedHeight != null ? 'h-auto' : 'h-full',
          expanded
            ? 'invisible border-transparent shadow-none'
            : 'border-stroke shadow-pill hover:shadow-card',
        )}
        style={collapsedHeight != null && !expanded ? { minHeight: collapsedHeight } : undefined}
      >
        <span
          aria-hidden
          className="w-1 shrink-0 self-stretch"
          style={{ backgroundColor: color }}
        />
        {body}
      </button>

      {expanded && (
        <div
          role="button"
          tabIndex={0}
          onClick={stopBubble(onToggle)}
          onKeyDown={e => onExpandedKeyDown(e, onToggle)}
          className="absolute top-0 left-0 z-20 flex w-full cursor-pointer overflow-hidden rounded-lg border border-foreground/20 bg-white text-left shadow-card"
          style={{
            maxWidth,
            minHeight: expandedMinHeight,
          }}
        >
          <span
            aria-hidden
            className="w-1 shrink-0 self-stretch"
            style={{ backgroundColor: color }}
          />
          {body}
        </div>
      )}
    </div>
  )
}
