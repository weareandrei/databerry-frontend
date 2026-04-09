'use client'

import { ArrowsClockwise, ArrowSquareOut, DotsThreeVertical } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/components/connections/ConnectionIcon'
import type { CalendlyMeeting } from '@/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { View } from '@/types/view'

function formatTimeRange(startTime: string, endTime: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${fmt(startTime)} – ${fmt(endTime)}`
}

function MeetingRow({ meeting }: { meeting: CalendlyMeeting }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatTimeRange(meeting.startTime, meeting.endTime)}
          </span>
          <span className="text-sm font-medium truncate">{meeting.name}</span>
        </div>
        {meeting.invitees.length > 0 && (
          <p className="text-xs text-left text-muted-foreground mt-0.5 truncate">
            {meeting.invitees.map(inv => inv.name).join(', ')}
          </p>
        )}
        {meeting.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{meeting.description}</p>
        )}
      </div>
      <a
        href={meeting.bookingUri}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        title="Open in Calendly"
      >
        <ArrowSquareOut size={14} weight="thin" />
      </a>
    </div>
  )
}

interface ViewCardListProps {
  view: View
  onUntrack: (id: string) => void
  meetings: CalendlyMeeting[] | null
  loading: boolean
  error: string | null
  historical?: boolean
}

export function ViewCardList({
  view,
  onUntrack,
  meetings,
  loading,
  error,
  historical = false,
}: ViewCardListProps) {
  return (
    <div className="col-span-2 row-span-2 flex flex-col h-full rounded-xl border bg-card px-4 py-3 hover:bg-accent/30 transition-colors overflow-hidden">
      <div className="flex items-start justify-between gap-1 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ConnectionIcon
            type={view.connectionType}
            size={18}
            className="shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate text-left">{view.name}</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5 text-left">Calendly</p>
          </div>
        </div>
        <div className="shrink-0 -mr-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground">
              <DotsThreeVertical size={15} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => onUntrack(view.id)}
                className="text-sm text-destructive focus:text-destructive"
              >
                Untrack
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 mt-2">
        {historical ? (
          <p className="text-xs text-muted-foreground py-2">
            Live data only — unavailable for past dates.
          </p>
        ) : loading ? (
          <div className="flex items-center gap-1.5 py-2">
            <ArrowsClockwise
              size={13}
              weight="thin"
              className="text-muted-foreground animate-spin"
            />
            <span className="text-xs text-muted-foreground">Loading meetings…</span>
          </div>
        ) : error ? (
          <p className="text-xs text-destructive py-2">{error}</p>
        ) : meetings && meetings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No meetings scheduled for today.</p>
        ) : meetings ? (
          meetings.map(meeting => (
            <MeetingRow key={meeting.bookingUri + meeting.startTime} meeting={meeting} />
          ))
        ) : null}
      </div>
    </div>
  )
}
