'use client'

/**
 * Bottom sheet that slides up when you click a row in the project's
 * People table. Shows that person's event timeline — newest first —
 * with the detecting system (Stripe / PostHog / …) and the time each
 * event happened.
 *
 * Data: `GET /people/:id/events` (already user-scoped + newest-first
 * server-side). Events are populated by "Sync people" — the Stripe /
 * PostHog initializers ingest charges / activity into `people_events`.
 * A person with nothing ingested yet shows the empty state.
 */

import { useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, Lightning } from '@phosphor-icons/react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { ALGORITHM, type PersonRow, type PersonEvent } from '@/lib/api'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { PersonAvatar } from './PersonAvatar'

/** Capitalise the first letter — for login-method labels like "Google". */
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/**
 * Short connection name for a filter badge — strips the "(Connect)" /
 * "(Twitter)" qualifiers in CONNECTION_DISPLAY_NAMES so badges stay tidy.
 */
function connectionName(source: string): string {
  return (CONNECTION_DISPLAY_NAMES[source] ?? capitalize(source)).replace(/\s*\(.*\)$/, '')
}

/** "Jun 14, 2026 · 3:42 PM" — absolute date + time, local zone. */
function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Currency-format a Stripe charge amount (smallest unit → major). */
function formatAmount(props: Record<string, unknown>): string | null {
  const amount = props.amount
  const currency = props.currency
  if (typeof amount !== 'number' || typeof currency !== 'string') return null
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

/**
 * A short, human "what exactly" line for an event — the page visited,
 * the element clicked, the login method, or the charge amount —
 * derived from the curated `properties` the backend captured. Returns
 * null when there's nothing extra worth showing.
 */
function detailFor(ev: PersonEvent): string | null {
  const p = ev.properties ?? {}
  // Stripe charges → the amount.
  if (ev.source === 'stripe') return formatAmount(p)
  // Login → "via Google" (only login-type events carry `method`).
  if (typeof p.method === 'string' && p.method) return `via ${capitalize(p.method)}`
  // Click → the clicked element's text.
  if (typeof p.elementText === 'string' && p.elementText) return `“${p.elementText}”`
  // Page view / leave → the path.
  if (typeof p.path === 'string' && p.path) return p.path
  return null
}

function useTimeline(person: PersonRow | null, override?: PersonEvent[]) {
  const [events, setEvents] = useState<PersonEvent[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!person) return
    // Demo: the caller hands us the timeline directly — no backend
    // round-trip (the landing-page demo has no API/auth).
    if (override) {
      setEvents(override)
      setLoading(false)
      return
    }
    let cancelled = false
    setEvents(null)
    setLoading(true)
    ALGORITHM.getPersonEvents(person.id, { limit: 200 })
      .then(rows => !cancelled && setEvents(rows))
      .catch(() => !cancelled && setEvents([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [person, override])

  return { events, loading }
}

export function PersonEventsSheet({
  person,
  onClose,
  eventsOverride,
  container,
}: {
  person: PersonRow | null
  onClose: () => void
  /** Demo escape hatch: render THESE events instead of fetching from
   *  the backend (the landing-page demo has no API/auth). Real callers
   *  omit it and the sheet fetches `GET /people/:id/events` as usual. */
  eventsOverride?: PersonEvent[]
  /** Portal target for the bottom sheet. The demo passes its card so
   *  the sheet stays inside the demo surface; real callers omit it and
   *  the sheet portals to the document body. */
  container?: HTMLElement | null
}) {
  // Keep the last opened person so the slide-down close animation still
  // has a name/avatar to render after the parent clears `person`.
  const [shown, setShown] = useState<PersonRow | null>(null)
  useEffect(() => {
    if (person) setShown(person)
  }, [person])

  const { events, loading } = useTimeline(person, eventsOverride)
  const who = person ?? shown

  return (
    <BottomDialog
      open={person !== null}
      onOpenChange={o => !o && onClose()}
      container={container}
    >
      <BottomDialog.Page
        pageKey={who?.id ?? 'person'}
        bodyVariant="card"
        bodyMaxWidth="44rem"
        headerLeft={
          <div className="flex min-w-0 items-center gap-3">
            {who?.id ? (
              <PersonAvatar
                seed={who.id}
                name={who.displayName ?? who.primaryEmail}
                size={36}
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-main" />
            )}
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold tracking-tight text-grey-darkest">
                {who?.displayName ?? 'Unknown person'}
              </p>
              <p className="truncate text-xs text-grey-light">
                {who?.primaryEmail ?? 'No email'}
              </p>
            </div>
          </div>
        }
      >
        <Timeline events={events} loading={loading} />
      </BottomDialog.Page>
    </BottomDialog>
  )
}

/** Events revealed per "Load more" press (accumulating, not paging). */
const PAGE_SIZE = 25

function Timeline({
  events,
  loading,
}: {
  events: PersonEvent[] | null
  loading: boolean
}) {
  // Accumulating reveal: show PAGE_SIZE, "Load more" adds another
  // PAGE_SIZE while keeping what's shown. Reset when the person changes.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  // Single-select connection filter (null = all). Reset when the person
  // (events) changes; re-collapse the reveal whenever the filter changes.
  const [activeSource, setActiveSource] = useState<string | null>(null)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setActiveSource(null)
  }, [events])
  useEffect(() => setVisibleCount(PAGE_SIZE), [activeSource])

  // Per-connection event counts across ALL of this person's events
  // (stable regardless of the active filter), busiest connection first.
  const sources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of events ?? []) {
      const key = e.source ?? 'custom'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
  }, [events])

  if (loading || events === null) {
    return (
      <div className="space-y-2.5 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-black/[0.04]" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-main">
          <Lightning size={20} weight="bold" className="text-grey-light" />
        </span>
        <p className="text-sm font-medium text-grey-darkest">No events yet</p>
        <p className="mt-1 max-w-xs text-xs text-grey-light">
          We haven&apos;t recorded any activity for this person. Run{' '}
          <span className="inline-flex items-center gap-1 font-medium text-grey-dark">
            <ArrowsClockwise size={11} weight="bold" /> Refresh
          </span>{' '}
          to pull their latest events from Stripe / PostHog.
        </p>
      </div>
    )
  }

  const filtered = activeSource
    ? events.filter(e => (e.source ?? 'custom') === activeSource)
    : events
  const visible = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visible.length

  return (
    <>
      {/* Connection filter — one badge per connection that detected an
          event, showing that connection's event count. Click a badge to
          show only its events; click it again to clear. Hidden when only
          one connection is present (nothing to filter). */}
      {sources.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {sources.map(({ key, count }) => {
            const active = activeSource === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSource(active ? null : key)}
                className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-1 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'border-grey-darkest bg-main text-grey-darkest'
                    : 'border-stroke bg-white text-grey-dark hover:bg-hover-fill'
                }`}
              >
                <ConnectionIcon type={key} size={16} />
                <span>{connectionName(key)}</span>
                <span
                  className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
                    active ? 'bg-grey-darkest text-white' : 'bg-main text-grey-dark'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <ol className="divide-y divide-stroke">
        {visible.map(ev => {
          const detail = detailFor(ev)
          return (
            <li key={ev.id} className="flex items-start gap-3 py-3">
              {/* Connection logo — replaces the old source dot + text badge. */}
              <span className="mt-0.5 shrink-0">
                <ConnectionIcon type={ev.source ?? 'custom'} size={18} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-grey-darkest">
                  {ev.eventLabel ?? ev.eventKey ?? 'Event'}
                </p>
                {detail && <p className="truncate text-xs text-grey-light">{detail}</p>}
              </div>

              <time className="shrink-0 pt-0.5 text-xs text-grey-light">
                {formatWhen(ev.occurredAt)}
              </time>
            </li>
          )
        })}
      </ol>

      {/* Load more — only when there are more events to reveal. */}
      {remaining > 0 && (
        <div className="flex justify-center pt-4">
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
    </>
  )
}
