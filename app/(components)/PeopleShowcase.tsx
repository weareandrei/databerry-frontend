'use client'

/**
 * Auto-playing "merged users" showcase for the landing page.
 *
 * What it does:
 *   1. Waits for the surface to come into view (IntersectionObserver).
 *   2. Loops forever through a few people:
 *        - Highlights a row in the People table.
 *        - Slides the person's event-timeline bottom sheet up (the
 *          same UX as clicking a row in the real dashboard).
 *        - Auto-scrolls the timeline down a little, then back.
 *        - Slides the sheet back down.
 *        - Advances to the next person and repeats.
 *   3. On unmount, all pending timers are cleared.
 *
 * Why not reuse the real `<PersonEventsSheet>` (a Vaul drawer): this
 * surface is PASSIVE — it scripts open / scroll / close on a timer and
 * needs direct control of the inner scroll position. Driving a real
 * drawer's open state + reaching into its scroll container on a loop is
 * fiddly and fragile. So — exactly like `<AgentModeShowcase>` vs.
 * `<DemoAgentBody>` — this is a self-contained animation that reuses the
 * VISUAL primitives (`<PersonAvatar>`, `<ConnectionIcon>`, `<SourceIcon>`)
 * but owns its own choreography. Provider-free; safe on the landing page.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PersonAvatar } from '@/app/hub/(components)/project/PersonAvatar'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { SourceIcon } from '@/app/hub/(components)/view/SourceIcon'

// ── Data ────────────────────────────────────────────────────────────
//
// A handful of people, each with a single timeline merged from
// MULTIPLE tools (Stripe + PostHog + Google Analytics) — the whole
// point of the section: one profile, every tool's events in one place.

interface ShowEvent {
  source: 'stripe' | 'posthog' | 'google_analytics'
  label: string
  detail?: string
  time: string
}
interface ShowPerson {
  id: string
  name: string | null
  email: string
  source: string
  flag: string
  events: ShowEvent[]
}

const PEOPLE: ShowPerson[] = [
  {
    id: 'sc-alice',
    name: 'Alice Johnson',
    email: 'alice@acme.dev',
    source: 'google.com',
    flag: '🇺🇸',
    events: [
      { source: 'stripe', label: 'Payment', detail: '$49.00', time: '2h ago' },
      { source: 'stripe', label: 'Subscription started', detail: 'Pro · monthly', time: '2h ago' },
      { source: 'posthog', label: 'Checkout started', time: '2h ago' },
      { source: 'posthog', label: 'Clicked', detail: '“Upgrade to Pro”', time: '3h ago' },
      { source: 'google_analytics', label: 'Session', detail: 'Organic · 4m 02s', time: '3h ago' },
      { source: 'posthog', label: 'Page view', detail: '/pricing', time: '3h ago' },
      { source: 'posthog', label: 'Feature activated', detail: 'Dashboards', time: '1d ago' },
      { source: 'posthog', label: 'Signed up', detail: 'via Google', time: '5d ago' },
      { source: 'google_analytics', label: 'Session', detail: 'Direct · 1m 47s', time: '6d ago' },
    ],
  },
  {
    id: 'sc-bob',
    name: null,
    email: 'bob@startup.io',
    source: 'direct',
    flag: '🇬🇧',
    events: [
      { source: 'posthog', label: 'Page view', detail: '/pricing', time: '5h ago' },
      { source: 'posthog', label: 'Clicked', detail: '“Start free trial”', time: '5h ago' },
      { source: 'posthog', label: 'Signed up', detail: 'via email', time: '5h ago' },
      { source: 'google_analytics', label: 'Session', detail: 'Reddit · 2m 18s', time: '1d ago' },
      { source: 'posthog', label: 'Page view', detail: '/features', time: '1d ago' },
      { source: 'google_analytics', label: 'Session', detail: 'Reddit · 0m 51s', time: '4d ago' },
      { source: 'posthog', label: 'Page view', detail: '/', time: '4d ago' },
    ],
  },
  {
    id: 'sc-carol',
    name: 'Carol White',
    email: 'carol@studio.com',
    source: 'reddit.com',
    flag: '🇩🇪',
    events: [
      { source: 'stripe', label: 'Payment', detail: '$99.00', time: '1h ago' },
      { source: 'posthog', label: 'Checkout started', time: '1h ago' },
      { source: 'posthog', label: 'Feature activated', detail: 'Funnels', time: '6h ago' },
      { source: 'google_analytics', label: 'Session', detail: 'Organic · 6m 30s', time: '6h ago' },
      { source: 'posthog', label: 'Page view', detail: '/docs', time: '1d ago' },
      { source: 'posthog', label: 'Signed up', detail: 'via GitHub', time: '3d ago' },
      { source: 'google_analytics', label: 'Session', detail: 'ProductHunt · 3m 12s', time: '3d ago' },
    ],
  },
  {
    id: 'sc-evan',
    name: 'Evan Lee',
    email: 'evan@example.com',
    source: 't.co',
    flag: '🇦🇺',
    events: [
      { source: 'stripe', label: 'Payment', detail: '$29.00', time: '28m ago' },
      { source: 'posthog', label: 'Checkout started', time: '30m ago' },
      { source: 'posthog', label: 'Clicked', detail: '“Buy now”', time: '32m ago' },
      { source: 'google_analytics', label: 'Session', detail: 'Twitter · 2m 41s', time: '1h ago' },
      { source: 'posthog', label: 'Page view', detail: '/pricing', time: '1h ago' },
      { source: 'posthog', label: 'Signed up', detail: 'via Google', time: '2d ago' },
    ],
  },
]

const SOURCE_NAME: Record<string, string> = {
  stripe: 'Stripe',
  posthog: 'PostHog',
  google_analytics: 'Google Analytics',
}

// ── Timings (ms) — tweak the whole feel from here ───────────────────
const ROW_HIGHLIGHT_MS = 700   // table-only beat (row highlighted) before the sheet opens
const SCROLL_DOWN_AT = 1150    // after open → scroll the timeline down a little
const SCROLL_UP_AT = 2750      // → scroll back to the top
const CLOSE_AT = 4050          // → slide the sheet back down
const NEXT_AFTER_CLOSE = 900   // pause after close before the next person

export function PeopleShowcase() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sheetScrollRef = useRef<HTMLDivElement | null>(null)

  const [activeIndex, setActiveIndex] = useState(0)
  const [open, setOpen] = useState(false)

  // ── Visibility gate — don't run the loop until it's on screen ──────
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

  // ── Scripted loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const schedule = (ms: number, fn: () => void) => {
      timers.push(setTimeout(() => !cancelled && fn(), ms))
    }
    const scrollSheet = (top: number) =>
      sheetScrollRef.current?.scrollTo({ top, behavior: 'smooth' })

    const runPerson = (i: number) => {
      if (cancelled) return
      setActiveIndex(i)
      setOpen(false)
      // Brief table-only beat so the row highlight reads, then open.
      schedule(ROW_HIGHLIGHT_MS, () => {
        setOpen(true)
        schedule(SCROLL_DOWN_AT, () => scrollSheet(150))
        schedule(SCROLL_UP_AT, () => scrollSheet(0))
        schedule(CLOSE_AT, () => {
          setOpen(false)
          schedule(NEXT_AFTER_CLOSE, () => runPerson((i + 1) % PEOPLE.length))
        })
      })
    }
    runPerson(0)

    return () => {
      cancelled = true
      timers.forEach(t => clearTimeout(t))
    }
  }, [hasStarted])

  const person = PEOPLE[activeIndex]!

  return (
    <div ref={containerRef} className="relative flex flex-col h-full bg-white overflow-hidden">
      {/* People table — the always-present backdrop. */}
      <div className="flex flex-col min-h-0">
        <div className="px-3 sm:px-4 pt-3.5 pb-2">
          <div className="flex w-full max-w-[280px] items-center gap-2 rounded-full border border-stroke bg-white px-3 py-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-grey-light/60" />
            <span className="text-xs text-grey-light">Search people…</span>
          </div>
        </div>
        <div className="px-1 sm:px-2">
          {PEOPLE.map((p, i) => (
            <PeopleRow key={p.id} person={p} active={i === activeIndex} />
          ))}
        </div>
      </div>

      {/* Dimmer behind the sheet. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 bg-black/10"
          />
        )}
      </AnimatePresence>

      {/* Event-timeline bottom sheet. Keyed by person so a person swap
          plays a clean exit→enter. Portaled INSIDE this card (absolute),
          so it stays inside the showcase exactly like the real sheet
          stays inside the dashboard. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key={person.id}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 z-20 flex h-[82%] flex-col rounded-t-2xl border-t border-stroke bg-white shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.25)]"
          >
            {/* Grab handle. */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-1">
              <span className="h-1 w-9 rounded-full bg-black/10" />
            </div>

            {/* Person header. */}
            <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-1">
              <PersonAvatar seed={person.id} name={person.name ?? person.email} size={36} />
              <div className="min-w-0">
                <p
                  className="truncate text-base font-semibold tracking-tight text-grey-darkest"
                  style={{ fontFamily: 'var(--font-bricolage)' }}
                >
                  {person.name ?? 'Unknown person'}
                </p>
                <p className="truncate text-xs text-grey-light">{person.email}</p>
              </div>
            </div>

            {/* Per-tool filter badges — the "merged across tools" proof. */}
            <SourceBadges events={person.events} />

            {/* Scrollable timeline. */}
            <div ref={sheetScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <ol className="divide-y divide-stroke">
                {person.events.map((ev, i) => (
                  <li key={i} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 shrink-0">
                      <ConnectionIcon type={ev.source} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-grey-darkest">{ev.label}</p>
                      {ev.detail && (
                        <p className="truncate text-xs text-grey-light">{ev.detail}</p>
                      )}
                    </div>
                    <time className="shrink-0 pt-0.5 text-xs text-grey-light">{ev.time}</time>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

function PeopleRow({ person, active }: { person: ShowPerson; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors ${
        active ? 'bg-black/[0.06]' : ''
      }`}
    >
      <PersonAvatar seed={person.id} name={person.name ?? person.email} size={28} />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        {person.name && (
          <span className="truncate text-sm font-medium text-grey-darkest">{person.name}</span>
        )}
        <span
          className={`truncate ${person.name ? 'text-xs text-grey-light' : 'text-sm text-grey-dark'}`}
        >
          {person.email}
        </span>
      </div>
      <span className="hidden items-center gap-1.5 text-xs text-grey-light sm:inline-flex">
        <SourceIcon sourceKey={person.source} label={person.source} size={16} />
        <span className="hidden md:inline">
          {person.source === 'direct' ? 'Direct' : person.source}
        </span>
      </span>
      <span className="shrink-0 text-base">{person.flag}</span>
    </div>
  )
}

function SourceBadges({ events }: { events: ShowEvent[] }) {
  const sources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of events) counts.set(e.source, (counts.get(e.source) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [events])

  return (
    <div className="flex shrink-0 flex-wrap gap-2 px-4 pb-3">
      {sources.map(([key, count]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-white py-1 pl-1.5 pr-1 text-xs font-medium text-grey-dark"
        >
          <ConnectionIcon type={key} size={16} />
          <span className="hidden sm:inline">{SOURCE_NAME[key] ?? key}</span>
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-main px-1 text-[10px] font-semibold tabular-nums text-grey-dark">
            {count}
          </span>
        </span>
      ))}
    </div>
  )
}
