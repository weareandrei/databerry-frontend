/**
 * Seed view data for the two showcase projects on the demo dashboard.
 *
 * Each `DemoView` is a discriminated union by `kind`:
 *   - 'value'             → single number → `<LiveValueWidget>`
 *   - 'chart'             → bar chart → `<ChartWidget>`
 *   - 'meetings'          → Calendly list → `<ListWidget>`
 *   - 'customers'         → Stripe top customers → `<CustomerListWidget>`
 *   - 'funnel'            → PostHog funnel → `<FunnelWidget>`
 *   - 'sentry-issues'     → Sentry errors list → `<SentryIssuesWidget>`
 *   - 'overview-chart'    → composite project overview chart
 *   - 'overview-sources'  → composite project overview sources/users
 *
 * Project A (Acme SaaS) — bigger / fuller coverage:
 *     overview, funnel, MRR, gross volume, calendly, 2 posthog events,
 *     2 GA tiles. Organised into TWO top-level folders ("Marketing"
 *     and "Revenue") plus a handful of root-level composite tiles
 *     (overview chart + sources, funnel, calendly).
 * Project B (Side Project) — leaner, FLAT showcase:
 *     overview, pageviews, customers, gross volume (now a small value
 *     tile, not a wide chart), 1 PostHog event, 1 GA tile. NO folders
 *     on Side — every tile lives directly under the project header.
 *
 * Pinned set (home pinned strip): Acme MRR + signups + sessions;
 * Initech Pageviews + Gross + Users — a few compact value tiles
 * so the home page shows a real pin lane like the hub.
 */

import {
  MOCK_CALENDLY_MEETINGS,
  MOCK_POSTHOG_FUNNEL,
  MOCK_SENTRY_ISSUES_ACME,
  MOCK_SENTRY_ISSUES_SIDE,
  MOCK_STRIPE_GROSS,
  MOCK_STRIPE_TOP_CUSTOMERS,
  type DemoChartPoint,
} from '../demoMocks'
import type {
  SentryIssuesPeriod,
  SentryIssuesSort,
} from '@/app/hub/(components)/widgets/data/useSentryIssues'
import type {
  CalendlyMeeting,
  PosthogFunnelStep,
  SentryIssue,
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
  | (DemoViewBase & {
      kind: 'funnel'
      steps: PosthogFunnelStep[]
      /**
       * Mirror of `view.config.displayMode` for the polymorphic
       * `posthog_funnel` view-type — `chart` renders the step-by-step
       * bar layout, `value` collapses to a single-cell tile showing
       * just the start→end conversion. Default `chart` for backwards
       * compatibility with seed entries that pre-date this field.
       */
      displayMode?: 'chart' | 'value'
    })
  | (DemoViewBase & {
      kind: 'sentry-issues'
      /**
       * Frozen mock list — real mode pulls live from
       * `/sentry/views/issues-list`, but the demo runs offline so
       * the rows are baked in. Same shape (`SentryIssue[]`) the real
       * fetcher returns, so `<SentryIssuesWidget>` consumes it
       * without a special demo-only branch.
       */
      mockIssues: SentryIssue[]
      /**
       * Seed values for the in-card filter dropdowns. The dropdowns
       * still work in demo mode — they update local component state
       * inside `<SentryIssuesWidget>` — but the underlying mock
       * list doesn't actually re-filter, so picking a different
       * period/sort changes the badge label only. Acceptable for the
       * demo's purpose (showing that filters EXIST); a "real" demo
       * filter would require pre-computing the mock list under every
       * possible filter combo, which isn't worth the churn.
       */
      period: SentryIssuesPeriod
      sort: SentryIssuesSort
    })
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
    // ── Revenue folder (mrr / gross / payments) ──
    id: 'view-acme-mrr',
    kind: 'value',
    name: 'MRR',
    projectId: 'proj-acme',
    folderId: 'fld-acme-revenue',
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
    folderId: 'fld-acme-revenue',
    connectionId: 'conn-stripe-acme',
    connectionType: 'stripe_manual',
    pinned: false,
    mockValue: String(MOCK_STRIPE_GROSS['proj-acme']!.chartTotal),
    chartTotal: MOCK_STRIPE_GROSS['proj-acme']!.chartTotal,
    chartPoints: MOCK_STRIPE_GROSS['proj-acme']!.chartPoints,
    viewType: 'stripe_gross_week',
  },
  {
    // Calendly meetings stay at project root (orphan folderId — old
    // 'fld-acme-root' that no longer exists as a folder). At root,
    // `<DemoProjectView>` shows ALL non-overview tiles regardless of
    // folderId, so the calendly card renders alongside the other
    // tiles when the user is on the project's main view.
    id: 'view-acme-calendly',
    kind: 'meetings',
    name: "Today's calls",
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: 'conn-calendly',
    connectionType: 'calendly',
    pinned: false,
    meetings: MOCK_CALENDLY_MEETINGS,
  },
  {
    // ── Marketing folder (signups + GA active + GA sessions) ──
    id: 'view-acme-signups',
    kind: 'value',
    name: 'user_signed_up',
    projectId: 'proj-acme',
    folderId: 'fld-acme-marketing',
    connectionId: 'conn-posthog-acme',
    connectionType: 'posthog',
    pinned: true,
    mockValue: '2841',
  },
  {
    id: 'view-acme-payments',
    kind: 'value',
    name: 'payment_completed',
    projectId: 'proj-acme',
    folderId: 'fld-acme-revenue',
    connectionId: 'conn-posthog-acme',
    connectionType: 'posthog',
    pinned: false,
    mockValue: '1293',
  },
  // Two GA tiles — both in Marketing now (was split between
  // Marketing + root before the folder restructure). They're
  // analytics-y metrics that fit cleanly under the same folder
  // alongside the PostHog `user_signed_up` event.
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
    folderId: 'fld-acme-marketing',
    connectionId: 'conn-ga-acme',
    connectionType: 'google_analytics',
    pinned: true,
    mockValue: '14820',
    viewType: 'ga_sessions_today',
  },
  {
    // Sentry on Acme — bigger / louder project, so the seed view
    // picks "Last 7 days" + sort by frequency to highlight the
    // top recurring stripe-webhook bug at the top of the list. The
    // 2×2 list tile lives at project root alongside the funnel and
    // overview composite — no folder home, since errors aren't a
    // Marketing or a Revenue concern.
    id: 'view-acme-sentry',
    kind: 'sentry-issues',
    name: 'Errors',
    projectId: 'proj-acme',
    folderId: 'fld-acme-root',
    connectionId: 'conn-sentry-acme',
    connectionType: 'sentry',
    pinned: false,
    mockIssues: MOCK_SENTRY_ISSUES_ACME,
    period: '7d',
    sort: 'frequent',
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
    // Demoted from a wide chart card to a small value tile — Side
    // Project's body had two big-format cards stacked (overview + gross
    // chart) which read as "two giant tiles" instead of a packed grid.
    // Rendered as a value tile with `viewType: 'stripe_gross_week'`
    // so `formatViewValue` (in `utils/formatters.ts`) picks up the
    // currency formatter and shows "$1,840" rather than the raw cents.
    id: 'view-side-gross',
    kind: 'value',
    name: 'Gross this week',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: 'conn-stripe-side',
    connectionType: 'stripe_manual',
    pinned: true,
    mockValue: String(MOCK_STRIPE_GROSS['proj-side']!.chartTotal),
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
    pinned: true,
    mockValue: '2104',
    viewType: 'ga_users_today',
  },
  {
    // Sentry on Side — leaner project, so the seed picks "Last 24
    // hours" + sort by recency, framing the tile as "what's broken
    // right now" rather than Acme's "what's been loudest this
    // week". Two pickers, two flavours: the same component reads
    // very differently with different defaults, which shows off
    // the filter ergonomics on a single page.
    id: 'view-side-sentry',
    kind: 'sentry-issues',
    name: 'Errors',
    projectId: 'proj-side',
    folderId: 'fld-side-root',
    connectionId: 'conn-sentry-side',
    connectionType: 'sentry',
    pinned: false,
    mockIssues: MOCK_SENTRY_ISSUES_SIDE,
    period: '24h',
    sort: 'recent',
  },
]
