'use client'

/**
 * Bottom-sheet replacement for the desktop's two separate date
 * controls (`<GlobalDateModeDropdown>` + `<GlobalDateChange>`).
 *
 * Mobile UX rationale: a phone top bar can't fit two dropdowns +
 * a date range nav comfortably. The user's design folds all three
 * controls into one button labelled with the current mode
 * ("Monthly", etc.), tapping which opens this sheet.
 *
 * State lives in Redux (`uiSlice`) — same actions desktop uses:
 * `setGlobalDateMode`, `shiftGlobalPeriod`. No new state primitives.
 */

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { Button } from '@/components/ui/button'
import type { RootState } from '@/store'
import { EVENT, trackEvent } from '@/lib/posthog'
import {
  setGlobalDateMode,
  shiftGlobalPeriod,
} from '@/store/slices/uiSlice'
import {
  formatDailyLabel,
  formatMonthlyLabel,
  formatWeeklyLabel,
  toDateStr,
  today,
} from '@/utils/dateHelpers'

interface MobileDateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MODES: Array<{ id: 'daily' | 'weekly' | 'monthly'; label: string }> = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

export function MobileDateSheet({ open, onOpenChange }: MobileDateSheetProps) {
  const dispatch = useDispatch()
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)
  const from = useSelector((s: RootState) => s.ui.globalDateFrom)
  const to = useSelector((s: RootState) => s.ui.globalDateTo)

  // Defer `today()` until after hydration. Pre-mount we disable the
  // forward arrow so server/client agree on first paint.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const todayStr = mounted ? toDateStr(today()) : ''
  const atTodayEnd = mounted ? to === todayStr : true

  // Same label-formatting logic as `<GlobalDateChange>`.
  let main = ''
  let year = ''
  if (mode === 'daily') {
    ;({ main, year } = formatDailyLabel(from))
  } else if (mode === 'weekly') {
    ;({ main, year } = formatWeeklyLabel(from, to))
  } else {
    ;({ main, year } = formatMonthlyLabel(from))
  }

  const renderMain = () => {
    if (mode !== 'weekly') return <span>{main}</span>
    const parts = main.split(' → ')
    return (
      <span className="flex items-center gap-1.5">
        <span>{parts[0]}</span>
        <ArrowRight size={12} weight="bold" className="text-muted-foreground" />
        <span>{parts[1]}</span>
      </span>
    )
  }

  return (
    <BottomDialog open={open} onOpenChange={onOpenChange}>
      <BottomDialog.Page title="Date range">
        <div className="space-y-5">
          {/* Mode selector — segmented control. The desktop version
              is a dropdown; on a phone, three buttons fit the width
              comfortably and don't need a tap-to-expand step. */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-subtle">
              Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <Button
                  key={m.id}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (m.id !== mode) {
                      trackEvent(EVENT.DATE_MODE_CHANGED, {
                        mode: m.id,
                        previousMode: mode,
                      })
                    }
                    dispatch(setGlobalDateMode(m.id))
                  }}
                  className={`h-auto py-2.5 text-sm ${
                    mode === m.id ? 'border-foreground bg-muted' : ''
                  }`}
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Current period nav — mirror of `<GlobalDateChange>`. */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-subtle">
              {mode === 'daily' ? 'Day' : mode === 'weekly' ? 'Week' : 'Month'}
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-stroke bg-white px-2 py-2.5 shadow-sm text-sm">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => dispatch(shiftGlobalPeriod(-1))}
                aria-label="Previous period"
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <CaretLeft size={14} weight="bold" />
              </Button>

              <div className="flex-1 flex items-center justify-center gap-1.5 tabular-nums px-1.5 text-sm font-medium text-foreground">
                {renderMain()}
                <span className="font-normal text-subtle">{year}</span>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => { if (!atTodayEnd) dispatch(shiftGlobalPeriod(1)) }}
                disabled={atTodayEnd}
                aria-label="Next period"
                className="size-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <CaretRight size={14} weight="bold" />
              </Button>
            </div>
          </div>
        </div>
      </BottomDialog.Page>
    </BottomDialog>
  )
}
