'use client'

import { useDispatch, useSelector } from 'react-redux'
import { CaretDown } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RootState } from '@/store'
import { setGlobalDateMode } from '@/store/slices/uiSlice'
import type { GlobalDateMode } from '@/utils/dateHelpers'

const LABELS: Record<GlobalDateMode, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

const ORDER: GlobalDateMode[] = ['daily', 'weekly', 'monthly']

export function GlobalDateModeDropdown() {
  const dispatch = useDispatch()
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 shadow-sm text-[13px] font-medium text-grey-darkest hover:text-foreground transition-colors cursor-pointer">
        <span>{LABELS[mode]}</span>
        <CaretDown size={10} weight="bold" className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {ORDER.map(m => (
          <DropdownMenuItem
            key={m}
            onClick={() => dispatch(setGlobalDateMode(m))}
            className="text-sm"
          >
            {LABELS[m]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
