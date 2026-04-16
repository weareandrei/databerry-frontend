'use client'

import 'react-day-picker/style.css'
import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react'
import { DayPicker } from 'react-day-picker'
import type { DateRange } from 'react-day-picker'
import type { RootState } from '@/store'
import { setGlobalRange, shiftGlobalRange } from '@/store/slices/uiSlice'
import { parseISODate, formatDateRange, toDateStr } from '@/utils/dateHelpers'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatLabel(from: string, to: string): string {
  const today = todayISO()
  if (from === today && to === today) return 'Today'
  return formatDateRange(parseISODate(from), parseISODate(to))
}

export function GlobalDateChange() {
  const dispatch = useDispatch()
  const globalDateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const globalDateTo   = useSelector((s: RootState) => s.ui.globalDateTo)

  const today = todayISO()
  const isToday = globalDateFrom === today && globalDateTo === today
  const atTodayEnd = globalDateTo === today

  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<DateRange | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSelecting(undefined)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleSelect(range: DateRange | undefined) {
    setSelecting(range)
    if (range?.from && range?.to) {
      dispatch(setGlobalRange({ from: toDateStr(range.from), to: toDateStr(range.to) }))
      setOpen(false)
      setSelecting(undefined)
    }
  }

  const currentFrom = parseISODate(globalDateFrom)
  const currentTo   = parseISODate(globalDateTo)
  const todayDate   = parseISODate(today)

  return (
    <div ref={ref} className="relative flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2 py-2.5 shadow-sm text-sm">
      {/* Left arrow — shift range back 1 day */}
      <button
        onClick={() => dispatch(shiftGlobalRange(-1))}
        className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        <CaretLeft size={12} weight="bold" />
      </button>

      {/* Centre: label + caret, opens calendar */}
      <button
        onClick={() => { setOpen(v => !v); setSelecting(undefined) }}
        className="flex items-center gap-1 tabular-nums min-w-[130px] justify-center text-[13px] font-medium hover:text-foreground transition-colors"
      >
        {formatLabel(globalDateFrom, globalDateTo)}
        <CaretDown size={10} weight="bold" className="text-muted-foreground" />
      </button>

      {/* Right arrow — shift range forward 1 day */}
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
          onClick={() => dispatch(setGlobalRange({ from: today, to: today }))}
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
            mode="range"
            selected={selecting ?? { from: currentFrom, to: currentTo }}
            onSelect={handleSelect}
            disabled={{ after: todayDate }}
            defaultMonth={currentTo}
          />
        </div>
      )}
    </div>
  )
}
