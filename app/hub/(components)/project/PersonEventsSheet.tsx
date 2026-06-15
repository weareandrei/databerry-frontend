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

import { useEffect, useState } from 'react'
import { ArrowsClockwise, Lightning } from '@phosphor-icons/react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { ALGORITHM, type PersonRow, type PersonEvent } from '@/lib/api'

// ── Source presentation ───────────────────────────────────────────
// One entry per platform we ingest events from. `dot` colours the
// leading indicator; `pill` is the small source chip. Unknown sources
// fall back to a neutral grey chip with the raw label title-cased.
const SOURCE_STYLE: Record<string, { label: string; dot: string; pill: string }> = {
  stripe: { label: 'Stripe', dot: 'bg-[#635BFF]', pill: 'bg-[#635BFF]/10 text-[#4b45c6]' },
  posthog: { label: 'PostHog', dot: 'bg-[#F54E00]', pill: 'bg-[#F54E00]/10 text-[#c43e00]' },
  google_analytics: {
    label: 'Google Analytics',
    dot: 'bg-[#E8710A]',
    pill: 'bg-[#E8710A]/10 text-[#b4560a]',
  },
}

function sourceStyle(source: string | null) {
  if (source && SOURCE_STYLE[source]) return SOURCE_STYLE[source]
  const label = source
    ? source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' ')
    : 'Unknown'
  return { label, dot: 'bg-grey-light', pill: 'bg-main text-grey-dark' }
}

function initials(name: string | null, email: string | null): string {
  const base = name?.trim() || email?.trim() || ''
  if (!base) return '?'
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
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

function useTimeline(person: PersonRow | null) {
  const [events, setEvents] = useState<PersonEvent[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!person) return
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
  }, [person])

  return { events, loading }
}

export function PersonEventsSheet({
  person,
  onClose,
}: {
  person: PersonRow | null
  onClose: () => void
}) {
  // Keep the last opened person so the slide-down close animation still
  // has a name/avatar to render after the parent clears `person`.
  const [shown, setShown] = useState<PersonRow | null>(null)
  useEffect(() => {
    if (person) setShown(person)
  }, [person])

  const { events, loading } = useTimeline(person)
  const who = person ?? shown

  return (
    <BottomDialog open={person !== null} onOpenChange={o => !o && onClose()}>
      <BottomDialog.Page
        pageKey={who?.id ?? 'person'}
        bodyVariant="card"
        bodyMaxWidth="44rem"
        headerLeft={
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-main text-xs font-semibold text-grey-dark">
              {initials(who?.displayName ?? null, who?.primaryEmail ?? null)}
            </span>
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

function Timeline({
  events,
  loading,
}: {
  events: PersonEvent[] | null
  loading: boolean
}) {
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

  return (
    <ol className="divide-y divide-stroke">
      {events.map(ev => {
        const s = sourceStyle(ev.source)
        const amount = formatAmount(ev.properties)
        return (
          <li key={ev.id} className="flex items-center gap-3 py-3">
            {/* Source indicator */}
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-grey-darkest">
                  {ev.eventLabel ?? ev.eventKey ?? 'Event'}
                </span>
                {amount && (
                  <span className="text-sm font-semibold text-grey-darkest">· {amount}</span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.pill}`}
                >
                  {s.label}
                </span>
              </div>
            </div>

            <time className="shrink-0 text-xs text-grey-light">{formatWhen(ev.occurredAt)}</time>
          </li>
        )
      })}
    </ol>
  )
}
