/**
 * Shared demo people + project-timeline session fixtures.
 *
 * Used by `<DemoPeople>` (overview table) and `<DemoTimelinePage>`
 * (project Timeline view) so avatars / names / sources stay consistent
 * across both surfaces.
 */

import type { PersonEvent, PersonRow } from '@/lib/api'
import type { TimelineNode } from '@/components/TimelineView'
import type { ProjectSessionNodeData } from '@/app/hub/project/(components)/session-timeline/projectSessions'
import type { PageDwellSession } from '@/app/hub/project/(components)/personPageSessions'

export interface DemoPerson {
  id: string
  name: string | null
  email: string | null
  /** Referrer source — a domain (favicon) or 'direct'. */
  source: string
  /** ISO 3166-1 alpha-2. */
  country: string
  lastSeen: string
}

/**
 * Hand-picked cast — informative enough that a visitor scanning the
 * timeline can tell a conversion story (Alice), a bounce (Bob), a
 * docs reader (Carol), a Product Hunt visit (Dev), and a returning
 * buyer (Evan) apart at a glance. Dates sit inside the demo's
 * default range (2026-04-02 → 2026-04-08).
 */
export const DEMO_PEOPLE: DemoPerson[] = [
  {
    id: 'p-1',
    name: 'Alice Johnson',
    email: 'alice@acme.dev',
    source: 'google.com',
    country: 'US',
    lastSeen: '2026-04-08T14:12:00Z',
  },
  {
    id: 'p-2',
    name: null,
    email: 'bob@startup.io',
    source: 'direct',
    country: 'GB',
    lastSeen: '2026-04-07T18:40:00Z',
  },
  {
    id: 'p-3',
    name: 'Carol White',
    email: 'carol@studio.com',
    source: 'reddit.com',
    country: 'DE',
    lastSeen: '2026-04-06T09:30:00Z',
  },
  {
    id: 'p-4',
    name: null,
    email: 'dev@tinylaunch.com',
    source: 'producthunt.com',
    country: 'CA',
    lastSeen: '2026-04-05T16:05:00Z',
  },
  {
    id: 'p-5',
    name: 'Evan Lee',
    email: 'evan@example.com',
    source: 't.co',
    country: 'AU',
    lastSeen: '2026-04-04T11:48:00Z',
  },
]

export function toDemoPersonRow(person: DemoPerson, projectId: string): PersonRow {
  return {
    id: person.id,
    projectId,
    displayName: person.name,
    primaryEmail: person.email,
    country: person.country,
    initialSource: person.source,
    lastSeenAt: person.lastSeen,
    createdAt: '',
    updatedAt: '',
  }
}

function stubEvent(
  id: string,
  occurredAt: string,
  path: string,
  key: '$pageview' | '$pageleave',
): PersonEvent {
  return {
    id,
    occurredAt,
    properties: { path },
    sourceEventId: id,
    connectionId: null,
    eventKey: key,
    eventLabel: key === '$pageview' ? 'Page view' : 'Page leave',
    source: 'posthog',
  }
}

function makeSessionNode(
  person: PersonRow,
  opts: { id: string; path: string; startedAt: string; durationMs: number },
): TimelineNode<ProjectSessionNodeData> {
  const endedAt = new Date(new Date(opts.startedAt).getTime() + opts.durationMs).toISOString()
  const pageview = stubEvent(`${opts.id}-pv`, opts.startedAt, opts.path, '$pageview')
  const pageleave = stubEvent(`${opts.id}-pl`, endedAt, opts.path, '$pageleave')
  const session: PageDwellSession = {
    kind: 'page_dwell',
    id: opts.id,
    path: opts.path,
    pageview,
    pageleave,
    startedAt: opts.startedAt,
    endedAt,
    durationMs: opts.durationMs,
  }
  return {
    id: opts.id,
    at: opts.startedAt,
    endAt: endedAt,
    data: { kind: 'session', person, session },
  }
}

function makeEventNode(
  person: PersonRow,
  opts: {
    id: string
    source: string
    eventKey: string
    eventLabel: string
    occurredAt: string
    properties?: Record<string, unknown>
  },
): TimelineNode<ProjectSessionNodeData> {
  const event: PersonEvent = {
    id: opts.id,
    occurredAt: opts.occurredAt,
    properties: opts.properties ?? {},
    sourceEventId: opts.id,
    connectionId: null,
    eventKey: opts.eventKey,
    eventLabel: opts.eventLabel,
    source: opts.source,
  }
  return { id: opts.id, at: opts.occurredAt, data: { kind: 'event', person, event } }
}

/**
 * Project-wide timeline for the demo — page visits plus the events
 * around them (logins, sign-ups, Stripe payments), the same mix the
 * live Timeline shows. Stories are deliberate:
 *   - Alice: pricing → logs in → checkout → pays — the conversion
 *   - Bob: bounced off `/` in under a minute, signed up days earlier
 *   - Carol: read `/docs` for several minutes, then signed up
 *   - Dev: Product Hunt visitor peeking at `/`, then signed up
 *   - Evan: returned to `/pricing`, paid, came back for `/features`
 *
 * Multiple people can be active in the same hour so the real Timeline
 * packing (vertical + horizontal columns) actually shows up.
 */
export function buildDemoSessionNodes(
  projectId: string,
): TimelineNode<ProjectSessionNodeData>[] {
  const byId = Object.fromEntries(
    DEMO_PEOPLE.map(p => [p.id, toDemoPersonRow(p, projectId)]),
  ) as Record<string, PersonRow>

  const alice = byId['p-1']!
  const bob = byId['p-2']!
  const carol = byId['p-3']!
  const tinylaunch = byId['p-4']!
  const evan = byId['p-5']!

  const MIN = 60_000

  return [
    // ── Apr 8 (demo "today") — Alice converts, Bob bounces ──────────
    makeSessionNode(alice, {
      id: `${projectId}-alice-checkout`,
      path: '/checkout',
      startedAt: '2026-04-08T14:08:00Z',
      durationMs: 4 * MIN + 12_000,
    }),
    makeSessionNode(alice, {
      id: `${projectId}-alice-pricing`,
      path: '/pricing',
      startedAt: '2026-04-08T13:52:00Z',
      durationMs: 6 * MIN + 40_000,
    }),
    makeSessionNode(bob, {
      id: `${projectId}-bob-bounce`,
      path: '/',
      startedAt: '2026-04-08T14:10:00Z',
      durationMs: 42_000,
    }),

    // ── Apr 7 — Carol in docs, Alice earlier visit ──────────────────
    makeSessionNode(carol, {
      id: `${projectId}-carol-docs`,
      path: '/docs',
      startedAt: '2026-04-07T09:22:00Z',
      durationMs: 11 * MIN + 20_000,
    }),
    makeSessionNode(alice, {
      id: `${projectId}-alice-home`,
      path: '/',
      startedAt: '2026-04-07T16:05:00Z',
      durationMs: 2 * MIN + 15_000,
    }),
    makeSessionNode(evan, {
      id: `${projectId}-evan-features`,
      path: '/features',
      startedAt: '2026-04-07T18:40:00Z',
      durationMs: 3 * MIN + 50_000,
    }),

    // ── Apr 6 — Product Hunt traffic + Carol return ─────────────────
    makeSessionNode(tinylaunch, {
      id: `${projectId}-dev-home`,
      path: '/',
      startedAt: '2026-04-06T15:48:00Z',
      durationMs: 1 * MIN + 35_000,
    }),
    makeSessionNode(tinylaunch, {
      id: `${projectId}-dev-pricing`,
      path: '/pricing',
      startedAt: '2026-04-06T15:50:00Z',
      durationMs: 2 * MIN + 8_000,
    }),
    makeSessionNode(carol, {
      id: `${projectId}-carol-blog`,
      path: '/blog/launch',
      startedAt: '2026-04-06T11:10:00Z',
      durationMs: 5 * MIN + 5_000,
    }),

    // ── Apr 5 — Evan shopping around ────────────────────────────────
    makeSessionNode(evan, {
      id: `${projectId}-evan-pricing`,
      path: '/pricing',
      startedAt: '2026-04-05T11:30:00Z',
      durationMs: 4 * MIN + 22_000,
    }),
    makeSessionNode(bob, {
      id: `${projectId}-bob-features`,
      path: '/features',
      startedAt: '2026-04-05T19:02:00Z',
      durationMs: 1 * MIN + 10_000,
    }),

    // ── Apr 4 — quieter day, one returning visitor ──────────────────
    makeSessionNode(evan, {
      id: `${projectId}-evan-home`,
      path: '/',
      startedAt: '2026-04-04T08:15:00Z',
      durationMs: 55_000,
    }),
    makeSessionNode(alice, {
      id: `${projectId}-alice-docs`,
      path: '/docs/getting-started',
      startedAt: '2026-04-04T20:40:00Z',
      durationMs: 8 * MIN + 30_000,
    }),

    // ── Apr 3 — early week traffic ──────────────────────────────────
    makeSessionNode(carol, {
      id: `${projectId}-carol-home`,
      path: '/',
      startedAt: '2026-04-03T13:05:00Z',
      durationMs: 2 * MIN + 45_000,
    }),
    makeSessionNode(tinylaunch, {
      id: `${projectId}-dev-blog`,
      path: '/blog/launch',
      startedAt: '2026-04-03T17:22:00Z',
      durationMs: 3 * MIN + 18_000,
    }),

    // ── Apr 2 — range start ─────────────────────────────────────────
    makeSessionNode(bob, {
      id: `${projectId}-bob-home-early`,
      path: '/',
      startedAt: '2026-04-02T10:12:00Z',
      durationMs: 1 * MIN + 5_000,
    }),
    makeSessionNode(alice, {
      id: `${projectId}-alice-signup-path`,
      path: '/signup',
      startedAt: '2026-04-02T14:55:00Z',
      durationMs: 3 * MIN + 40_000,
    }),

    // ── Events around those visits — logins, sign-ups, payments ─────
    makeEventNode(alice, {
      id: `${projectId}-alice-login`,
      source: 'posthog',
      eventKey: 'logged_in',
      eventLabel: 'Logged in',
      occurredAt: '2026-04-08T14:02:00Z',
      properties: { method: 'google' },
    }),
    makeEventNode(alice, {
      id: `${projectId}-alice-payment`,
      source: 'stripe',
      eventKey: 'charge_succeeded',
      eventLabel: 'Payment',
      occurredAt: '2026-04-08T14:12:30Z',
      properties: { amount: 4900, currency: 'usd', status: 'succeeded' },
    }),
    makeEventNode(carol, {
      id: `${projectId}-carol-signup`,
      source: 'posthog',
      eventKey: 'signed_up',
      eventLabel: 'Signed up',
      occurredAt: '2026-04-07T09:35:00Z',
      properties: { method: 'GitHub' },
    }),
    makeEventNode(evan, {
      id: `${projectId}-evan-checkout`,
      source: 'posthog',
      eventKey: 'checkout_started',
      eventLabel: 'Checkout started',
      occurredAt: '2026-04-07T18:45:00Z',
    }),
    makeEventNode(tinylaunch, {
      id: `${projectId}-dev-signup`,
      source: 'posthog',
      eventKey: 'signed_up',
      eventLabel: 'Signed up',
      occurredAt: '2026-04-06T15:53:00Z',
      properties: { method: 'email' },
    }),
    makeEventNode(evan, {
      id: `${projectId}-evan-payment`,
      source: 'stripe',
      eventKey: 'charge_succeeded',
      eventLabel: 'Payment',
      occurredAt: '2026-04-05T11:36:00Z',
      properties: { amount: 2900, currency: 'usd', status: 'succeeded' },
    }),
    makeEventNode(bob, {
      id: `${projectId}-bob-signup`,
      source: 'posthog',
      eventKey: 'signed_up',
      eventLabel: 'Signed up',
      occurredAt: '2026-04-05T19:04:00Z',
      properties: { method: 'email' },
    }),
    makeEventNode(alice, {
      id: `${projectId}-alice-signup`,
      source: 'posthog',
      eventKey: 'signed_up',
      eventLabel: 'Signed up',
      occurredAt: '2026-04-02T14:59:00Z',
      properties: { method: 'google' },
    }),
  ].sort((a, b) => +new Date(a.at) - +new Date(b.at))
}
