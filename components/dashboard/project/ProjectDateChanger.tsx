'use client'

import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { addDays, formatDateLabel, isSameDay } from '@/utils/dateHelpers'

interface ProjectDateChangerProps {
  date: Date
  onChange: (d: Date) => void
}

export function ProjectDateChanger({ date, onChange }: ProjectDateChangerProps) {
  const isToday = isSameDay(date, new Date())

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
      >
        <CaretLeft size={12} weight="bold" />
      </button>
      <span className="text-xs text-muted-foreground min-w-[90px] text-center tabular-nums">
        {formatDateLabel(date)}
      </span>
      <button
        onClick={() => { if (!isToday) onChange(addDays(date, 1)) }}
        disabled={isToday}
        className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <CaretRight size={12} weight="bold" />
      </button>
    </div>
  )
}
