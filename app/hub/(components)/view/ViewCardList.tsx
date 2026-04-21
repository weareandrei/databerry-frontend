'use client'

import { ArrowsClockwise, ArrowSquareOut } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import type { CalendlyMeeting } from '@/lib/api'
import type { View } from '@/types/view'

function formatTimeRange(startTime: string, endTime: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${fmt(startTime)} – ${fmt(endTime)}`
}

function MeetingRow({ meeting }: { meeting: CalendlyMeeting }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0 border-black/[0.06]">
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
        <ArrowSquareOut size={14} weight="bold" />
      </a>
    </div>
  )
}

interface ViewCardListProps {
  view: View
  onUntrack?: (id: string) => void
  meetings: CalendlyMeeting[] | null
  loading: boolean
  error: string | null
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
}

export function ViewCardList({
  view,
  onUntrack,
  meetings,
  loading,
  error,
  historical = false,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
}: ViewCardListProps) {
  return (
    <ViewWrapper className="col-span-2 row-span-2">
      <ViewHeader
        name={view.name}
        connectionType={view.connectionType}
        connectionLabel="Calendly"
        onUntrack={onUntrack}
        viewId={view.id}
        projectName={projectName}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onPin={onPin}
        isPinned={isPinned}
      />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-3 mt-2">
        {historical ? (
          <p className="text-xs text-muted-foreground py-2">
            Live data only — unavailable for past dates.
          </p>
        ) : loading ? (
          <div className="flex items-center gap-1.5 py-2">
            <ArrowsClockwise size={13} weight="bold" className="text-muted-foreground animate-spin" />
            <span className="text-xs text-muted-foreground">Loading meetings…</span>
          </div>
        ) : !view.connectionId ? (
          <div className="py-2"><FetchErrorBadge message="No connection" /></div>
        ) : error ? (
          <div className="py-2"><FetchErrorBadge message="Fetch failed" /></div>
        ) : meetings && meetings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No meetings scheduled for today.</p>
        ) : meetings ? (
          meetings.map(meeting => (
            <MeetingRow key={meeting.bookingUri + meeting.startTime} meeting={meeting} />
          ))
        ) : null}
      </div>
    </ViewWrapper>
  )
}
