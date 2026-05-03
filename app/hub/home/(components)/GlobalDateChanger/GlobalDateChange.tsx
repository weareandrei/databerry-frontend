'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { RootState } from '@/store'
import { resetGlobalToCurrent, shiftGlobalPeriod } from '@/store/slices/uiSlice'
import {
  formatDailyLabel,
  formatMonthlyLabel,
  formatWeeklyLabel,
  periodBoundaries,
  toDateStr,
  today,
} from '@/utils/dateHelpers'

export function GlobalDateChange() {
  const dispatch = useDispatch()
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)
  const from = useSelector((s: RootState) => s.ui.globalDateFrom)
  const to = useSelector((s: RootState) => s.ui.globalDateTo)

  // Defer `today()` until after hydration. The Redux store is a module-level
  // singleton in Next.js App Router, so `globalDateFrom`/`globalDateTo` may
  // already encode a stale boot-time date from the server. If we compute
  // `now`/`currentBoundaries` synchronously on first render, the server's
  // "today" can disagree with the client's "today" — flipping `onCurrentPeriod`
  // and conditionally rendering the reset pill, which trips the React 19
  // hydration-mismatch error. Pre-mount we render the "neutral" state
  // (no reset pill, forward arrow disabled) which is identical on both sides.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const now = mounted ? today() : null
  const todayStr = now ? toDateStr(now) : ''
  const currentBoundaries = now ? periodBoundaries(mode, now) : null
  const onCurrentPeriod = currentBoundaries
    ? from === currentBoundaries.from && to === currentBoundaries.to
    : true
  const atTodayEnd = mounted ? to === todayStr : true

  // Select label parts based on mode
  let main = ''
  let year = ''
  if (mode === 'daily') {
    ;({ main, year } = formatDailyLabel(from))
  } else if (mode === 'weekly') {
    ;({ main, year } = formatWeeklyLabel(from, to))
  } else {
    ;({ main, year } = formatMonthlyLabel(from))
  }

  const resetLabel = mode === 'monthly' ? 'Go to this month' : 'Today'

  // Replace the `→` literal in the weekly main with an icon span
  const renderMain = () => {
    if (mode !== 'weekly') return <span>{main}</span>
    const parts = main.split(' → ')
    return (
      <span className="flex items-center gap-1.5">
        <span>{parts[0]}</span>
        <ArrowRight size={12} weight="bold" className="text-grey-dark" />
        <span>{parts[1]}</span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2 py-2.5 shadow-sm text-sm">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => dispatch(shiftGlobalPeriod(-1))}
        aria-label="Previous period"
        className="size-5 text-muted-foreground hover:text-foreground"
      >
        <CaretLeft size={12} weight="bold" />
      </Button>

      <div className="flex items-center gap-1.5 tabular-nums px-1.5 text-[13px] font-medium text-grey-darkest">
        {renderMain()}
        <span className="font-normal text-grey-light">{year}</span>
      </div>

      {!onCurrentPeriod && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(resetGlobalToCurrent())}
          className="ml-1 h-auto rounded border-black/[0.08] px-1.5 py-0.5 text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          {resetLabel}
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => { if (!atTodayEnd) dispatch(shiftGlobalPeriod(1)) }}
        disabled={atTodayEnd}
        aria-label="Next period"
        className="size-5 text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <CaretRight size={12} weight="bold" />
      </Button>
    </div>
  )
}
