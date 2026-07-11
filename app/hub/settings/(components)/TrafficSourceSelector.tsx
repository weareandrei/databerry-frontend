'use client'

import { useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDashboard } from '@/contexts/DashboardContext'
import { useUserSettings } from '@/contexts/UserSettingsContext'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'

const TRAFFIC_TYPES = ['google_analytics', 'posthog'] as const

export function TrafficSourceSelector() {
  const { connections } = useDashboard()
  const { settings, updateSettings } = useUserSettings()
  const [saving, setSaving] = useState(false)

  const eligible = connections.connections.filter(c =>
    TRAFFIC_TYPES.includes(c.type as (typeof TRAFFIC_TYPES)[number]),
  )

  const selectedId = settings?.preferredTrafficConnectionId ?? null
  const selected = eligible.find(c => c.id === selectedId) ?? null

  const label = selected
    ? selected.name
    : 'Auto (prefer Google Analytics)'

  const save = async (id: string | null) => {
    setSaving(true)
    try {
      await updateSettings({ preferredTrafficConnectionId: id })
      toast.success('Traffic source saved')
    } catch {
      // toast handled inside context
    } finally {
      setSaving(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={saving}
        // `max-w-sm` (384 px) caps the trigger so it doesn't stretch
        // edge-to-edge on the now-wider Settings page. Still grows
        // with `w-full` on narrow viewports.
        className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-stroke bg-white px-3 py-2.5 text-left text-[13px] font-medium text-foreground hover:bg-surface transition-colors cursor-pointer disabled:opacity-60"
      >
        {selected ? (
          <ConnectionIcon type={selected.type} size={16} className="shrink-0 text-muted-foreground" />
        ) : null}
        <span className="flex-1 truncate">{label}</span>
        <CaretDown size={10} weight="bold" className="text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width,260px)] min-w-[260px]">
        <DropdownMenuItem onClick={() => save(null)} className="gap-2 text-sm">
          <span className="w-4 shrink-0">
            {selectedId === null && <Check size={12} weight="bold" />}
          </span>
          <span className="flex-1">Auto (prefer Google Analytics)</span>
        </DropdownMenuItem>
        {eligible.length === 0 ? (
          <DropdownMenuItem disabled className="text-xs text-subtle">
            No Google Analytics or PostHog connections yet.
          </DropdownMenuItem>
        ) : (
          eligible.map(c => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => save(c.id)}
              className="gap-2 text-sm"
            >
              <span className="w-4 shrink-0">
                {selectedId === c.id && <Check size={12} weight="bold" />}
              </span>
              <ConnectionIcon type={c.type} size={14} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-[10px] text-subtle shrink-0">
                {CONNECTION_DISPLAY_NAMES[c.type] ?? c.type}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
