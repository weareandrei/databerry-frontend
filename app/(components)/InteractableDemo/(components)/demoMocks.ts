/**
 * Static mock data for the interactable demo on the landing page.
 *
 * The demo runs entirely client-side — no Supabase, no backend.
 * Everything in this file is hand-crafted to look plausible for the
 * two showcase projects ("Acme" + "Initech") so a visitor
 * scrolling the demo card sees realistic numbers across every view
 * type the real product supports.
 *
 * Numbers were chosen with two goals in mind:
 *   - Asymmetric between the two projects (Project B is leaner)
 *   - Self-consistent (e.g. Stripe gross-volume bars sum near the
 *     headline total, MRR fits a small-but-growing SaaS, etc.)
 *
 * No date-range awareness — the demo's date pill is purely cosmetic;
 * tiles re-render with the same mock numbers regardless of selection.
 * Mocking proper date pivots was deemed out of scope.
 */

import type {
  CalendlyMeeting,
  OverviewChartResponse,
  OverviewSource,
  OverviewUser,
  OverviewCountry,
  PosthogFunnelStep,
  SentryIssue,
  StripeTopCustomer,
} from '@/lib/api'

// ─── Projects ─────────────────────────────────────────────────────────────

export interface DemoProject {
  id: string
  name: string
  websiteUrl?: string | null
  /** Static logo under `/public` — preferred over favicon in the demo. */
  logoSrc?: string | null
}

export const INITIAL_PROJECTS: DemoProject[] = [
  {
    id: 'proj-acme',
    name: 'Acme',
    websiteUrl: 'https://acme.app',
    logoSrc: '/demo/acme_logo.png',
  },
  {
    id: 'proj-side',
    name: 'Initech',
    websiteUrl: 'https://initech.com',
    logoSrc: '/demo/initech_demo.png',
  },
]

// ─── Folders (per project) ────────────────────────────────────────────────

export interface DemoFolder {
  id: string
  name: string
  projectId: string
  parentId: string | null
}

// Folder structure was overhauled:
//   - Acme used to have a generic "Main" wrapper with "Marketing" nested
//     inside it, which made every project navigation start with one
//     redundant level. Flattened to TWO descriptive top-level folders
//     ("Marketing" + "Revenue") so a visitor sees the org-by-team
//     pattern immediately instead of an empty "Main" container.
//   - Side Project used to have a "Main" folder containing every tile.
//     Removed entirely per latest spec — Side now displays as a flat
//     project (no folder grid, all tiles directly under the project
//     header) to read as a leaner showcase next to Acme.
//
// Note: the Side views still carry `folderId: 'fld-side-root'` strings
// — those references are now orphan but harmless. `<DemoProjectView>`
// shows ALL tiles at project-root (no folderId match required); the
// folderId only matters once a user navigates INTO a folder, which
// can no longer happen on Side. Migrating the orphan strings out is
// not worth the churn.
export const INITIAL_FOLDERS: DemoFolder[] = [
  { id: 'fld-acme-marketing', name: 'Marketing', projectId: 'proj-acme', parentId: null },
  { id: 'fld-acme-revenue',   name: 'Revenue',   projectId: 'proj-acme', parentId: null },
]

// ─── Connections ──────────────────────────────────────────────────────────

export interface DemoConnection {
  id: string
  name: string
  type: string
  /** When non-null, scoped to a single project. Null = "Common" (shared). */
  projectId: string | null
}

export const INITIAL_CONNECTIONS: DemoConnection[] = [
  { id: 'conn-stripe-acme', name: 'Stripe · Acme', type: 'stripe_manual', projectId: 'proj-acme' },
  { id: 'conn-stripe-side', name: 'Stripe · Initech', type: 'stripe_manual', projectId: 'proj-side' },
  { id: 'conn-posthog-acme', name: 'PostHog · Acme', type: 'posthog', projectId: 'proj-acme' },
  { id: 'conn-posthog-side', name: 'PostHog · Initech', type: 'posthog', projectId: 'proj-side' },
  { id: 'conn-calendly', name: 'Calendly', type: 'calendly', projectId: null },
  { id: 'conn-ga-acme', name: 'Google Analytics · Acme', type: 'google_analytics', projectId: 'proj-acme' },
  { id: 'conn-ga-side', name: 'Google Analytics · Initech', type: 'google_analytics', projectId: 'proj-side' },
  { id: 'conn-sentry-acme', name: 'Sentry · Acme', type: 'sentry', projectId: 'proj-acme' },
  { id: 'conn-sentry-side', name: 'Sentry · Initech', type: 'sentry', projectId: 'proj-side' },
]

// ─── Demo source palette ──────────────────────────────────────────────────
//
// Mirrors `SOURCE_STYLE` in `constants/trafficSources.ts` for the
// keys the demo emits: real-mode `<OverviewChart>` and
// `<OverviewSourcesPanel>` look colours up from `SOURCE_STYLE` for
// known keys (and our entries are all known), so these data-side
// values are what's used during the brief flash before the
// CSV-derived chart takes over.
//
// Source keys + brand colours:
//   organic     — generic SEO traffic, amber-500 (warm gold)
//   direct      — neutral slate, recedes
//   reddit      — brand orange `#F46719` (= our brand)
//   x           — X wordmark dark `#1f2937`
//   producthunt — PH brand red-orange `#DA552F`
//
// Earlier drafts used generic `referral` / `social` keys that fell
// through to a hash-picked pastel palette (which the user called
// "strange pale orange / ugly grey"). Replaced with these specific
// branded keys so the chart reads as actual product channels.
const DEMO_SOURCE_COLOR = {
  organic:     '#F59E0B', // amber-500    — warm gold
  direct:      '#94a3b8', // slate-400    — neutral, recedes
  reddit:      '#FF4500', // Reddit brand orange
  x:           '#1f2937', // X wordmark
  producthunt: '#DA552F', // PH brand red-orange
} as const

// ─── Overview chart data (one per project, two metric mixes) ──────────────

// Static fallback used only during the brief CSV-fetch window. Once
// `loadDemoTimeSeries()` resolves, `DemoContext.buildOverviewChart`
// takes over with date-aware data sliced from the time series.
//
// Source mix mirrors the CSV's columns: organic + direct + reddit + x
// + producthunt. Numbers are smaller (one-week sample) so the
// fallback paints something plausible while the real data lands.
function acmeBucket(label: string, organic: number, direct: number, reddit: number, x: number, ph: number, conv: number) {
  return {
    label,
    total: organic + direct + reddit + x + ph,
    bySource: [
      { source: 'organic',     label: 'Organic',     color: DEMO_SOURCE_COLOR.organic,     value: organic },
      { source: 'direct',      label: 'Direct',      color: DEMO_SOURCE_COLOR.direct,      value: direct },
      { source: 'reddit',      label: 'Reddit',      color: DEMO_SOURCE_COLOR.reddit,      value: reddit },
      { source: 'x',           label: 'x.com',       color: DEMO_SOURCE_COLOR.x,           value: x },
      { source: 'producthunt', label: 'ProductHunt', color: DEMO_SOURCE_COLOR.producthunt, value: ph },
    ],
    secondary: conv,
  }
}

const acmeChart: OverviewChartResponse = {
  buckets: [
    acmeBucket('Mon', 540, 320, 180, 130,  70, 1840),
    acmeBucket('Tue', 620, 380, 220, 160,  90, 2210),
    acmeBucket('Wed', 700, 410, 240, 180, 100, 2680),
    acmeBucket('Thu', 770, 470, 270, 200, 110, 2940),
    acmeBucket('Fri', 920, 540, 320, 240, 130, 3420),
    acmeBucket('Sat', 590, 320, 180, 130,  70, 1680),
    acmeBucket('Sun', 530, 290, 160, 110,  60, 1520),
  ],
  // Sums match the per-row totals so chart header totals stay consistent.
  totalPrimary:  4670 + 2730 + 1570 + 1150 + 630, // = 10750
  totalSecondary: 16290,
  trafficProvider: 'posthog',
}

const sideChart: OverviewChartResponse = {
  buckets: [
    { label: 'Mon', total: 320, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 180 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 90 },
      { source: 'reddit',   label: 'Reddit',   color: DEMO_SOURCE_COLOR.reddit, value: 50 },
    ], secondary: 420 },
    { label: 'Tue', total: 410, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 220 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 130 },
      { source: 'reddit',   label: 'Reddit',   color: DEMO_SOURCE_COLOR.reddit, value: 60 },
    ], secondary: 580 },
    { label: 'Wed', total: 380, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 200 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 120 },
      { source: 'reddit',   label: 'Reddit',   color: DEMO_SOURCE_COLOR.reddit, value: 60 },
    ], secondary: 510 },
    { label: 'Thu', total: 510, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 270 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 160 },
      { source: 'reddit',   label: 'Reddit',   color: DEMO_SOURCE_COLOR.reddit, value: 80 },
    ], secondary: 740 },
    { label: 'Fri', total: 470, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 250 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 140 },
      { source: 'reddit',   label: 'Reddit',   color: DEMO_SOURCE_COLOR.reddit, value: 80 },
    ], secondary: 690 },
    { label: 'Sat', total: 290, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 160 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 90 },
      { source: 'reddit',   label: 'Reddit',   color: DEMO_SOURCE_COLOR.reddit, value: 40 },
    ], secondary: 310 },
    { label: 'Sun', total: 230, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 130 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 70 },
      { source: 'reddit',   label: 'Reddit',   color: DEMO_SOURCE_COLOR.reddit, value: 30 },
    ], secondary: 240 },
  ],
  totalPrimary: 2610,
  totalSecondary: 3490,
  trafficProvider: 'posthog',
}

export const MOCK_OVERVIEW_CHARTS: Record<string, OverviewChartResponse> = {
  'proj-acme': acmeChart,
  'proj-side': sideChart,
}

// ─── Overview sources / users (one set per project) ───────────────────────

const acmeSources: OverviewSource[] = [
  { source: 'organic',     label: 'Organic search', color: DEMO_SOURCE_COLOR.organic,     visitors: 4670, share: 0.41 },
  { source: 'direct',      label: 'Direct',         color: DEMO_SOURCE_COLOR.direct,      visitors: 3120, share: 0.27 },
  { source: 'reddit',      label: 'Reddit',         color: DEMO_SOURCE_COLOR.reddit,      visitors: 1620, share: 0.14 },
  { source: 'x',           label: 'x.com',          color: DEMO_SOURCE_COLOR.x,           visitors: 1240, share: 0.11 },
  { source: 'producthunt', label: 'ProductHunt',    color: DEMO_SOURCE_COLOR.producthunt, visitors:  840, share: 0.07 },
]

const sideSources: OverviewSource[] = [
  { source: 'organic', label: 'Organic search', color: DEMO_SOURCE_COLOR.organic, visitors: 1180, share: 0.45 },
  { source: 'direct',  label: 'Direct',         color: DEMO_SOURCE_COLOR.direct,  visitors:  790, share: 0.30 },
  { source: 'reddit',  label: 'Reddit',         color: DEMO_SOURCE_COLOR.reddit,  visitors:  640, share: 0.25 },
]

const acmeUsers: OverviewUser[] = [
  { pseudoId: 'alice@acme.dev',     source: 'organic',     label: 'Organic',     color: DEMO_SOURCE_COLOR.organic,     sessionSec: 412, lastSeen: '2026-04-08T13:14:00Z' },
  { pseudoId: 'bob@startup.io',     source: 'direct',      label: 'Direct',      color: DEMO_SOURCE_COLOR.direct,      sessionSec: 268, lastSeen: '2026-04-08T12:41:00Z' },
  { pseudoId: 'carol@studio.com',   source: 'reddit',      label: 'Reddit',      color: DEMO_SOURCE_COLOR.reddit,      sessionSec: 195, lastSeen: '2026-04-08T11:28:00Z' },
  { pseudoId: 'd9c41a8b-6e7f-…',    source: 'producthunt', label: 'ProductHunt', color: DEMO_SOURCE_COLOR.producthunt, sessionSec:  73, lastSeen: '2026-04-08T10:56:00Z' },
  { pseudoId: 'evan@example.com',   source: 'x',           label: 'x.com',       color: DEMO_SOURCE_COLOR.x,           sessionSec: 322, lastSeen: '2026-04-08T10:12:00Z' },
]

const sideUsers: OverviewUser[] = [
  { pseudoId: 'fran@hello.dev', source: 'direct',  label: 'Direct',  color: DEMO_SOURCE_COLOR.direct,  sessionSec: 188, lastSeen: '2026-04-08T13:40:00Z' },
  { pseudoId: '0f9c-1abe-…',    source: 'organic', label: 'Organic', color: DEMO_SOURCE_COLOR.organic, sessionSec:  51, lastSeen: '2026-04-08T12:09:00Z' },
  { pseudoId: 'gina@team.app',  source: 'reddit',  label: 'Reddit',  color: DEMO_SOURCE_COLOR.reddit,  sessionSec: 304, lastSeen: '2026-04-08T11:01:00Z' },
]

export const MOCK_OVERVIEW_SOURCES: Record<string, OverviewSource[]> = {
  'proj-acme': acmeSources,
  'proj-side': sideSources,
}

export const MOCK_OVERVIEW_USERS: Record<string, OverviewUser[]> = {
  'proj-acme': acmeUsers,
  'proj-side': sideUsers,
}

// ─── Countries (overview tab — replaced Users) ────────────────────────────
// ISO 3166-1 alpha-2 codes — required for `country-flag-icons` to render
// the right flag. Shares are precomputed so the panel matches what the
// real backend serves.
const acmeCountries: OverviewCountry[] = [
  { countryCode: 'US', countryName: 'United States',   visitors: 5240, share: 0.46 },
  { countryCode: 'GB', countryName: 'United Kingdom',  visitors: 1480, share: 0.13 },
  { countryCode: 'DE', countryName: 'Germany',         visitors: 1120, share: 0.10 },
  { countryCode: 'CA', countryName: 'Canada',          visitors:  890, share: 0.08 },
  { countryCode: 'FR', countryName: 'France',          visitors:  640, share: 0.06 },
  { countryCode: 'AU', countryName: 'Australia',       visitors:  530, share: 0.05 },
  { countryCode: 'NL', countryName: 'Netherlands',     visitors:  380, share: 0.03 },
  { countryCode: 'IN', countryName: 'India',           visitors:  310, share: 0.03 },
  { countryCode: 'BR', countryName: 'Brazil',          visitors:  220, share: 0.02 },
  { countryCode: 'JP', countryName: 'Japan',           visitors:  180, share: 0.02 },
  { countryCode: 'SE', countryName: 'Sweden',          visitors:  150, share: 0.01 },
  { countryCode: 'ES', countryName: 'Spain',           visitors:  130, share: 0.01 },
]

const sideCountries: OverviewCountry[] = [
  { countryCode: 'US', countryName: 'United States',  visitors: 1280, share: 0.49 },
  { countryCode: 'GB', countryName: 'United Kingdom', visitors:  410, share: 0.16 },
  { countryCode: 'DE', countryName: 'Germany',        visitors:  290, share: 0.11 },
  { countryCode: 'CA', countryName: 'Canada',         visitors:  220, share: 0.08 },
  { countryCode: 'AU', countryName: 'Australia',      visitors:  170, share: 0.06 },
  { countryCode: 'NL', countryName: 'Netherlands',    visitors:  140, share: 0.05 },
  { countryCode: 'FR', countryName: 'France',         visitors:  100, share: 0.04 },
]

export const MOCK_OVERVIEW_COUNTRIES: Record<string, OverviewCountry[]> = {
  'proj-acme': acmeCountries,
  'proj-side': sideCountries,
}

// ─── Stripe gross-volume charts (per project) ─────────────────────────────

export interface DemoChartPoint {
  label: string
  value: number  // cents
}

export const MOCK_STRIPE_GROSS: Record<string, { chartTotal: number; chartPoints: DemoChartPoint[] }> = {
  'proj-acme': {
    chartTotal: 1820000,
    chartPoints: [
      { label: 'Mon', value: 210000 },
      { label: 'Tue', value: 340000 },
      { label: 'Wed', value: 290000 },
      { label: 'Thu', value: 410000 },
      { label: 'Fri', value: 380000 },
      { label: 'Sat', value: 110000 },
      { label: 'Sun', value: 80000 },
    ],
  },
  'proj-side': {
    chartTotal: 184000,
    chartPoints: [
      { label: 'Mon', value: 22000 },
      { label: 'Tue', value: 31000 },
      { label: 'Wed', value: 28000 },
      { label: 'Thu', value: 35000 },
      { label: 'Fri', value: 33000 },
      { label: 'Sat', value: 19000 },
      { label: 'Sun', value: 16000 },
    ],
  },
}

// Single-tile generic Stripe chart (used when picking "Stripe gross today"
// from the create-view modal — same shape as before).
export const MOCK_STRIPE_CHARTS: Record<
  string,
  { chartTotal: number; chartPoints: DemoChartPoint[] }
> = {
  stripe_gross_today: {
    chartTotal: 284000,
    chartPoints: [
      { label: '8am',  value: 12000 },
      { label: '10am', value: 31000 },
      { label: '12pm', value: 58000 },
      { label: '2pm',  value: 44000 },
      { label: '4pm',  value: 72000 },
      { label: '6pm',  value: 67000 },
    ],
  },
  stripe_gross_week: MOCK_STRIPE_GROSS['proj-acme']!,
}

// ─── Stripe top customers (Project B uses this) ──────────────────────────

export const MOCK_STRIPE_TOP_CUSTOMERS: StripeTopCustomer[] = [
  { customerId: 'cus_AlphaCo',     name: 'Alpha Co',           email: 'ops@alpha.example',     addressCity: 'Austin',     addressCountry: 'US', amountCents: 248000 },
  { customerId: 'cus_BetaInc',     name: 'Beta Inc',           email: 'billing@beta.example',  addressCity: 'Berlin',     addressCountry: 'DE', amountCents: 192000 },
  { customerId: 'cus_GammaLLC',    name: null,                 email: 'gamma@gamma.example',   addressCity: null,         addressCountry: 'CA', amountCents: 138000 },
  { customerId: 'cus_DeltaCorp',   name: 'Delta Corp',         email: null,                    addressCity: 'Tokyo',      addressCountry: 'JP', amountCents: 102000 },
  { customerId: 'cus_EpsilonStu',  name: 'Epsilon Studio',     email: 'hi@epsilon.example',    addressCity: 'Bucharest',  addressCountry: 'RO', amountCents:  84000 },
]

// ─── Calendly meetings (Project A pinned) ────────────────────────────────

const TODAY = '2026-04-08'

export const MOCK_CALENDLY_MEETINGS: CalendlyMeeting[] = [
  {
    startTime: `${TODAY}T09:00:00Z`,
    endTime:   `${TODAY}T09:30:00Z`,
    name: 'Onboarding · Acme',
    bookingUri: '#',
    description: null,
    invitees: [{ name: 'Alice Johnson', email: 'alice@acme.dev' }],
  },
  {
    startTime: `${TODAY}T11:00:00Z`,
    endTime:   `${TODAY}T11:45:00Z`,
    name: 'Product Demo',
    bookingUri: '#',
    description: null,
    invitees: [{ name: 'Bob Smith', email: 'bob@startup.io' }],
  },
  {
    startTime: `${TODAY}T14:30:00Z`,
    endTime:   `${TODAY}T15:00:00Z`,
    name: 'Strategy Review',
    bookingUri: '#',
    description: null,
    invitees: [{ name: 'Carol White', email: 'carol@studio.com' }],
  },
]

// ─── PostHog funnel (Project A) ──────────────────────────────────────────

export const MOCK_POSTHOG_FUNNEL: PosthogFunnelStep[] = [
  { name: 'Landing visit',     count: 8420, conversionFromStart: 1.0,    conversionFromPrev: 1.0 },
  { name: 'Sign-up started',   count: 3290, conversionFromStart: 0.391,  conversionFromPrev: 0.391 },
  { name: 'Email confirmed',   count: 2710, conversionFromStart: 0.322,  conversionFromPrev: 0.823 },
  { name: 'First action',      count: 1840, conversionFromStart: 0.219,  conversionFromPrev: 0.679 },
  { name: 'Paid plan picked',  count:  612, conversionFromStart: 0.073,  conversionFromPrev: 0.333 },
]

// ─── PostHog single-value events (used by both projects) ─────────────────

export const MOCK_POSTHOG_EVENTS: { name: string; mockValue: string; volume: number }[] = [
  { name: 'user_signed_up',       mockValue: '2841',  volume: 2841 },
  { name: 'project_created',      mockValue: '834',   volume: 834 },
  { name: 'dashboard_viewed',     mockValue: '12049', volume: 12049 },
  { name: 'export_csv',           mockValue: '391',   volume: 391 },
  { name: 'api_call',             mockValue: '48203', volume: 48203 },
  { name: 'payment_completed',    mockValue: '1293',  volume: 1293 },
  { name: 'onboarding_finished',  mockValue: '712',   volume: 712 },
  { name: 'feature_flag_called',  mockValue: '5621',  volume: 5621 },
]

// ─── Sentry issues (one set per project) ──────────────────────────────────
//
// Acme — a busier SaaS, so the list reads as a fuller picture: a
// hot stripe-webhook payload bug at the top, a couple of warnings,
// and a stale "info" row near the bottom. Counts span three orders
// of magnitude because that's what a real Sentry issue list looks
// like — one or two outlier errors dwarfing the long tail.
//
// Side — a leaner project, so fewer issues + smaller counts. Mix
// of one fatal and a few warnings; designed to read at a glance.
//
// `lastSeen` / `firstSeen` are anchored relative to the demo's
// `TODAY` (`2026-04-08`) so the in-tile "Xm ago" labels render
// sensibly regardless of which demo `period` filter is active.
// Counts are stringified (matching Sentry's actual wire shape —
// the `count` field comes back as a string from `/issues/`).
// `permalink` points to `#` — clicking the row opens a no-op
// rather than navigating off the landing page.

export const MOCK_SENTRY_ISSUES_ACME: SentryIssue[] = [
  {
    id: 'iss-acme-1',
    title: "TypeError: Cannot read properties of undefined (reading 'amount')",
    count: '2841',
    level: 'error',
    status: 'unresolved',
    firstSeen: '2026-04-01T08:14:00Z',
    lastSeen:  '2026-04-08T13:42:00Z',
    permalink: '#',
  },
  {
    id: 'iss-acme-2',
    title: 'StripeInvalidRequestError: No such customer: cus_NoLongerExists',
    count: '614',
    level: 'error',
    status: 'unresolved',
    firstSeen: '2026-04-04T10:02:00Z',
    lastSeen:  '2026-04-08T13:10:00Z',
    permalink: '#',
  },
  {
    id: 'iss-acme-3',
    title: 'Webhook signature verification failed (stripe.charge.succeeded)',
    count: '293',
    level: 'warning',
    status: 'unresolved',
    firstSeen: '2026-04-06T09:21:00Z',
    lastSeen:  '2026-04-08T12:58:00Z',
    permalink: '#',
  },
  {
    id: 'iss-acme-4',
    title: 'ResizeObserver loop completed with undelivered notifications',
    count: '128',
    level: 'warning',
    status: 'unresolved',
    firstSeen: '2026-03-29T15:40:00Z',
    lastSeen:  '2026-04-08T11:35:00Z',
    permalink: '#',
  },
  {
    id: 'iss-acme-5',
    title: 'UnhandledPromiseRejection: Failed to fetch /api/billing/invoices',
    count: '74',
    level: 'error',
    status: 'unresolved',
    firstSeen: '2026-04-02T11:00:00Z',
    lastSeen:  '2026-04-08T09:14:00Z',
    permalink: '#',
  },
  {
    id: 'iss-acme-6',
    title: 'Slow query: select * from subscriptions where account_id = $1',
    count: '41',
    level: 'info',
    status: 'unresolved',
    firstSeen: '2026-04-05T07:55:00Z',
    lastSeen:  '2026-04-07T16:08:00Z',
    permalink: '#',
  },
]

export const MOCK_SENTRY_ISSUES_SIDE: SentryIssue[] = [
  {
    id: 'iss-side-1',
    title: "RangeError: Maximum call stack size exceeded in renderDashboard",
    count: '38',
    level: 'fatal',
    status: 'unresolved',
    firstSeen: '2026-04-08T05:12:00Z',
    lastSeen:  '2026-04-08T13:21:00Z',
    permalink: '#',
  },
  {
    id: 'iss-side-2',
    title: 'NetworkError: Failed to load chunk 4 (chunk-DPRX9.js)',
    count: '17',
    level: 'warning',
    status: 'unresolved',
    firstSeen: '2026-04-07T22:08:00Z',
    lastSeen:  '2026-04-08T12:44:00Z',
    permalink: '#',
  },
  {
    id: 'iss-side-3',
    title: 'Hydration mismatch: text content does not match server-rendered HTML',
    count: '9',
    level: 'warning',
    status: 'unresolved',
    firstSeen: '2026-04-06T18:20:00Z',
    lastSeen:  '2026-04-08T10:02:00Z',
    permalink: '#',
  },
]
