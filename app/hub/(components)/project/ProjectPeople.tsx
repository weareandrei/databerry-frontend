'use client'

/**
 * Project "People" table — the unique end-users in this project's
 * cross-platform identity graph, newest-seen first. A v1,
 * datafast-style table: Name · Email · Source · Country · Last seen.
 *
 * Data is the merged `people` graph (PostHog persons + Stripe
 * customers, bridged by email). Source / country / last-seen are
 * filled from each platform's data where available; "—" otherwise.
 * Populated by "Sync people" (no automatic refresh, by design).
 *
 * Clicking a row opens `<PersonEventsSheet>` — a bottom sheet with
 * that person's event timeline (Stripe charges, PostHog activity, …).
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PersonAvatar } from './PersonAvatar'
import { SourceIcon } from '@/app/hub/(components)/view/SourceIcon'
import {
  ArrowsClockwise,
  DotsThreeVertical,
  MagnifyingGlass,
  Users,
  X,
} from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ALGORITHM, type PersonRow } from '@/lib/api'
import { PersonEventsSheet } from './PersonEventsSheet'

const REGION_NAMES =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

/** alpha-2 code → 🇺🇸 regional-indicator emoji (invalid → ''). */
function flagEmoji(code: string): string {
  if (!/^[a-z]{2}$/i.test(code)) return ''
  return code
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

function countryName(code: string): string {
  try {
    return REGION_NAMES?.of(code.toUpperCase()) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

function sourceLabel(src: string): string {
  return src === 'direct' ? 'Direct' : src
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Relative + compact last-seen (local time):
 *   - today      → "Today 16:12"
 *   - yesterday  → "Yesterday 18:20"
 *   - this year  → "15 Jun"          (no year)
 *   - older year → "15 Jun 2025"     (year only when it's not this year)
 * Manual formatting (not `toLocaleDateString`) so the day-month order
 * and 24-h time are stable regardless of the viewer's locale.
 */
function formatLastSeen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'

  const now = new Date()
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000)

  if (dayDiff === 0 || dayDiff === 1) {
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return `${dayDiff === 0 ? 'Today' : 'Yesterday'} ${time}`
  }

  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`
}

function useProjectPeople(projectId: string) {
  const [people, setPeople] = useState<PersonRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    ALGORITHM.getPeople(projectId, { limit: 500 })
      .then(rows => {
        if (cancelled) return
        // Most-recently-seen FIRST (descending by last-seen); the
        // earliest last-seen sinks to the bottom. Unresolved
        // timestamps sort last either way.
        const sorted = [...rows].sort((a, b) => {
          if (!a.lastSeenAt) return 1
          if (!b.lastSeenAt) return -1
          return b.lastSeenAt.localeCompare(a.lastSeenAt)
        })
        setPeople(sorted)
      })
      .catch(() => !cancelled && setPeople([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => load(), [load])

  const sync = async () => {
    setSyncing(true)
    try {
      const res = await ALGORITHM.syncPeople(projectId)
      const failures = res.connections.filter(c => c.error)
      if (res.connections.length === 0) {
        toast.error('No identity sources connected to this project. Connect PostHog or Stripe first.')
      } else if (failures.length > 0) {
        // Surface the real reason (e.g. a missing migration) instead
        // of a silent "no people".
        toast.error(`Sync failed: ${failures[0].error}`)
      } else {
        toast.success(`Synced ${res.processed} ${res.processed === 1 ? 'person' : 'people'}.`)
      }
      load()
    } catch (err) {
      toast.error(err instanceof Error ? `Sync failed: ${err.message}` : 'Sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  return { people, loading, syncing, sync }
}

/** People revealed per "Load more" press (accumulating, not paging). */
const PAGE_SIZE = 15

// Sticky header — `top-0 bg-white` keeps the column labels pinned while
// the body scrolls inside the max-height container.
const COL_HEAD =
  'sticky top-0 z-10 bg-white border-b border-stroke px-3 py-2 text-left text-xs font-medium text-grey-light whitespace-nowrap'
const CELL = 'px-3 py-2.5 align-middle whitespace-nowrap'

export function ProjectPeople({ projectId }: { projectId: string }) {
  const { people, loading, syncing, sync } = useProjectPeople(projectId)

  // Row click → open the event-timeline bottom sheet for that person.
  const [selected, setSelected] = useState<PersonRow | null>(null)

  // Client-side filter by name OR email over the fetched list.
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const filtered =
    people && normalizedQuery
      ? people.filter(
          p =>
            (p.displayName ?? '').toLowerCase().includes(normalizedQuery) ||
            (p.primaryEmail ?? '').toLowerCase().includes(normalizedQuery),
        )
      : (people ?? [])

  // Accumulating reveal: start at PAGE_SIZE, "Load more" adds another
  // PAGE_SIZE while KEEPING what's shown. Reset to the first page on a
  // fresh load / re-sync OR a new search.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  useEffect(() => setVisibleCount(PAGE_SIZE), [people, normalizedQuery])

  const visible = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visible.length

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* Search by name / email — limited width, hugs the left. */}
        <div className="flex w-full max-w-[280px] items-center gap-2 rounded-full border border-stroke bg-white px-3 py-1.5 shadow-sm">
          <MagnifyingGlass size={14} weight="bold" className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="shrink-0 text-muted-foreground hover:text-grey-darkest transition-colors cursor-pointer"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </div>

        {/* 3-dots menu — the reload/sync action lives here now. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="People options"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-stroke bg-white text-grey-dark shadow-sm hover:bg-black/[0.04] active:bg-black/[0.08] transition-colors cursor-pointer shrink-0"
          >
            <DotsThreeVertical size={16} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={sync}
              disabled={syncing}
              className="text-sm gap-2"
            >
              <ArrowsClockwise
                size={13}
                weight="bold"
                className={syncing ? 'animate-spin' : ''}
              />
              Refresh
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Skeleton while loading OR while a refresh/sync is in flight.
          `sync()` flips `syncing` immediately (the people re-fetch only
          runs after it finishes), so without `|| syncing` the stale rows
          would just sit there for the whole refresh. */}
      {loading || syncing ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-black/[0.04]" />
          ))}
        </div>
      ) : !people || people.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10">
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-main mb-3">
            <Users size={20} weight="bold" className="text-grey-light" />
          </span>
          <p className="text-sm font-medium text-grey-darkest">No people yet</p>
          <p className="mt-1 text-xs text-grey-light max-w-xs">
            Connect PostHog or Stripe, then sync to see the unique users across
            this project&apos;s tools.
          </p>
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90 transition-colors cursor-pointer disabled:opacity-60"
          >
            <ArrowsClockwise size={12} weight="bold" className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync people'}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-grey-light py-8 text-center">
          No people match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        // Height-capped scroll container: the body scrolls inside it
        // and you scroll down to reach "Load more" at the bottom.
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={COL_HEAD}>Person</th>
                <th className={COL_HEAD}>Source</th>
                <th className={COL_HEAD}>Country</th>
                <th className={COL_HEAD}>Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {visible.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="cursor-pointer hover:bg-main/60 transition-colors"
                >
                  <td className={CELL}>
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar
                        seed={p.id}
                        name={p.displayName ?? p.primaryEmail}
                        size={36}
                      />
                      {/* Name + email stacked. Most people have no name, so the
                          email is the stable identifier — it always renders.
                          When a name exists it sits bold on top with the email
                          de-emphasised beneath (two-line row); otherwise the
                          email is the single line. Rows differing in height is
                          expected and fine. */}
                      <div className="flex min-w-0 flex-col leading-tight">
                        {p.displayName && (
                          <span className="font-medium text-grey-darkest">
                            {p.displayName}
                          </span>
                        )}
                        {p.primaryEmail ? (
                          <span
                            className={
                              p.displayName ? 'text-xs text-grey-light' : 'text-grey-dark'
                            }
                          >
                            {p.primaryEmail}
                          </span>
                        ) : (
                          !p.displayName && <span className="text-grey-light">—</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`${CELL} text-grey-dark`}>
                    {p.initialSource ? (
                      <span className="inline-flex items-center gap-1.5">
                        <SourceIcon
                          sourceKey={p.initialSource}
                          label={p.initialSource}
                          size={18}
                        />
                        {sourceLabel(p.initialSource)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={`${CELL} text-grey-dark`}>
                    {p.country ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span>{flagEmoji(p.country)}</span>
                        {countryName(p.country)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={`${CELL} text-grey-light`}>
                    {p.lastSeenAt ? formatLastSeen(p.lastSeenAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Load more — inside the scroll area, so you scroll down to
              reach it. Reveals another PAGE_SIZE, keeping the rest. */}
          {remaining > 0 && (
            <div className="flex justify-center py-3">
              <button
                type="button"
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-white px-4 py-2 text-xs font-medium text-grey-darkest shadow-sm hover:bg-hover-fill transition-colors cursor-pointer"
              >
                Load more
                <span className="text-grey-light">({remaining} left)</span>
              </button>
            </div>
          )}
        </div>
      )}

      <PersonEventsSheet person={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
