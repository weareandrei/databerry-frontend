'use client'

import { useState } from 'react'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { SkeletonRows } from '../(components)/WidgetSkeleton'
import { BaseWidget } from '../(components)/BaseWidget'
import { WidgetBody } from '../(components)/WidgetBody'
import { WidgetTileHeader } from '../(components)/WidgetTileHeader'
import { FetchErrorBadge } from '../live-value/LiveValueWidget'
import { ReassignConnectionDialog } from '../(components)/ReassignConnectionDialog'
import { ConnectionMissingError, type CalendlyMeeting } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'
import type { Widget } from '@/types/widget'

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

interface ListWidgetProps {
  view: Widget
  onUntrack?: (id: string) => void
  meetings: CalendlyMeeting[] | null
  loading: boolean
  /**
   * Generic list-fetch error string, or a `ConnectionMissingError` when
   * the underlying connection row is gone (HTTP 410). Same treatment as
   * `LiveValueWidget`: swap the badge for a click-to-reattach affordance and
   * let the dropdown's Reconnect item open `ReassignConnectionDialog`.
   */
  error: ViewResourceError | null
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  /**
   * Same role as on `LiveValueWidget` — fires when the user picks a fresh
   * connection from the reassignment dialog. Lets the parent swap the
   * view in local state so the list re-fetches with the new connection.
   * Optional; without it the dialog still works but the parent won't
   * know to update.
   */
  onConnectionAssigned?: (updated: Widget) => void
  /** See `LiveValueWidget.chromeless`. */
  chromeless?: boolean
  /** See `LiveValueWidget.dense`. Demo-only. */
  dense?: boolean
}

export function ListWidget({
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
  onConnectionAssigned,
  chromeless = false,
  dense = false,
}: ListWidgetProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing

  return (
    <>
    <BaseWidget
      className="col-span-2 row-span-2"
      variant={chromeless ? 'borderless' : 'default'}
      header={
        <WidgetTileHeader
          name={view.name}
          connectionType={view.connectionType}
          connectionLabel="Calendly"
          isDisconnected={isDisconnected}
          isConnectionMissing={isConnectionMissing}
          onReconnect={() => setReassignOpen(true)}
          onUntrack={onUntrack}
          viewId={view.id}
          projectName={projectName}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onPin={onPin}
          isPinned={isPinned}
          dense={dense}
          view={view}
          onUpdated={onConnectionAssigned}
        />
      }
      body={
        <WidgetBody className="mt-2 overflow-y-auto pb-3">
          {historical ? (
            <p className="text-xs text-muted-foreground py-2">
              Live data only — unavailable for past dates.
            </p>
          ) : loading ? (
            <SkeletonRows count={5} rowClassName="h-9" />
          ) : needsReattach ? (
            <div className="py-2">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setReassignOpen(true)
                }}
                className="self-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                aria-label="Attach a connection to this view"
              >
                <FetchErrorBadge message="Connection missing — click to reattach" />
              </button>
            </div>
          ) : error ? (
            <div className="py-2"><FetchErrorBadge message="Couldn't load meetings" /></div>
          ) : meetings && meetings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No meetings scheduled for today.</p>
          ) : meetings ? (
            meetings.map(meeting => (
              <MeetingRow key={meeting.bookingUri + meeting.startTime} meeting={meeting} />
            ))
          ) : null}
        </WidgetBody>
      }
    />

    {/*
      Mounted unconditionally so the dropdown's Reconnect item can open
      the dialog even when the list is healthy. Renders nothing while
      `open` is false.
    */}
    <ReassignConnectionDialog
      view={view}
      open={reassignOpen}
      onOpenChange={setReassignOpen}
      onAssigned={onConnectionAssigned}
    />
    </>
  )
}
