'use client'

import type { DateMode } from '@/types/dates'
import { cn } from '@/lib/utils'

const MODES: ReadonlyArray<{ value: DateMode; label: string }> = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
]

export function DateModeControls({
  value,
  onChange,
  className,
}: {
  value: DateMode
  onChange: (mode: DateMode) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-8 items-center rounded-lg border border-stroke bg-surface p-0.5 shadow-sm lg:h-10 lg:p-1',
        className,
      )}
      role="radiogroup"
      aria-label="Date granularity"
    >
      {MODES.map(m => {
        const active = value === m.value
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.value)}
            className={cn(
              'h-full min-w-[44px] rounded-sm px-2 text-xs transition-colors cursor-pointer lg:min-w-[52px] lg:px-3 lg:text-sm',
              active
                ? 'bg-white font-medium text-foreground shadow-control'
                : 'font-normal text-subtle hover:text-muted-foreground',
            )}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
