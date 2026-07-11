'use client'

import { useEffect, useState } from 'react'
import { CaretDown, Check, X as XIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { PROJECT_OVERVIEW, PROJECT_SETTINGS, type ProjectSettings } from '@/lib/api'

const CONVERSION_TYPES = ['posthog', 'google_analytics'] as const

interface ProjectConversionsDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectConversionsDialog({
  projectId,
  open,
  onOpenChange,
}: ProjectConversionsDialogProps) {
  const { connections } = useDashboard()
  const [settings, setSettings] = useState<ProjectSettings | null>(null)
  const [events, setEvents] = useState<{ name: string }[] | null>(null)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const eligible = connections.connections.filter(c =>
    CONVERSION_TYPES.includes(c.type as (typeof CONVERSION_TYPES)[number]),
  )

  // Load current project settings when the dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    PROJECT_SETTINGS.get(projectId)
      .then(data => {
        if (!cancelled) setSettings(data)
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load conversion settings')
      })
    return () => {
      cancelled = true
    }
  }, [open, projectId])

  const connectionId = settings?.conversionConnectionId ?? null
  const eventName = settings?.conversionEvent ?? null
  const selectedConnection = eligible.find(c => c.id === connectionId) ?? null

  // Load events for the chosen connection
  useEffect(() => {
    if (!open || !connectionId) {
      setEvents(null)
      return
    }
    let cancelled = false
    setEventsLoading(true)
    PROJECT_OVERVIEW.getConversionEvents(connectionId)
      .then(res => {
        if (!cancelled) setEvents(res.events)
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([])
          toast.error('Failed to load events for this connection')
        }
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, connectionId])

  const saveConnection = async (id: string | null) => {
    setSaving(true)
    try {
      const saved = await PROJECT_SETTINGS.update(projectId, {
        conversionConnectionId: id,
        conversionEvent: null,
      })
      setSettings(saved)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const saveEvent = async (name: string | null) => {
    setSaving(true)
    try {
      const saved = await PROJECT_SETTINGS.update(projectId, { conversionEvent: name })
      setSettings(saved)
      if (name) toast.success('Conversion event saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conversions</DialogTitle>
          <DialogDescription>
            Pick the connection and event that represent a conversion for this project. Used by the
            conversion-rate overlay on the overview chart.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Connection */}
          <div>
            <p className="text-xs text-subtle mb-1.5">Connection</p>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={saving}
                className="flex w-full items-center gap-2 rounded-lg border border-stroke bg-white px-3 py-2.5 text-left text-[13px] font-medium text-foreground hover:bg-surface transition-colors cursor-pointer disabled:opacity-60"
              >
                {selectedConnection ? (
                  <ConnectionIcon
                    type={selectedConnection.type}
                    size={16}
                    className="shrink-0 text-muted-foreground"
                  />
                ) : null}
                <span className="flex-1 truncate">
                  {selectedConnection ? selectedConnection.name : 'Choose a connection…'}
                </span>
                {connectionId && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      void saveConnection(null)
                    }}
                    className="text-subtle hover:text-foreground shrink-0"
                    aria-label="Clear"
                  >
                    <XIcon size={12} weight="bold" />
                  </button>
                )}
                <CaretDown size={10} weight="bold" className="text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[260px]">
                {eligible.length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs text-subtle">
                    No PostHog or Google Analytics connections yet.
                  </DropdownMenuItem>
                ) : (
                  eligible.map(c => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => saveConnection(c.id)}
                      className="gap-2 text-sm"
                    >
                      <span className="w-4 shrink-0">
                        {connectionId === c.id && <Check size={12} weight="bold" />}
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
          </div>

          {/* Event */}
          {connectionId && (
            <div>
              <p className="text-xs text-subtle mb-1.5">Event</p>
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={saving || eventsLoading}
                  className="flex w-full items-center gap-2 rounded-lg border border-stroke bg-white px-3 py-2.5 text-left text-[13px] font-medium text-foreground hover:bg-surface transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span className="flex-1 truncate">
                    {eventsLoading
                      ? 'Loading events…'
                      : eventName
                        ? eventName
                        : 'Choose an event…'}
                  </span>
                  {eventName && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        void saveEvent(null)
                      }}
                      className="text-subtle hover:text-foreground shrink-0"
                      aria-label="Clear"
                    >
                      <XIcon size={12} weight="bold" />
                    </button>
                  )}
                  <CaretDown size={10} weight="bold" className="text-muted-foreground shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="min-w-[260px] max-h-72 overflow-y-auto"
                >
                  {events === null || eventsLoading ? (
                    <DropdownMenuItem disabled className="text-xs text-subtle">
                      Loading…
                    </DropdownMenuItem>
                  ) : events.length === 0 ? (
                    <DropdownMenuItem disabled className="text-xs text-subtle">
                      No events found for this connection.
                    </DropdownMenuItem>
                  ) : (
                    events.map(e => (
                      <DropdownMenuItem
                        key={e.name}
                        onClick={() => saveEvent(e.name)}
                        className="gap-2 text-sm"
                      >
                        <span className="w-4 shrink-0">
                          {eventName === e.name && <Check size={12} weight="bold" />}
                        </span>
                        <span className="flex-1 truncate">{e.name}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
