/**
 * `kind` describes the *visual shape* of a view tile on the dashboard:
 *
 *   - 'value' → a single number/string (e.g. `ga_users_today`)
 *   - 'chart' → a time-series bar/line (e.g. `stripe_gross`, `project_overview`)
 *   - 'list'  → a vertical list of items (e.g. `calendly_meetings_list`)
 *
 * The view picker reads this to pick the right illustration on each card so
 * the user can recognise what they're about to create at a glance, without
 * having to read the description.
 */
export type ViewKind = 'value' | 'chart' | 'list'

export const STRIPE_VIEW_OPTIONS = [
  { type: 'stripe_gross' as const, name: 'Gross Volume', desc: 'Total succeeded charge amount for the selected period', kind: 'chart' as const },
  { type: 'stripe_revenue_today' as const, name: 'Total Gross Revenue', desc: 'All revenue collected for the selected period', kind: 'value' as const },
  { type: 'stripe_mrr' as const, name: 'MRR', desc: 'Monthly recurring revenue across active and trialing subscriptions', kind: 'value' as const },
  { type: 'stripe_active_subs' as const, name: 'Active Subscriptions', desc: 'Count of subscriptions in active or trialing status', kind: 'value' as const },
  { type: 'stripe_top_customers' as const, name: 'Top Customers', desc: 'Top 10 customers by revenue over the selected period', kind: 'list' as const },
  { type: 'stripe_churn_rate' as const, name: 'Churn Rate', desc: 'Approximate 30-day customer churn (canceled / active+canceled)', kind: 'value' as const },
]

export const CALENDLY_VIEW_OPTIONS = [
  { type: 'calendly_meetings_today' as const, name: 'Meetings', desc: 'Count of scheduled meetings for the selected period', kind: 'value' as const },
  { type: 'calendly_meetings_list' as const, name: 'Meetings list', desc: 'Shows time, participants, and booking link for each meeting', kind: 'list' as const },
]

export const GA_VIEW_OPTIONS = [
  { type: 'ga_active_users'    as const, name: 'Active Users Right Now', desc: 'Users active in the last 30 minutes (realtime)', kind: 'value' as const },
  { type: 'ga_users_today'     as const, name: 'Users',                  desc: 'Total unique users for the selected period',     kind: 'value' as const },
  { type: 'ga_sessions_today'  as const, name: 'Sessions',               desc: 'Total sessions for the selected period',          kind: 'value' as const },
  { type: 'ga_pageviews_today' as const, name: 'Pageviews',              desc: 'Total page views for the selected period',        kind: 'value' as const },
]

// Vercel view types are not yet implemented — no backend live-value endpoint exists.
export const VERCEL_VIEW_OPTIONS: { type: string; name: string; desc: string; kind: ViewKind }[] = []

// Composite "Project Overview" views — no connection required.
// Added in pairs (chart + sources) but stored and rendered as independent views.
export const COMPOSITE_VIEW_OPTIONS = [
  {
    type: 'project_overview' as const,
    name: 'Overview',
    desc: 'Stacked visitors chart with an optional overlay line',
    kind: 'chart' as const,
  },
  {
    type: 'project_overview_sources' as const,
    name: 'Sources',
    desc: 'Traffic sources breakdown sorted by volume',
    kind: 'list' as const,
  },
]

// PostHog view types — funnel/retention/users join the existing dynamic
// "Track events" daily_counter flow. Each opens a sub-page in the picker
// (or in the case of users, creates immediately). All three render as
// wide cards (kind: 'list' or 'chart').
export const POSTHOG_VIEW_OPTIONS = [
  {
    type: 'posthog_funnel' as const,
    name: 'Funnel',
    desc: '2–5 ordered events with drop-off at each step',
    kind: 'chart' as const,
  },
  {
    type: 'posthog_retention' as const,
    name: 'Retention',
    desc: 'Cohort heatmap — % of users who return day-over-day',
    kind: 'chart' as const,
  },
  {
    type: 'posthog_users' as const,
    name: 'Recent users',
    desc: 'List of users seen in the period with source and last-seen',
    kind: 'list' as const,
  },
]

// Webhook view types — surfaced in the picker once the user has connected a
// webhook source. Counter and gauge render as a single value; append builds
// up a list of recent events.
export const WEBHOOK_VIEW_OPTIONS = [
  { type: 'webhook_counter' as const, name: 'Event Counter', desc: 'Increments by +1 on every POST',  kind: 'value' as const },
  { type: 'webhook_gauge'   as const, name: 'Gauge',         desc: 'Replaces value on every POST',     kind: 'value' as const },
  { type: 'webhook_append'  as const, name: 'Timeline',      desc: 'Appends a new entry on every POST', kind: 'list'  as const },
]
