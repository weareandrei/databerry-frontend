'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react'
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
      {/* Left arrow */}
      <button
        onClick={() => dispatch(shiftGlobalPeriod(-1))}
        className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <CaretLeft size={12} weight="bold" />
      </button>

      {/* Label */}
      <div className="flex items-center gap-1.5 tabular-nums px-1.5 text-[13px] font-medium text-grey-darkest">
        {renderMain()}
        <span className="font-normal text-grey-light">{year}</span>
      </div>

      {/* Reset pill */}
      {!onCurrentPeriod && (
        <button
          onClick={() => dispatch(resetGlobalToCurrent())}
          className="ml-1 text-xs text-muted-foreground hover:text-foreground border border-black/[0.08] rounded px-1.5 py-0.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          {resetLabel}
        </button>
      )}

      {/* Right arrow */}
      <button
        onClick={() => { if (!atTodayEnd) dispatch(shiftGlobalPeriod(1)) }}
        disabled={atTodayEnd}
        className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <CaretRight size={12} weight="bold" />
      </button>
    </div>
  )
}
