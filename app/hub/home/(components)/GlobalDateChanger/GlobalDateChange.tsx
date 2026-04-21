'use client'

import 'react-day-picker/style.css'
import { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react'
import { DayPicker } from 'react-day-picker'
import { useState } from 'react'
import type { RootState } from '@/store'
import { setGlobalRange, shiftGlobalRange } from '@/store/slices/uiSlice'
import { parseISODate, toDateStr, today } from '@/utils/dateHelpers'
import { useClickOutside } from '@/hooks/useClickOutside'

function formatLabel(date: string, todayStr: string): string {
  if (date === todayStr) return 'Today'
  const d = parseISODate(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function GlobalDateChange() {
  const dispatch = useDispatch()
  const globalDateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)

  const todayStr = toDateStr(today())
  const isToday = globalDateFrom === todayStr
  const atTodayEnd = globalDateFrom === todayStr

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, () => { if (open) setOpen(false) })

  function handleSelect(date: Date | undefined) {
    if (!date) return
    const str = toDateStr(date)
    dispatch(setGlobalRange({ from: str, to: str }))
    setOpen(false)
  }

  const currentDate = parseISODate(globalDateFrom)

  return (
    <div ref={ref} className="relative flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2 py-2.5 shadow-sm text-sm">
      {/* Left arrow — go back 1 day */}
      <button
        onClick={() => dispatch(shiftGlobalRange(-1))}
        className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        <CaretLeft size={12} weight="bold" />
      </button>

      {/* Centre: label + caret, opens calendar */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 tabular-nums min-w-[130px] justify-center text-[13px] font-medium hover:text-foreground transition-colors"
      >
        {formatLabel(globalDateFrom, todayStr)}
        <CaretDown size={10} weight="bold" className="text-muted-foreground" />
      </button>

      {/* Right arrow — go forward 1 day */}
      <button
        onClick={() => { if (!atTodayEnd) dispatch(shiftGlobalRange(1)) }}
        disabled={atTodayEnd}
        className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <CaretRight size={12} weight="bold" />
      </button>

      {/* Today reset button */}
      {!isToday && (
        <button
          onClick={() => dispatch(setGlobalRange({ from: todayStr, to: todayStr }))}
          className="ml-1 text-xs text-muted-foreground hover:text-foreground border border-black/[0.08] rounded px-1.5 py-0.5 transition-colors"
        >
          Today
        </button>
      )}

      {/* Calendar popup */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl border border-stroke bg-white shadow-card p-3"
          style={{ '--rdp-accent-color': 'var(--c-brand)', '--rdp-accent-background-color': 'rgba(244,103,25,0.12)' } as React.CSSProperties}
        >
          <DayPicker
            mode="single"
            selected={currentDate}
            onSelect={handleSelect}
            disabled={{ after: today() }}
            defaultMonth={currentDate}
          />
        </div>
      )}
    </div>
  )
}
