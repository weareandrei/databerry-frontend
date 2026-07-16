'use client'

import { cn } from '@/lib/utils'
import type { TimelineAxisTick } from '../types'

export function TimelineAxisMark({
  tick,
  onDayClick,
  fullCell,
}: {
  tick: TimelineAxisTick
  onDayClick?: (day: Date) => void
  /** Fill the full day row in week/month sidebar (edge-to-edge hover). */
  fullCell?: boolean
}) {
  if (tick.variant === 'dash') {
    return (
      <span
        aria-hidden
        className="block h-px w-5 rounded-full bg-stroke/70"
      />
    )
  }

  const label = tick.accentLabel ? (
    <div className="flex flex-col items-center leading-none">
      <span className="text-lg font-semibold text-primary">
        {tick.accentLabel}
      </span>
      <span className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
        {tick.primaryLabel}
      </span>
    </div>
  ) : (
    <span className="text-xl font-semibold tabular-nums text-foreground">
      {tick.primaryLabel}
    </span>
  )

  if (onDayClick && tick.at) {
    return (
      <button
        type="button"
        onClick={() => onDayClick(tick.at!)}
        className={cn(
          'flex h-full w-full cursor-pointer transition-colors hover:bg-hover-fill',
          fullCell
            ? 'items-start justify-center rounded-none pt-3'
            : 'items-center justify-center rounded-md px-0.5',
        )}
        aria-label={`View ${tick.accentLabel ?? ''} ${tick.primaryLabel}`.trim()}
      >
        {label}
      </button>
    )
  }

  return label
}
