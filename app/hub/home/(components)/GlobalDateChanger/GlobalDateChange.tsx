'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { RootState } from '@/store'
import { shiftGlobalPeriod } from '@/store/slices/uiSlice'
import {
  formatDailyLabel,
  formatMonthlyLabel,
  formatWeeklyLabel,
  toDateStr,
  today,
} from '@/utils/dateHelpers'

export function GlobalDateChange() {
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
    if (mode === 'weekly') {
      const parts = main.split(' → ')
      return (
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <span>{parts[0]}</span>
          <ArrowRight size={12} weight="bold" className="text-subtle" />
          <span>{parts[1]}</span>
        </span>
      )
    }

    return <span className="font-semibold text-foreground">{main}</span>
  }

  return (
    <div className="flex h-8 items-center gap-0.5 rounded-lg border border-stroke bg-white px-1.5 text-xs shadow-sm lg:h-10 lg:px-2 lg:text-sm">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => dispatch(shiftGlobalPeriod(-1))}
        aria-label="Previous period"
        className="size-6 text-foreground hover:bg-hover-fill lg:size-7"
      >
        <CaretLeft size={12} weight="bold" />
      </Button>

      <div className="flex items-center gap-1 tabular-nums px-1 text-xs lg:px-1.5 lg:text-[13px]">
        {renderMain()}
        {year ? <span className="font-normal text-subtle">{year}</span> : null}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => { if (!atTodayEnd) dispatch(shiftGlobalPeriod(1)) }}
        disabled={atTodayEnd}
        aria-label="Next period"
        className="size-6 text-foreground hover:bg-hover-fill disabled:text-subtle disabled:opacity-40 lg:size-7"
      >
        <CaretRight size={12} weight="bold" />
      </Button>
    </div>
  )
}
