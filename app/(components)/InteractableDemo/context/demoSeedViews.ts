/**
 * Seed view data for the two showcase projects on the demo dashboard.
 *
 * Each `DemoView` is a discriminated union by `kind`:
 *   - 'value'             → single number → `<ViewCard>`
 *   - 'chart'             → bar chart → `<ViewCardChart>`
 *   - 'meetings'          → Calendly list → `<ViewCardList>`
 *   - 'customers'         → Stripe top customers → `<ViewCardCustomerList>`
 *   - 'funnel'            → PostHog funnel → `<ViewCardFunnel>`
 *   - 'overview-chart'    → composite project overview chart
 *   - 'overview-sources'  → composite project overview sources/users
 *
 * Project A (Acme SaaS) — bigger / fuller coverage:
 *     overview, funnel, MRR, gross volume, calendly, 2 posthog events.
 * Project B (Side Project) — leaner showcase:
 *     overview, pageviews, customers, gross volume, 1 posthog event.
 *
 * Pinned set: MRR + Calendly meetings (Project A) + Pageviews
 * (Project B) — three pinned tiles, one row in the demo card width.
 */

import {
  MOCK_CALENDLY_MEETINGS,
  MOCK_POSTHOG_FUNNEL,
  MOCK_STRIPE_GROSS,
  MOCK_STRIPE_TOP_CUSTOMERS,
  type DemoChartPoint,
} from '../demoMocks'
import type {
  CalendlyMeeting,
  PosthogFunnelStep,
  StripeTopCustomer,
} from '@/lib/api'

// ─── Discriminated union — payload shape varies by `kind` ─────────────────

interface DemoViewBase {
  id: string
  name: string
  projectId: string
  folderId: string | null
  /**
   * `null` for overview-chart / overview-sources composites — those
   * tiles live at the project level and don't belong to a single
   * connection. All other kinds reference one of the demo's
   * connections so the tile header can show the integration icon.
   */
  connectionId: string | null
  /**
   * Connection-type label, e.g. 'stripe_manual', 'posthog',
   * 'calendly'. Driven by the demo's `connectionId`; we cache it
   * here so the renderer doesn't have to look up the connection by
   * id at every render.
   */
  connectionType: string
  pinned: boolean
}

export type DemoView =
  | (DemoViewBase & { kind: 'value'; mockValue: string; viewType?: string })
  | (DemoViewBase & {
      kind: 'chart'
      mockValue: string
      chartTotal: number
      chartPoints: DemoChartPoint[]
      viewType: string
    })
  | (DemoViewBase & { kind: 'meetings'; meetings: CalendlyMeeting[] })
  | (DemoViewBase & { kind: 'customers'; customers: StripeTopCustomer[] })
  | (DemoViewBase & { kind: 'funnel'; steps: PosthogFunnelStep[] })
  | (DemoViewBase & { kind: 'overview-chart' })
  | (DemoViewBase & { kind: 'overview-sources' })

// ─── Initial seed views ───────────────────────────────────────────────────

export const INITIAL_VIEWS: DemoView[] = [
  // ── Project A — Acme SaaS ─────────────────────────────────────────────
  {
    id: 'view-acme-overview-chart',
    kind: 'overview-chart',
    name: 'Project Overview',
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: null,
    connectionType: 'project_overview',
    pinned: false,
  },
  {
    id: 'view-acme-overview-sources',
    kind: 'overview-sources',
    name: 'Sources & Users',
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: null,
    connectionType: 'project_overview',
    pinned: false,
  },
  {
    id: 'view-acme-funnel',
    kind: 'funnel',
    name: 'Sign-up funnel',
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: 'conn-posthog-acme',
    connectionType: 'posthog',
    pinned: false,
    steps: MOCK_POSTHOG_FUNNEL,
  },
  {
    id: 'view-acme-mrr',
    kind: 'value',
    name: 'MRR',
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: 'conn-stripe-acme',
    connectionType: 'stripe_manual',
    pinned: true,
    mockValue: '4820000',  // $48,200 in cents
    viewType: 'stripe_mrr',
  },
  {
    id: 'view-acme-gross',
    kind: 'chart',
    name: 'This week gross volume',
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: 'conn-stripe-acme',
    connectionType: 'stripe_manual',
    pinned: false,
    mockValue: String(MOCK_STRIPE_GROSS['proj-acme']!.chartTotal),
    chartTotal: MOCK_STRIPE_GROSS['proj-acme']!.chartTotal,
    chartPoints: MOCK_STRIPE_GROSS['proj-acme']!.chartPoints,
    viewType: 'stripe_gross_week',
  },
  {
    id: 'view-acme-calendly',
    kind: 'meetings',
    name: "Today's calls",
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: 'conn-calendly',
    connectionType: 'calendly',
    pinned: true,
    meetings: MOCK_CALENDLY_MEETINGS,
  },
  {
    id: 'view-acme-signups',
    kind: 'value',
    name: 'user_signed_up',
    projectId: 'proj-acme',
    folderId: 'fld-acme-marketing',
    connectionId: 'conn-posthog-acme',
    connectionType: 'posthog',
    pinned: false,
    mockValue: '2841',
  },
  {
    id: 'view-acme-payments',
    kind: 'value',
    name: 'payment_completed',
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: 'conn-posthog-acme',
    connectionType: 'posthog',
    pinned: false,
    mockValue: '1293',
  },
  // Two GA tiles — one in the Marketing subfolder (Active users, a
  // realtime metric that fits a marketer's daily check) and one at
  // root (Sessions, a higher-level traffic counter). Showcases the
  // GA integration alongside the existing PostHog event tiles in
  // the same project.
  {
    id: 'view-acme-ga-active',
    kind: 'value',
    name: 'Active users right now',
    projectId: 'proj-acme',
    folderId: 'fld-acme-marketing',
    connectionId: 'conn-ga-acme',
    connectionType: 'google_analytics',
    pinned: false,
    mockValue: '128',
    viewType: 'ga_active_users',
  },
  {
    id: 'view-acme-ga-sessions',
    kind: 'value',
    name: 'Sessions this week',
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: 'conn-ga-acme',
    connectionType: 'google_analytics',
    pinned: false,
    mockValue: '14820',
    viewType: 'ga_sessions_today',
  },

  // ── Project B — Side Project ──────────────────────────────────────────
  {
    id: 'view-side-overview-chart',
    kind: 'overview-chart',
    name: 'Project Overview',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: null,
    connectionType: 'project_overview',
    pinned: false,
  },
  {
    id: 'view-side-overview-sources',
    kind: 'overview-sources',
    name: 'Sources & Users',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: null,
    connectionType: 'project_overview',
    pinned: false,
  },
  {
    id: 'view-side-pageviews',
    kind: 'value',
    name: 'Pageviews',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: 'conn-posthog-side',
    connectionType: 'posthog',
    pinned: true,
    mockValue: '12049',
  },
  {
    id: 'view-side-customers',
    kind: 'customers',
    name: 'Top customers',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: 'conn-stripe-side',
    connectionType: 'stripe_manual',
    pinned: false,
    customers: MOCK_STRIPE_TOP_CUSTOMERS,
  },
  {
    id: 'view-side-gross',
    kind: 'chart',
    name: 'This week gross volume',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: 'conn-stripe-side',
    connectionType: 'stripe_manual',
    pinned: false,
    mockValue: String(MOCK_STRIPE_GROSS['proj-side']!.chartTotal),
    chartTotal: MOCK_STRIPE_GROSS['proj-side']!.chartTotal,
    chartPoints: MOCK_STRIPE_GROSS['proj-side']!.chartPoints,
    viewType: 'stripe_gross_week',
  },
  {
    id: 'view-side-dashboard-events',
    kind: 'value',
    name: 'dashboard_viewed',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: 'conn-posthog-side',
    connectionType: 'posthog',
    pinned: false,
    mockValue: '4708',
  },
  // Side has GA too, but only one tile — keeps Side's "leaner
  // showcase" feel while still demonstrating that GA is an option
  // for any project. `ga_users_today` reads as a top-of-funnel
  // metric that complements the existing PostHog `dashboard_viewed`
  // event below it.
  {
    id: 'view-side-ga-users',
    kind: 'value',
    name: 'Users this week',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: 'conn-ga-side',
    connectionType: 'google_analytics',
    pinned: false,
    mockValue: '2104',
    viewType: 'ga_users_today',
  },
]
