'use client'

import { useState } from 'react'
import { ArrowsClockwise, User, Globe } from '@phosphor-icons/react'
import * as Flags from 'country-flag-icons/react/3x2'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

// Show the first 8 chars of the distinct_id when it's not a human-
// readable handle. Full ones are typically 36-char UUIDs which would
// break the row layout. The full id always lives in the subline for
// cross-referencing in PostHog.
function shortPseudoId(id: string): string {
  if (!id) return 'anonymous'
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}…`
}

function looksLikeEmail(s: string): boolean {
  // Cheap email detector — good enough to decide between "show this
  // verbatim as a name" and "show the short ID + generic icon".
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

/**
 * Compute initials for the avatar. PostHog gives us a `distinct_id`
 * which is sometimes an email (when the app calls `posthog.identify`
 * with the user's address), sometimes a UUID-like anonymous string.
 *   - "alice@example.com" → "A"
 *   - "Alice Smith"       → "AS"
 *   - "01234abc-…"        → null (caller falls back to a generic icon)
 */
function initialsFor(pseudoId: string): string | null {
  if (!pseudoId) return null
  if (looksLikeEmail(pseudoId)) {
    return pseudoId.charAt(0).toUpperCase()
  }
  // Two-token names ("Alice Smith") map to two initials. Single-token
  // anonymous strings (UUIDs) don't yield meaningful initials — return
  // null so the caller renders the generic User icon.
  const tokens = pseudoId.trim().split(/\s+/).filter(Boolean)
  if (tokens.length >= 2) {
    const first = tokens[0]!.charAt(0).toUpperCase()
    const last = tokens[tokens.length - 1]!.charAt(0).toUpperCase()
    if (/[A-Z]/.test(first) && /[A-Z]/.test(last)) return `${first}${last}`
  }
  return null
}

/**
 * Avg session length from total active span ÷ session count. PostHog's
 * `$session_id` rotates every 30 min of inactivity, so `sessionCount`
 * is a "visits" proxy and `sessionSec / sessionCount` is a workable
 * average. Falls back to total span when session count is 0 (e.g. for
 * users seen in a single session with no `$session_id` set).
 */
function avgSessionSec(user: PosthogUserRow): number {
  if (user.sessionCount > 0) return user.sessionSec / user.sessionCount
  return user.sessionSec
}

/**
 * Small country flag — falls back to a globe glyph when the code is
 * missing or country-flag-icons doesn't have an entry. 20×~14px so it
 * lines up cleanly with the avatar height in `UserRow`.
 */
function CountryFlag({ code, name }: { code: string; name: string }) {
  if (!code) return null
  const FlagComp = (Flags as Record<string, React.ComponentType<{ title?: string; className?: string }>>)[
    code.toUpperCase()
  ]
  if (!FlagComp) {
    return <Globe size={14} weight="regular" className="text-muted-foreground shrink-0" />
  }
  return (
    <FlagComp
      title={name || code}
      className="w-[18px] h-auto rounded-[2px] shrink-0 ring-1 ring-black/[0.06]"
    />
  )
}

// Mirror of `CustomerRow` in `ViewCardCustomerList.tsx`. Same shell
// (avatar + primary line + breadcrumb subline + right-aligned scalar)
// — different fields. Keeping the two files structurally identical
// makes "users" and "customers" feel like sibling tiles in the
// dashboard rather than two unrelated lists.
function UserRow({ user }: { user: PosthogUserRow }) {
  // Primary line: the email when it's a real one (most common case
  // when the app identifies users), else the truncated pseudo-id.
  // The full id always shows up on the subline for cross-referencing
  // — same convention `CustomerRow` uses for `customerId`.
  const primaryDisplay = looksLikeEmail(user.pseudoId)
    ? user.pseudoId
    : shortPseudoId(user.pseudoId)

  // Location: city + country name if both, country alone if only one,
  // empty when geoip didn't resolve. Joined here so the subline
  // formatting code below stays uniform.
  const locationParts: string[] = []
  if (user.city) locationParts.push(user.city)
  if (user.countryName) locationParts.push(user.countryName)
  const locationLabel = locationParts.join(', ')

  // Subline pieces. Order: location → source → sessions count →
  // avg session length → full pseudo-id. Each separated by " · ",
  // same separator + truncation behaviour as the Stripe customer
  // subline.
  const sourceLabel = user.source ? user.source : 'direct'
  const sublineSegments: string[] = []
  if (locationLabel) sublineSegments.push(locationLabel)
  sublineSegments.push(`via ${sourceLabel}`)
  if (user.sessionCount > 0) {
    sublineSegments.push(
      user.sessionCount === 1 ? '1 session' : `${user.sessionCount} sessions`,
    )
  }
  sublineSegments.push(`${formatSessionTime(avgSessionSec(user))} avg`)
  // Always include the full distinct_id so the user can cross-
  // reference in PostHog. When primary is an email, the id is
  // distinct from the primary; when primary is a short id, this
  // duplicates the same value in expanded form — fine, mirrors how
  // the Stripe row always shows `customerId` even when name+email
  // are both null.
  sublineSegments.push(user.pseudoId)
  const subline = sublineSegments.join(' · ')

  // Avatar: initials when the id parses as an email or "First Last",
  // generic person icon for opaque anonymous IDs. Same fallback
  // pattern as `CustomerRow`.
  const initials = initialsFor(user.pseudoId)

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-b-0 border-black/[0.06]">
      <Avatar size="sm" className="shrink-0">
        <AvatarFallback>
          {initials ? (
            initials
          ) : (
            <User size={12} weight="bold" className="text-muted-foreground" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <CountryFlag code={user.countryCode} name={user.countryName} />
          <p className="text-sm font-medium truncate" title={user.pseudoId}>
            {primaryDisplay}
          </p>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {subline}
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
  /**
   * Same routing convention as `ViewCardCustomerList` /
   * `ViewCardList`: a `ConnectionMissingError` triggers the click-to-
   * reattach badge; everything else is a generic "Couldn't load"
   * treatment.
   */
  error: ViewResourceError | null
  /**
   * @deprecated Card always renders the users list now (PostHog
   * backend serves any date range). Kept on the props for backward
   * compatibility; remove once existing call sites stop passing it.
   */
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  onConnectionAssigned?: (updated: View) => void
  /** See `ViewCard.chromeless`. */
  chromeless?: boolean
}

export function ViewCardUsers({
  view,
  onUntrack,
  users,
  loading,
  error,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
  chromeless = false,
}: ViewCardUsersProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing

  return (
    <>
      <ViewWrapper className="col-span-2 row-span-2" variant={chromeless ? 'borderless' : 'default'}>
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

        {/* Body marked `data-no-dnd` so dragging inside doesn't start a
            tile drag — header + outer padding stay the drag surface.
            See `FilteredPointerSensor`. */}
        <div data-no-dnd="true" className="flex-1 overflow-y-auto min-h-0 px-4 pb-3 mt-2">
          {loading ? (
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
