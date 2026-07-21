'use client'

/**
 * Demo mirror of the real `<ProjectPeople>` table — the project's
 * cross-platform end-users (Name · Email · Source · Country · Last
 * seen). Clicking a row opens the real `<PersonEventsSheet>` bottom
 * dialog with a synthesized event timeline for that person, exactly
 * like the live dashboard. Reuses the real `<PersonAvatar>` +
 * `<SourceIcon>` so rows look identical to the live table; the search
 * box is cosmetic (read-only).
 */

import { useMemo, useState } from 'react'
import { PersonAvatar } from '@/app/hub/project/(components)/PersonAvatar'
import { PersonEventsSheet } from '@/app/hub/project/(components)/PersonEventsSheet'
import { PersonLastSeen } from '@/app/hub/project/(components)/PersonLastSeen'
import { SourceIcon } from '@/app/hub/(components)/widgets/(components)/SourceIcon'
import { CountryFlag } from '@/components/CountryFlag'
import { SearchBar } from '@/components/SearchBar'
import type { PersonEvent, PersonRow } from '@/lib/api'
import { useDemoContext } from '../context/DemoContext'
import { DEMO_PEOPLE, type DemoPerson, toDemoPersonRow } from '../demoPeopleData'

const COUNTRY: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  CA: 'Canada',
  AU: 'Australia',
}

const COL_HEAD =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle'
const CELL = 'px-3 py-2.5 align-middle whitespace-nowrap'

// ── Synthetic event timeline ────────────────────────────────────────
//
// Each person gets a deterministic, reverse-chronological activity log
// (mix of PostHog + Stripe events) so the bottom sheet shows the same
// "what they did + when" timeline the real dashboard pulls from
// `people_events`. Anchored to the demo's 2026 world rather than the
// live clock so the times stay stable + consistent with the rest of
// the demo.
const DEMO_NOW = Date.parse('2026-06-17T15:30:00Z')
const MIN = 60_000

/** FNV-1a — stable per-id hash so each person's timeline is fixed. */
function hashSeed(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

interface EvtTemplate {
  source: string
  eventKey: string
  eventLabel: string
  /** Minutes before `DEMO_NOW` this event happened. */
  agoMin: number
  properties?: Record<string, unknown>
}

function buildPersonEvents(person: DemoPerson): PersonEvent[] {
  const seed = hashSeed(person.id)
  // ~2/3 of people have converted (carry Stripe events); the rest are
  // PostHog-only — so the sheet's connection filter has something to do
  // for some people and gracefully hides for others.
  const paid = seed % 3 !== 0
  const amount = 2900 + (seed % 5) * 2000 // $29–$109
  const signup = ['google', 'github', 'email'][seed % 3]

  const templates: (EvtTemplate | false)[] = [
    paid && {
      source: 'stripe',
      eventKey: 'charge.succeeded',
      eventLabel: 'Payment',
      agoMin: 95,
      properties: { amount, currency: 'usd' },
    },
    paid && {
      source: 'stripe',
      eventKey: 'customer.subscription.created',
      eventLabel: 'Subscription started',
      agoMin: 96,
    },
    { source: 'posthog', eventKey: 'checkout_started', eventLabel: 'Checkout started', agoMin: 99 },
    {
      source: 'posthog',
      eventKey: '$autocapture',
      eventLabel: 'Clicked',
      agoMin: 104,
      properties: { elementText: 'Start free trial' },
    },
    {
      source: 'posthog',
      eventKey: '$pageview',
      eventLabel: 'Page view',
      agoMin: 110,
      properties: { path: '/pricing' },
    },
    { source: 'posthog', eventKey: 'feature_activated', eventLabel: 'Feature activated', agoMin: 26 * 60 },
    {
      source: 'posthog',
      eventKey: '$pageview',
      eventLabel: 'Page view',
      agoMin: 28 * 60,
      properties: { path: '/dashboard' },
    },
    {
      source: 'posthog',
      eventKey: '$pageview',
      eventLabel: 'Page view',
      agoMin: 50 * 60,
      properties: { path: '/' },
    },
    {
      source: 'posthog',
      eventKey: 'signed_up',
      eventLabel: 'Signed up',
      agoMin: 5 * 24 * 60,
      properties: { method: signup },
    },
    {
      source: 'posthog',
      eventKey: '$pageview',
      eventLabel: 'Page view',
      agoMin: 6 * 24 * 60,
      properties: { path: '/blog/launch' },
    },
  ]

  return templates
    .filter((t): t is EvtTemplate => Boolean(t))
    .map((t, i) => ({
      id: `${person.id}-evt-${i}`,
      occurredAt: new Date(DEMO_NOW - t.agoMin * MIN).toISOString(),
      properties: t.properties ?? {},
      sourceEventId: `${person.id}-${i}`,
      connectionId: null,
      eventKey: t.eventKey,
      eventLabel: t.eventLabel,
      source: t.source,
    }))
}

export function DemoPeople() {
  const { dialogContainer } = useDemoContext()
  const [selected, setSelected] = useState<DemoPerson | null>(null)

  // Project the selected demo person into the real `PersonRow` shape
  // the sheet's header reads (id / displayName / primaryEmail).
  const personRow: PersonRow | null = useMemo(
    () => (selected ? toDemoPersonRow(selected, 'demo') : null),
    [selected],
  )
  const events = useMemo(
    () => (selected ? buildPersonEvents(selected) : []),
    [selected],
  )

  return (
    <div className="space-y-3">
      <SearchBar value="" readOnly placeholder="Search by name or email…" />

      <div className="overflow-x-auto">
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
            {DEMO_PEOPLE.map(p => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                className="cursor-pointer hover:bg-surface/60 transition-colors"
              >
                <td className={CELL}>
                  <div className="flex items-center gap-2.5">
                    <PersonAvatar seed={p.id} name={p.name ?? p.email} size={28} />
                    <div className="flex min-w-0 flex-col leading-tight">
                      {p.name && (
                        <span className="font-medium text-foreground">{p.name}</span>
                      )}
                      {p.email && (
                        <span className={p.name ? 'text-xs text-subtle' : 'text-muted-foreground'}>
                          {p.email}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className={`${CELL} text-muted-foreground`}>
                  <span className="inline-flex items-center gap-1.5">
                    <SourceIcon sourceKey={p.source} label={p.source} size={18} />
                    {p.source === 'direct' ? 'Direct' : p.source}
                  </span>
                </td>
                <td className={`${CELL} text-muted-foreground`}>
                  <span className="inline-flex items-center gap-1.5">
                    <CountryFlag
                      code={p.country}
                      name={COUNTRY[p.country] ?? p.country}
                    />
                    {COUNTRY[p.country] ?? p.country}
                  </span>
                </td>
                <td className={CELL}>
                  <PersonLastSeen iso={p.lastSeen} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Real bottom sheet — fed a synthetic timeline + portaled into
          the demo card so it stays inside the demo surface. */}
      <PersonEventsSheet
        person={personRow}
        eventsOverride={events}
        container={dialogContainer}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
