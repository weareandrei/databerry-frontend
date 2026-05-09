/**
 * Static mock data for the interactable demo on the landing page.
 *
 * The demo runs entirely client-side — no Supabase, no backend.
 * Everything in this file is hand-crafted to look plausible for the
 * two showcase projects ("Acme SaaS" + "Side Project") so a visitor
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
  PosthogFunnelStep,
  StripeTopCustomer,
} from '@/lib/api'

// ─── Projects ─────────────────────────────────────────────────────────────

export interface DemoProject {
  id: string
  name: string
  websiteUrl?: string | null
}

export const INITIAL_PROJECTS: DemoProject[] = [
  { id: 'proj-acme', name: 'Acme SaaS', websiteUrl: 'https://acme.example.com' },
  { id: 'proj-side', name: 'Side Project', websiteUrl: null },
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
  { id: 'conn-stripe-side', name: 'Stripe · Side', type: 'stripe_manual', projectId: 'proj-side' },
  { id: 'conn-posthog-acme', name: 'PostHog · Acme', type: 'posthog', projectId: 'proj-acme' },
  { id: 'conn-posthog-side', name: 'PostHog · Side', type: 'posthog', projectId: 'proj-side' },
  { id: 'conn-calendly', name: 'Calendly', type: 'calendly', projectId: null },
  { id: 'conn-ga-acme', name: 'Google Analytics · Acme', type: 'google_analytics', projectId: 'proj-acme' },
  { id: 'conn-ga-side', name: 'Google Analytics · Side', type: 'google_analytics', projectId: 'proj-side' },
]

// ─── Demo source palette ──────────────────────────────────────────────────
//
// Brand-led colour scheme for the Overview chart's stacked bars + the
// sources / users lists. The DOMINANT source ('direct') gets brand
// orange `#F46719` — same colour `--c-brand` carries everywhere else
// in the product so the demo reads as "this is Databerry" at a
// glance. A second saturated orange ('organic' = orange-400) and two
// neutral slates fill the rest so adjacent stacked segments still
// differentiate visually without diluting the brand-first impression.
//
// (Earlier draft used pale `orange-300` / `orange-200` shades that
// looked washed-out next to the brand cream surface; those got
// replaced after the user flagged them as "strange pale orange".)
//
// Note: `OverviewChart.tsx` still draws its secondary-metric overlay
// line at `#F46719`. Where the line crosses the dominant `direct`
// bars they share a hue, but the line is a thin stroke on top — easy
// to read against either the orange or the slate segments below.
//
// Adding a new source: pick the next warm/neutral shade and keep the
// same colour for the same source key across `acmeChart`, `sideChart`,
// `acmeSources`, `sideSources`, `acmeUsers`, `sideUsers` so a visitor
// reading the chart and then the sources list sees the same colour for
// the same channel.
const DEMO_SOURCE_COLOR = {
  direct:   '#F46719', // brand orange — the primary bar
  organic:  '#FB923C', // orange-400  — saturated companion, tone-on-tone
  referral: '#94A3B8', // slate-400   — neutral, recedes
  social:   '#CBD5E1', // slate-300   — even quieter neutral for the smallest segment
} as const

// ─── Overview chart data (one per project, two metric mixes) ──────────────

const acmeChart: OverviewChartResponse = {
  buckets: [
    { label: 'Mon', total: 1240, bySource: [
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 540 },
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 420 },
      { source: 'referral', label: 'Referral', color: DEMO_SOURCE_COLOR.referral, value: 280 },
    ], secondary: 3.4 },
    { label: 'Tue', total: 1480, bySource: [
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 620 },
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 510 },
      { source: 'referral', label: 'Referral', color: DEMO_SOURCE_COLOR.referral, value: 350 },
    ], secondary: 4.1 },
    { label: 'Wed', total: 1620, bySource: [
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 700 },
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 540 },
      { source: 'referral', label: 'Referral', color: DEMO_SOURCE_COLOR.referral, value: 380 },
    ], secondary: 5.2 },
    { label: 'Thu', total: 1810, bySource: [
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 770 },
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 620 },
      { source: 'referral', label: 'Referral', color: DEMO_SOURCE_COLOR.referral, value: 420 },
    ], secondary: 4.8 },
    { label: 'Fri', total: 2110, bySource: [
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 920 },
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 720 },
      { source: 'referral', label: 'Referral', color: DEMO_SOURCE_COLOR.referral, value: 470 },
    ], secondary: 5.6 },
    { label: 'Sat', total: 1320, bySource: [
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 590 },
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 440 },
      { source: 'referral', label: 'Referral', color: DEMO_SOURCE_COLOR.referral, value: 290 },
    ], secondary: 3.1 },
    { label: 'Sun', total: 1180, bySource: [
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 530 },
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 390 },
      { source: 'referral', label: 'Referral', color: DEMO_SOURCE_COLOR.referral, value: 260 },
    ], secondary: 2.9 },
  ],
  totalPrimary: 10760,
  totalSecondary: 4.2,
  trafficProvider: 'posthog',
}

const sideChart: OverviewChartResponse = {
  buckets: [
    { label: 'Mon', total: 320, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 180 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 90 },
      { source: 'social',   label: 'Social',   color: DEMO_SOURCE_COLOR.social, value: 50 },
    ], secondary: null },
    { label: 'Tue', total: 410, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 220 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 130 },
      { source: 'social',   label: 'Social',   color: DEMO_SOURCE_COLOR.social, value: 60 },
    ], secondary: null },
    { label: 'Wed', total: 380, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 200 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 120 },
      { source: 'social',   label: 'Social',   color: DEMO_SOURCE_COLOR.social, value: 60 },
    ], secondary: null },
    { label: 'Thu', total: 510, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 270 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 160 },
      { source: 'social',   label: 'Social',   color: DEMO_SOURCE_COLOR.social, value: 80 },
    ], secondary: null },
    { label: 'Fri', total: 470, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 250 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 140 },
      { source: 'social',   label: 'Social',   color: DEMO_SOURCE_COLOR.social, value: 80 },
    ], secondary: null },
    { label: 'Sat', total: 290, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 160 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 90 },
      { source: 'social',   label: 'Social',   color: DEMO_SOURCE_COLOR.social, value: 40 },
    ], secondary: null },
    { label: 'Sun', total: 230, bySource: [
      { source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, value: 130 },
      { source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, value: 70 },
      { source: 'social',   label: 'Social',   color: DEMO_SOURCE_COLOR.social, value: 30 },
    ], secondary: null },
  ],
  totalPrimary: 2610,
  totalSecondary: null,
  trafficProvider: 'posthog',
}

export const MOCK_OVERVIEW_CHARTS: Record<string, OverviewChartResponse> = {
  'proj-acme': acmeChart,
  'proj-side': sideChart,
}

// ─── Overview sources / users (one set per project) ───────────────────────

const acmeSources: OverviewSource[] = [
  { source: 'organic',  label: 'Organic search', color: DEMO_SOURCE_COLOR.organic, visitors: 4670, share: 0.43 },
  { source: 'direct',   label: 'Direct',         color: DEMO_SOURCE_COLOR.direct, visitors: 3640, share: 0.34 },
  { source: 'referral', label: 'Referral',       color: DEMO_SOURCE_COLOR.referral, visitors: 2450, share: 0.23 },
]

const sideSources: OverviewSource[] = [
  { source: 'direct',   label: 'Direct',         color: DEMO_SOURCE_COLOR.direct, visitors: 1410, share: 0.54 },
  { source: 'organic',  label: 'Organic search', color: DEMO_SOURCE_COLOR.organic, visitors: 800,  share: 0.31 },
  { source: 'social',   label: 'Social',         color: DEMO_SOURCE_COLOR.social, visitors: 400,  share: 0.15 },
]

const acmeUsers: OverviewUser[] = [
  { pseudoId: 'alice@acme.dev',     source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, sessionSec: 412, lastSeen: '2026-04-08T13:14:00Z' },
  { pseudoId: 'bob@startup.io',     source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, sessionSec: 268, lastSeen: '2026-04-08T12:41:00Z' },
  { pseudoId: 'carol@studio.com',   source: 'referral', label: 'Referral', color: DEMO_SOURCE_COLOR.referral, sessionSec: 195, lastSeen: '2026-04-08T11:28:00Z' },
  { pseudoId: 'd9c41a8b-6e7f-…',    source: 'organic',  label: 'Organic',  color: DEMO_SOURCE_COLOR.organic, sessionSec: 73,  lastSeen: '2026-04-08T10:56:00Z' },
  { pseudoId: 'evan@example.com',   source: 'direct',   label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, sessionSec: 322, lastSeen: '2026-04-08T10:12:00Z' },
]

const sideUsers: OverviewUser[] = [
  { pseudoId: 'fran@hello.dev',     source: 'direct', label: 'Direct',   color: DEMO_SOURCE_COLOR.direct, sessionSec: 188, lastSeen: '2026-04-08T13:40:00Z' },
  { pseudoId: '0f9c-1abe-…',        source: 'organic', label: 'Organic', color: DEMO_SOURCE_COLOR.organic, sessionSec: 51,  lastSeen: '2026-04-08T12:09:00Z' },
  { pseudoId: 'gina@team.app',      source: 'social', label: 'Social',   color: DEMO_SOURCE_COLOR.social, sessionSec: 304, lastSeen: '2026-04-08T11:01:00Z' },
]

export const MOCK_OVERVIEW_SOURCES: Record<string, OverviewSource[]> = {
  'proj-acme': acmeSources,
  'proj-side': sideSources,
}

export const MOCK_OVERVIEW_USERS: Record<string, OverviewUser[]> = {
  'proj-acme': acmeUsers,
  'proj-side': sideUsers,
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
