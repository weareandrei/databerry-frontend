'use client'

import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { setGlobalDateMode } from '@/store/slices/uiSlice'
import type { GlobalDateMode } from '@/utils/dateHelpers'
import { EVENT, trackEvent } from '@/lib/posthog'
import { cn } from '@/lib/utils'

const MODES: ReadonlyArray<{ value: GlobalDateMode; label: string }> = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
]

export function GlobalDateModeDropdown() {
  const dispatch = useDispatch()
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)

  return (
    <div
      className="flex h-8 items-center rounded-lg border border-stroke bg-surface p-0.5 shadow-sm lg:h-10 lg:p-1"
      role="radiogroup"
      aria-label="Date granularity"
    >
      {MODES.map(m => {
        const active = mode === m.value
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (m.value !== mode) {
                trackEvent(EVENT.DATE_MODE_CHANGED, {
                  mode: m.value,
                  previousMode: mode,
                })
              }
              dispatch(setGlobalDateMode(m.value))
            }}
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
