'use client'

import { useState } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import { ConnectionMissingError, type PosthogUserRow } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'
import type { View } from '@/types/view'

// `mm:ss` for sub-hour, `1h 4m` after that — matches how PostHog itself
// surfaces session length in its UI. Doesn't bother with day-scale spans
// because solo founders won't see those for a single user/session.
function formatSessionTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—'
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) {
    const m = Math.floor(sec / 60)
    const s = Math.round(sec % 60)
    return s === 0 ? `${m}m` : `${m}m ${s}s`
  }
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// Small relative-time formatter — keeps the row dense (no full ISO) while
// still being precise enough for "is this recent?" scanning. We don't pull
// in dayjs/date-fns just for this; the math is straightforward.
function formatRelative(iso: string): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return iso
  const deltaSec = Math.max(0, (Date.now() - ms) / 1000)
  if (deltaSec < 90) return 'just now'
  if (deltaSec < 3600) return `${Math.round(deltaSec / 60)}m ago`
  if (deltaSec < 86400) return `${Math.round(deltaSec / 3600)}h ago`
  return `${Math.round(deltaSec / 86400)}d ago`
}

// Show the first 8 chars of the distinct_id — full ones are typically
// 36-char UUIDs which would break the row layout. The full id is in the
// `title` attribute for hover-inspect.
function shortPseudoId(id: string): string {
  if (!id) return 'anonymous'
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

function UserRow({ user }: { user: PosthogUserRow }) {
  const sourceLabel = user.source ? user.source : 'direct'
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0 border-black/[0.06]">
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate font-mono"
          title={user.pseudoId}
        >
          {shortPseudoId(user.pseudoId)}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          via {sourceLabel} · {formatSessionTime(user.sessionSec)} active
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatRelative(user.lastSeen)}
      </span>
    </div>
  )
}

interface ViewCardUsersProps {
  view: View
  onUntrack?: (id: string) => void
  users: PosthogUserRow[] | null
  loading: boolean
  error: ViewResourceError | null
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  onConnectionAssigned?: (updated: View) => void
}

export function ViewCardUsers({
  view,
  onUntrack,
  users,
  loading,
  error,
  historical = false,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
}: ViewCardUsersProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing

  return (
    <>
      <ViewWrapper className="col-span-2 row-span-2">
        <ViewHeader
          name={view.name}
          connectionType={view.connectionType}
          connectionLabel="PostHog"
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
        />

        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-3 mt-2">
          {historical ? (
            <p className="text-xs text-muted-foreground py-2">
              Live data only — unavailable for past dates.
            </p>
          ) : loading ? (
            <div className="flex items-center gap-1.5 py-2">
              <ArrowsClockwise size={13} weight="bold" className="text-muted-foreground animate-spin" />
              <span className="text-xs text-muted-foreground">Loading users…</span>
            </div>
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
            <div className="py-2"><FetchErrorBadge message="Couldn't load users" /></div>
          ) : users && users.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No users seen in this period yet.
            </p>
          ) : users ? (
            users.map(u => <UserRow key={u.pseudoId} user={u} />)
          ) : null}
        </div>
      </ViewWrapper>

      <ReassignConnectionDialog
        view={view}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onAssigned={onConnectionAssigned}
      />
    </>
  )
}
