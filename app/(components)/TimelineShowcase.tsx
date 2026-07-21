'use client'

/**
 * Auto-playing project Timeline showcase for the landing page.
 *
 * What it does:
 *   1. Waits for the surface to come into view (IntersectionObserver).
 *   2. Loops forever through a short choreography:
 *        - Scrolls to a time-band of event cards.
 *        - Expands one card (same expand chrome as the real Timeline).
 *        - Holds, collapses, advances to the next highlight.
 *        - After the last, scrolls back toward "now" and restarts.
 *   3. On unmount, all pending timers are cleared.
 *
 * Layout mirrors the real TimelineView: time runs vertically, and
 * events that land near the same moment pack into horizontal columns
 * (so Alice's purchase can sit beside Dana's page view on one row).
 *
 * Why not reuse `<ProjectSessionsTimeline>` / `<TimelineView>`:
 *   - Those need Redux date range, live fetches, and d3 layout. This
 *     surface is PASSIVE — scripted scroll + expand. Same pattern as
 *     `<PeopleShowcase>`: reuse visual primitives but own the
 *     choreography. Provider-free; safe on the landing page.
 */

import { useEffect, useRef, useState } from 'react'
import { CalendarBlank } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { PersonAvatar } from '@/app/hub/project/(components)/PersonAvatar'
import { ExpandableTimelineCard } from '@/components/TimelineView'
import {
  connectionName,
  sourceColor,
} from '@/app/hub/project/(components)/personEventUtils'

// ── Data ────────────────────────────────────────────────────────────
//
// Mixed events across tools — the story of the section: visit → sign
// up → purchase for one person, a shorter signup journey for another,
// a lone Stripe connection for a third. Rows with `columns > 1` pack
// side-by-side the way the real timeline packs concurrent activity.

type EventSource = 'posthog' | 'stripe' | 'google_analytics'

interface ShowEvent {
  id: string
  /** Person this event belongs to (for the expanded detail). */
  person: string
  label: string
  detail?: string
  source: EventSource
  timeLabel: string
  /** Extra rows shown when expanded. */
  props?: { label: string; value: string }[]
}

interface ShowRow {
  id: string
  /** Day rail — only the first row of a day shows the full label. */
  dayAccent: string
  dayNumber: string
  showDayLabel: boolean
  /** Time tick on the rail for this band (optional dash when omitted). */
  timeTick?: string
  events: ShowEvent[]
}

const ROWS: ShowRow[] = [
  // ── Today: Alice purchases beside Dana browsing ──────────────────
  {
    id: 'row-purchase',
    dayAccent: 'Sun',
    dayNumber: '19',
    showDayLabel: true,
    timeTick: '4:12',
    events: [
      {
        id: 'ev-alice-pay',
        person: 'Alice Johnson',
        label: 'Payment',
        detail: '$49.00',
        source: 'stripe',
        timeLabel: '4:12 PM',
        props: [
          { label: 'Customer', value: 'Alice Johnson' },
          { label: 'Plan', value: 'Pro · monthly' },
          { label: 'Amount', value: '$49.00' },
        ],
      },
      {
        id: 'ev-dana-view',
        person: 'Dana Park',
        label: 'Page view',
        detail: '/',
        source: 'google_analytics',
        timeLabel: '4:11 PM',
        props: [
          { label: 'Person', value: 'Dana Park' },
          { label: 'Path', value: '/' },
          { label: 'Source', value: 'producthunt.com' },
        ],
      },
    ],
  },
  // Alice logged in a few minutes earlier
  {
    id: 'row-login',
    dayAccent: 'Sun',
    dayNumber: '19',
    showDayLabel: false,
    timeTick: '4:05',
    events: [
      {
        id: 'ev-alice-login',
        person: 'Alice Johnson',
        label: 'Logged in',
        detail: 'via Google',
        source: 'posthog',
        timeLabel: '4:05 PM',
        props: [
          { label: 'Person', value: 'Alice Johnson' },
          { label: 'Method', value: 'Google' },
        ],
      },
    ],
  },
  // Alice visited pricing — start of her journey
  {
    id: 'row-alice-visit',
    dayAccent: 'Sun',
    dayNumber: '19',
    showDayLabel: false,
    timeTick: '3:58',
    events: [
      {
        id: 'ev-alice-visit',
        person: 'Alice Johnson',
        label: 'Page view',
        detail: '/pricing',
        source: 'posthog',
        timeLabel: '3:58 PM',
        props: [
          { label: 'Person', value: 'Alice Johnson' },
          { label: 'Path', value: '/pricing' },
          { label: 'Source', value: 'google.com' },
        ],
      },
    ],
  },
  // Bob opens the site + signs up (same band — horizontal)
  {
    id: 'row-bob',
    dayAccent: 'Sun',
    dayNumber: '19',
    showDayLabel: false,
    timeTick: '2:40',
    events: [
      {
        id: 'ev-bob-visit',
        person: 'bob@startup.io',
        label: 'Page view',
        detail: '/',
        source: 'posthog',
        timeLabel: '2:41 PM',
        props: [
          { label: 'Person', value: 'bob@startup.io' },
          { label: 'Path', value: '/' },
          { label: 'Source', value: 'direct' },
        ],
      },
      {
        id: 'ev-bob-signup',
        person: 'bob@startup.io',
        label: 'Signed up',
        detail: 'via email',
        source: 'posthog',
        timeLabel: '2:40 PM',
        props: [
          { label: 'Person', value: 'bob@startup.io' },
          { label: 'Method', value: 'Email' },
        ],
      },
    ],
  },
  // Carol just connected Stripe
  {
    id: 'row-carol-stripe',
    dayAccent: 'Sun',
    dayNumber: '19',
    showDayLabel: false,
    timeTick: '1:15',
    events: [
      {
        id: 'ev-carol-stripe',
        person: 'Carol White',
        label: 'Connected Stripe',
        detail: 'carol@studio.com',
        source: 'stripe',
        timeLabel: '1:15 PM',
        props: [
          { label: 'Person', value: 'Carol White' },
          { label: 'Account', value: 'carol@studio.com' },
          { label: 'Status', value: 'Live mode' },
        ],
      },
    ],
  },
  // ── Yesterday: a couple more concurrent events ───────────────────
  {
    id: 'row-yesterday',
    dayAccent: 'Sat',
    dayNumber: '18',
    showDayLabel: true,
    timeTick: '6:03',
    events: [
      {
        id: 'ev-evan-pay',
        person: 'Evan Lee',
        label: 'Payment',
        detail: '$29.00',
        source: 'stripe',
        timeLabel: '6:03 PM',
        props: [
          { label: 'Customer', value: 'Evan Lee' },
          { label: 'Amount', value: '$29.00' },
        ],
      },
      {
        id: 'ev-evan-checkout',
        person: 'Evan Lee',
        label: 'Checkout started',
        source: 'posthog',
        timeLabel: '6:00 PM',
        props: [
          { label: 'Person', value: 'Evan Lee' },
          { label: 'Path', value: '/pricing' },
        ],
      },
      {
        id: 'ev-evan-view',
        person: 'Evan Lee',
        label: 'Page view',
        detail: '/pricing',
        source: 'google_analytics',
        timeLabel: '5:58 PM',
        props: [
          { label: 'Person', value: 'Evan Lee' },
          { label: 'Path', value: '/pricing' },
          { label: 'Source', value: 't.co' },
        ],
      },
    ],
  },
]

/** Events the animation expands — one beat per story beat. */
const HIGHLIGHT_IDS = [
  'ev-alice-pay',
  'ev-alice-login',
  'ev-alice-visit',
  'ev-bob-signup',
  'ev-carol-stripe',
  'ev-evan-pay',
] as const

const CARD_WIDTH = 220
const CARD_HEIGHT = 70
const COLUMN_GAP = 10

// ── Timings (ms) ────────────────────────────────────────────────────
const SCROLL_AT = 500
const EXPAND_AT = 1200
const COLLAPSE_AT = 3000
const NEXT_AFTER_COLLAPSE = 650
const LOOP_PAUSE = 900

function findRowForEvent(eventId: string): ShowRow | undefined {
  return ROWS.find(r => r.events.some(e => e.id === eventId))
}

export function TimelineShowcase() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const [activeId, setActiveId] = useState<string>(HIGHLIGHT_IDS[0])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [hasStarted, setHasStarted] = useState(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el || hasStarted) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setHasStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const schedule = (ms: number, fn: () => void) => {
      timers.push(setTimeout(() => !cancelled && fn(), ms))
    }

    const scrollToRow = (rowId: string) => {
      const row = rowRefs.current.get(rowId)
      const scroller = scrollRef.current
      if (!row || !scroller) return
      const top = row.offsetTop - Math.max(0, (scroller.clientHeight - row.offsetHeight) / 2)
      scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }

    const runHighlight = (i: number) => {
      if (cancelled) return
      const eventId = HIGHLIGHT_IDS[i]!
      const row = findRowForEvent(eventId)
      setActiveId(eventId)
      setExpandedId(null)

      if (row) schedule(SCROLL_AT, () => scrollToRow(row.id))
      schedule(EXPAND_AT, () => {
        setExpandedId(eventId)
        schedule(COLLAPSE_AT - EXPAND_AT, () => {
          setExpandedId(null)
          schedule(NEXT_AFTER_COLLAPSE, () => {
            const next = (i + 1) % HIGHLIGHT_IDS.length
            if (next === 0) {
              schedule(LOOP_PAUSE, () => {
                scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                schedule(LOOP_PAUSE, () => runHighlight(0))
              })
            } else {
              runHighlight(next)
            }
          })
        })
      })
    }
    runHighlight(0)

    return () => {
      cancelled = true
      timers.forEach(t => clearTimeout(t))
    }
  }, [hasStarted])

  return (
    <div ref={containerRef} className="relative flex h-full flex-col bg-white overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 px-3 pt-3.5 pb-2 sm:px-4">
        <ZoomChrome active="weekly" />
        <span className="text-lg font-semibold text-primary">Jul 19</span>
      </div>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto border-t border-stroke"
      >
        {/* "Now" marker. */}
        <div
          aria-hidden
          className="pointer-events-none sticky top-4 z-[35] h-0.5 bg-primary"
        >
          <span className="absolute top-1/2 left-[84px] h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
        </div>

        <div className="relative pb-10 pt-2" style={{ minWidth: 88 + CARD_WIDTH * 2 + COLUMN_GAP + 48 }}>
          {ROWS.map(row => {
            const rowActive =
              row.events.some(e => e.id === activeId) ||
              row.events.some(e => e.id === expandedId)
            return (
              <div
                key={row.id}
                ref={el => {
                  if (el) rowRefs.current.set(row.id, el)
                  else rowRefs.current.delete(row.id)
                }}
                className="relative flex min-h-[88px]"
              >
                {/* Day / time rail. */}
                <div className="sticky left-0 z-10 flex w-[88px] shrink-0 flex-col items-center border-r border-stroke/40 bg-white pt-3">
                  {row.showDayLabel ? (
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-lg font-semibold text-primary">{row.dayAccent}</span>
                      <span className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                        {row.dayNumber}
                      </span>
                    </div>
                  ) : row.timeTick ? (
                    <span className="mt-1 text-[11px] font-medium tabular-nums text-subtle">
                      {row.timeTick}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="mt-4 block h-px w-5 rounded-full bg-stroke/70"
                    />
                  )}
                </div>

                {/* Horizontal event columns for this time band. */}
                <div
                  className={`relative flex flex-1 items-start gap-2.5 px-3 py-2 sm:px-4 transition-opacity duration-300 ${
                    rowActive ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-[32px] h-px w-3 bg-stroke/60"
                  />
                  {row.events.map(ev => (
                    <div
                      key={ev.id}
                      className="shrink-0"
                      style={{ width: CARD_WIDTH }}
                    >
                      <ShowcaseEventCard
                        event={ev}
                        expanded={expandedId === ev.id}
                        dimmed={activeId !== ev.id && expandedId !== ev.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

function ZoomChrome({ active }: { active: 'daily' | 'weekly' | 'monthly' }) {
  const modes = [
    { value: 'daily' as const, label: 'Day' },
    { value: 'weekly' as const, label: 'Week' },
    { value: 'monthly' as const, label: 'Month' },
  ]
  return (
    <div
      className="flex h-8 items-center rounded-lg border border-stroke bg-surface p-0.5 shadow-sm"
      role="presentation"
    >
      {modes.map(m => (
        <span
          key={m.value}
          className={`flex h-full min-w-[44px] items-center justify-center rounded-sm px-2 text-xs ${
            active === m.value
              ? 'bg-white font-medium text-foreground shadow-control'
              : 'font-normal text-subtle'
          }`}
        >
          {m.label}
        </span>
      ))}
    </div>
  )
}

function ShowcaseEventCard({
  event,
  expanded,
  dimmed,
}: {
  event: ShowEvent
  expanded: boolean
  dimmed: boolean
}) {
  const color = sourceColor(event.source)

  const header = (
    <>
      <div className="flex items-start gap-2">
        <PersonAvatar seed={event.person} name={event.person} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground">
              {event.label}
            </p>
            {event.detail && (
              <p className="min-w-0 shrink truncate text-[11px] leading-tight text-subtle">
                {event.detail}
              </p>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-subtle">
            {event.person}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 pl-[36px] text-[11px] text-subtle">
        <ConnectionIcon type={event.source} size={13} />
        <span className="truncate font-medium text-muted-foreground">
          {connectionName(event.source)}
        </span>
        <span aria-hidden>·</span>
        <span className="tabular-nums whitespace-nowrap">{event.timeLabel}</span>
      </div>
    </>
  )

  const expandedBody = (
    <div className="mt-2 space-y-1.5 border-t border-stroke pt-2 pl-[36px]">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarBlank size={12} weight="bold" className="text-subtle" />
        <span>{event.timeLabel}</span>
      </div>
      {event.props && event.props.length > 0 && (
        <dl className="space-y-1">
          {event.props.map(r => (
            <div key={r.label} className="flex gap-2 text-[11px]">
              <dt className="shrink-0 text-subtle">{r.label}</dt>
              <dd className="min-w-0 flex-1 break-words text-right font-medium text-muted-foreground">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )

  return (
    <div className={`transition-opacity duration-300 ${dimmed ? 'opacity-55' : 'opacity-100'}`}>
      <ExpandableTimelineCard
        color={color}
        expanded={expanded}
        onToggle={() => {}}
        header={header}
        expandedBody={expandedBody}
        maxWidth={CARD_WIDTH}
        collapsedHeight={CARD_HEIGHT}
      />
    </div>
  )
}
