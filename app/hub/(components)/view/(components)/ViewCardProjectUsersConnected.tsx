'use client'

/**
 * "General → Users" tile — lists the project's cross-platform people
 * (the identity graph populated from Stripe / PostHog / GA), newest
 * first. Connection-less, like the other composite views: it reads
 * the `people` graph for `view.projectId` directly rather than a
 * single connection, so there's no reattach / connection-missing
 * chrome.
 *
 * Self-contained (fetch + presentation in one) — unlike the chart
 * tiles there's no per-tile config to persist, so the 3-file
 * connected/presentation/hook split would be overkill. Mirrors the
 * row shell of `ViewCardUsers` (avatar + primary line + subline +
 * right-aligned relative time) so "Users" reads as a sibling of the
 * PostHog users tile.
 */

import { useCallback, useEffect, useState } from 'react'
import { ArrowsClockwise, User, UsersThree } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ViewWrapper } from './ViewWrapper'
import { SkeletonRows } from './ViewSkeleton'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { ALGORITHM, type PersonRow } from '@/lib/api'
import type { View } from '@/types/view'

// Relative-time formatter — same shape as `ViewCardUsers` so the two
// tiles read identically. Keeps rows dense vs. a full ISO string.
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

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

/**
 * Initials for the avatar: first letter of a name's two tokens, or
 * the first letter of an email, else null (caller renders the
 * generic User icon). Mirrors `ViewCardUsers.initialsFor`.
 */
function initialsFor(person: PersonRow): string | null {
  const name = person.displayName?.trim()
  if (name) {
    const tokens = name.split(/\s+/).filter(Boolean)
    if (tokens.length >= 2) {
      return `${tokens[0]![0]!}${tokens[tokens.length - 1]![0]!}`.toUpperCase()
    }
    return name[0]!.toUpperCase()
  }
  if (person.primaryEmail) return person.primaryEmail[0]!.toUpperCase()
  return null
}

function PersonRowItem({ person }: { person: PersonRow }) {
  // Primary line: name if known, else email, else a short id. The
  // identity graph fills name/email as platforms surface them, so a
  // freshly-ingested anonymous person shows the id until enriched.
  const primary =
    person.displayName ||
    person.primaryEmail ||
    `${person.id.slice(0, 8)}…`

  // Subline: email (when it's not already the primary), else a quiet
  // "added" date so the row isn't bare for anonymous people.
  const sublineParts: string[] = []
  if (person.primaryEmail && person.primaryEmail !== primary) {
    sublineParts.push(person.primaryEmail)
  }
  sublineParts.push(`added ${formatRelative(person.createdAt)}`)
  const subline = sublineParts.join(' · ')

  const initials = initialsFor(person)

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
        <p className="text-sm font-medium truncate" title={primary}>
          {primary}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{subline}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatRelative(person.updatedAt)}
      </span>
    </div>
  )
}

/**
 * A shimmering placeholder matching `PersonRowItem`'s layout. Shown at the
 * top of the list while the backend resyncs, so the tile signals "fresher
 * people incoming" without hiding the people we already have.
 */
function PersonSkeletonRowItem() {
  return (
    <div
      aria-hidden
      className="flex items-center gap-3 py-2 border-b last:border-b-0 border-black/[0.06] animate-pulse"
    >
      <div className="h-8 w-8 shrink-0 rounded-full bg-black/[0.06]" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3 w-32 rounded bg-black/[0.06]" />
        <div className="h-2.5 w-44 rounded bg-black/[0.04]" />
      </div>
      <div className="h-3 w-12 shrink-0 rounded bg-black/[0.06]" />
    </div>
  )
}

/** Skeleton placeholder rows shown at the top while a resync is incoming. */
const RESYNC_SKELETON_ROWS = 2

/** Poll cadence while the backend reports `isResyncing`. */
const RESYNC_POLL_MS = 3000

interface Props {
  view: View
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
  isPinned?: boolean
  projectName?: string
  chromeless?: boolean
}

export function ViewCardProjectUsersConnected({
  view,
  onUntrack,
  onPin,
  isPinned,
  projectName,
  chromeless = false,
}: Props) {
  const [people, setPeople] = useState<PersonRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [syncing, setSyncing] = useState(false)
  // True while the backend pulls fresher data in the background — drives
  // the skeleton top-rows hint + the poll loop below.
  const [resyncing, setResyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { people: rows, isResyncing } = await ALGORITHM.getPeople(view.projectId, {
        limit: 200,
      })
      setPeople(rows)
      setResyncing(isResyncing)
    } catch {
      setError(true)
      setPeople(null)
      setResyncing(false)
    } finally {
      setLoading(false)
    }
  }, [view.projectId])

  useEffect(() => {
    void load()
  }, [load])

  // Poll quietly (no `loading` flip) while the server is still resyncing so
  // the list stays put and swaps in fresher people until it flips false.
  useEffect(() => {
    if (!resyncing) return
    let cancelled = false
    const id = setInterval(() => {
      ALGORITHM.getPeople(view.projectId, { limit: 200 })
        .then(({ people: rows, isResyncing }) => {
          if (cancelled) return
          setPeople(rows)
          setResyncing(isResyncing)
        })
        .catch(() => {})
    }, RESYNC_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [resyncing, view.projectId])

  /**
   * "Sync people" — pull people from every identity-bearing
   * connection for this project, then reload the list. Used by both
   * the empty-state button and the 3-dots menu item. Toasts the
   * outcome so a long-running sync gives feedback; re-loads on
   * success so newly-bridged people appear without a manual refresh.
   */
  const handleSync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const { processed } = await ALGORITHM.syncPeople(view.projectId)
      toast.success(
        processed > 0
          ? `Synced ${processed} ${processed === 1 ? 'person' : 'people'}.`
          : 'Sync complete — no people found in connected platforms yet.',
      )
      await load()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Couldn't sync people — ${err.message}`
          : "Couldn't sync people",
      )
    } finally {
      setSyncing(false)
    }
  }, [syncing, view.projectId, load])

  return (
    <ViewWrapper
      className="col-span-3 row-span-2"
      variant={chromeless ? 'borderless' : 'default'}
    >
      <ViewHeader
        name={view.name}
        connectionType={view.connectionType}
        connectionLabel="All platforms"
        onUntrack={onUntrack}
        viewId={view.id}
        projectName={projectName}
        onRefresh={() => void load()}
        refreshing={loading}
        // ViewHeader's onPin is no-arg; bind the view id here so the
        // parent's `(id) => …` handler gets what it needs.
        onPin={onPin ? () => onPin(view.id) : undefined}
        isPinned={isPinned}
        // "Sync people" lives in the 3-dots menu whenever the list is
        // NON-empty (the empty state surfaces its own prominent
        // button instead, so we don't double up). `onSelect`
        // preventDefault keeps the menu from stealing focus mid-sync.
        extraMenuItems={
          people && people.length > 0 ? (
            <DropdownMenuItem
              onSelect={e => {
                e.preventDefault()
                void handleSync()
              }}
              disabled={syncing}
              className="text-sm gap-2"
            >
              <UsersThree size={14} weight="bold" />
              {syncing ? 'Syncing…' : 'Sync people'}
            </DropdownMenuItem>
          ) : undefined
        }
      />

      {/* `data-no-dnd` so scrolling/selecting inside the list doesn't
          start a tile drag — matches every other list tile. */}
      <div
        data-no-dnd="true"
        className="flex-1 overflow-y-auto min-h-0 px-4 pb-3 mt-2"
      >
        {loading || (resyncing && (!people || people.length === 0)) ? (
          // Full skeleton on first load OR while a background resync is
          // populating an as-yet-empty list — better than flashing the
          // empty state while data is actively being pulled in.
          <SkeletonRows count={5} rowClassName="h-9" />
        ) : error ? (
          <div className="py-2">
            <FetchErrorBadge message="Couldn't load users" />
          </div>
        ) : people && people.length === 0 ? (
          // Empty state — prominent "Sync people" button right in the
          // tile (vs. buried in the 3-dots menu) because with zero
          // people the user's whole job here is "go find some". The
          // sync pulls from every connected platform and bridges by
          // email.
          <div className="flex flex-col items-center justify-center text-center gap-3 py-8">
            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
              <UsersThree size={20} weight="bold" className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No users yet</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">
                Pull people from your connected platforms (Stripe,
                PostHog…) and merge them by email.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-full h-9 px-4 text-xs font-medium bg-primary hover:bg-primary/90 text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <>
                  <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                  Syncing…
                </>
              ) : (
                <>
                  <UsersThree size={13} weight="bold" />
                  Sync people
                </>
              )}
            </button>
          </div>
        ) : people ? (
          <>
            {/* Resync in flight → top rows are skeletons (not data) so the
                tile shows fresher people are landing; existing rows stay
                visible right below. */}
            {resyncing &&
              Array.from({ length: RESYNC_SKELETON_ROWS }).map((_, i) => (
                <PersonSkeletonRowItem key={`resync-skeleton-${i}`} />
              ))}
            {people.map(p => <PersonRowItem key={p.id} person={p} />)}
          </>
        ) : null}
      </div>
    </ViewWrapper>
  )
}
