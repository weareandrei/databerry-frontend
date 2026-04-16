'use client'

import 'react-day-picker/style.css'
import { useState, useRef, useEffect } from 'react'
import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react'
import { DayPicker } from 'react-day-picker'
import type { DateRange } from 'react-day-picker'
import { addDays, formatDateRange, differenceInDays, toDateStr } from '@/utils/dateHelpers'

function todayDate(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface ProjectDateRangePickerProps {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
}

type Preset = {
  label: string
  fn: () => { start: Date; end: Date }
}

const PRESETS: Preset[] = [
  {
    label: 'Today',
    fn: () => { const t = todayDate(); return { start: t, end: t } },
  },
  {
    label: 'Yesterday',
    fn: () => { const t = todayDate(); return { start: addDays(t, -1), end: addDays(t, -1) } },
  },
  {
    label: 'Last 7 days',
    fn: () => { const t = todayDate(); return { start: addDays(t, -6), end: t } },
  },
  {
    label: 'Last 30 days',
    fn: () => { const t = todayDate(); return { start: addDays(t, -29), end: t } },
  },
  {
    label: 'This month',
    fn: () => { const t = todayDate(); return { start: new Date(t.getFullYear(), t.getMonth(), 1), end: t } },
  },
]

export function ProjectDateRangePicker({
  startDate,
  endDate,
  onChange,
}: ProjectDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<DateRange | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)

  const today = todayDate()
  const todayMax = todayStr()

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

  const rangeWidth = Math.max(1, differenceInDays(endDate, startDate) + 1)

  const shiftBack = () => {
    onChange(addDays(startDate, -rangeWidth), addDays(endDate, -rangeWidth))
  }

  const shiftForward = () => {
    const newEnd = addDays(endDate, rangeWidth)
    if (toDateStr(newEnd) > todayMax) return
    onChange(addDays(startDate, rangeWidth), newEnd)
  }

  const canGoForward = toDateStr(addDays(endDate, rangeWidth)) <= todayMax

  function handleCalendarSelect(range: DateRange | undefined) {
    setSelecting(range)
    if (range?.from && range?.to) {
      onChange(range.from, range.to)
      setOpen(false)
      setSelecting(undefined)
    }
  }

  return (
    <div ref={ref} className="relative flex items-center gap-0.5">
      <button
        onClick={shiftBack}
        className="flex items-center justify-center w-6 h-6 rounded text-grey-light hover:text-grey-dark hover:bg-hover-fill transition-colors"
      >
        <CaretLeft size={11} weight="bold" />
      </button>

      <button
        onClick={() => { setOpen(v => !v); setSelecting(undefined) }}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-hover-fill transition-colors text-xs text-grey-dark"
      >
        <span className="tabular-nums">{formatDateRange(startDate, endDate)}</span>
        <CaretDown size={10} weight="bold" className="text-grey-light" />
      </button>

      <button
        onClick={shiftForward}
        disabled={!canGoForward}
        className="flex items-center justify-center w-6 h-6 rounded text-grey-light hover:text-grey-dark hover:bg-hover-fill transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <CaretRight size={11} weight="bold" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl border border-stroke bg-white shadow-card"
          style={{ '--rdp-accent-color': 'var(--c-brand)', '--rdp-accent-background-color': 'rgba(244,103,25,0.12)' } as React.CSSProperties}
        >
          <DayPicker
            mode="range"
            selected={selecting ?? { from: startDate, to: endDate }}
            onSelect={handleCalendarSelect}
            disabled={{ after: today }}
            defaultMonth={endDate}
          />

          {/* Presets below the calendar */}
          <div className="border-t border-stroke px-3 py-2 flex flex-wrap gap-1.5">
            {PRESETS.map(preset => {
              const { start, end } = preset.fn()
              const isActive =
                toDateStr(start) === toDateStr(startDate) &&
                toDateStr(end) === toDateStr(endDate)
              return (
                <button
                  key={preset.label}
                  onClick={() => { onChange(start, end); setOpen(false) }}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand/10 text-brand font-medium'
                      : 'text-grey-dark hover:bg-hover-fill'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
