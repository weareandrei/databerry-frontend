'use client'

import { CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  formatDailyLabel,
  formatMonthlyLabel,
  formatWeeklyLabel,
} from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import { useDemoContext } from './context/DemoContext'
import type { DateMode } from './context/DemoContext'

const TODAY_ISO = '2026-04-08'

const MODES: ReadonlyArray<{ value: DateMode; label: string }> = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
]

export function DemoGlobalDateChange() {
  const { globalDate, shiftGlobalPeriod } = useDemoContext()
  const atTodayEnd = globalDate.to === TODAY_ISO

  let main = ''
  let year = ''
  if (globalDate.mode === 'daily') {
    ;({ main, year } = formatDailyLabel(globalDate.from))
  } else if (globalDate.mode === 'weekly') {
    ;({ main, year } = formatWeeklyLabel(globalDate.from, globalDate.to))
  } else {
    ;({ main, year } = formatMonthlyLabel(globalDate.from))
  }

  const renderMain = () => {
    if (globalDate.mode === 'weekly') {
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
        onClick={() => shiftGlobalPeriod(-1)}
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
        onClick={() => {
          if (!atTodayEnd) shiftGlobalPeriod(1)
        }}
        disabled={atTodayEnd}
        aria-label="Next period"
        className="size-6 text-foreground hover:bg-hover-fill disabled:text-subtle disabled:opacity-40 lg:size-7"
      >
        <CaretRight size={12} weight="bold" />
      </Button>
    </div>
  )
}

export function DemoGlobalDateModeDropdown() {
  const { globalDate, setGlobalDateMode } = useDemoContext()

  return (
    <div
      className="flex h-8 items-center rounded-lg border border-stroke bg-surface p-0.5 shadow-sm lg:h-10 lg:p-1"
      role="radiogroup"
      aria-label="Date granularity"
    >
      {MODES.map(m => {
        const active = globalDate.mode === m.value
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setGlobalDateMode(m.value)}
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
