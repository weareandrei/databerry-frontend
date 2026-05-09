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

/**
 * Shape of a single picker entry. `modes` is the *full* set of display modes
 * a view-type supports — read by the picker to render the colored mode-chips
 * in the top-right of each bar AND to decide whether to push the
 * DisplayModePicker sub-page on click. Single-mode entries skip the sub-page.
 *
 * `kind` is the legacy "primary mode" — kept as the default / fallback when
 * `config.displayMode` is missing on an existing row. New code should prefer
 * `modes`. Removing `kind` is a follow-up cleanup.
 */
export type ViewOption = {
  type: string
  name: string
  desc: string
  kind: ViewKind
  modes: ViewKind[]
}

export const STRIPE_VIEW_OPTIONS: ViewOption[] = [
  // `stripe_gross` is now polymorphic on `config.displayMode`:
  //   'chart' (default) → time-series Gross Volume chart
  //   'value'           → today's gross revenue value tile
  // The legacy `stripe_revenue_today` type was merged in here — see
  // `migrate-view-types-2026-05.ts` for the one-shot DB rewrite.
  { type: 'stripe_gross',         name: 'Gross Volume',          desc: 'Total succeeded charge amount — chart over time, or today’s revenue as a single value', kind: 'chart', modes: ['chart', 'value'] },
  { type: 'stripe_mrr',           name: 'MRR',                   desc: 'Monthly recurring revenue across active and trialing subscriptions', kind: 'value', modes: ['value'] },
  { type: 'stripe_active_subs',   name: 'Active Subscriptions',  desc: 'Count of subscriptions in active or trialing status',               kind: 'value', modes: ['value'] },
  { type: 'stripe_top_customers', name: 'Top Customers',         desc: 'Top 10 customers by revenue over the selected period',              kind: 'list',  modes: ['list']  },
  { type: 'stripe_churn_rate',    name: 'Churn Rate',            desc: 'Approximate 30-day customer churn (canceled / active+canceled)',    kind: 'value', modes: ['value'] },
]

export const CALENDLY_VIEW_OPTIONS: ViewOption[] = [
  { type: 'calendly_meetings_today', name: 'Meetings',      desc: 'Count of scheduled meetings for the selected period',           kind: 'value', modes: ['value'] },
  { type: 'calendly_meetings_list',  name: 'Meetings list', desc: 'Shows time, participants, and booking link for each meeting',   kind: 'list',  modes: ['list']  },
]

export const GA_VIEW_OPTIONS: ViewOption[] = [
  // `ga_active_users` is realtime-only — the GA Realtime API doesn't give a
  // historical series, so chart mode would have nothing meaningful to plot.
  { type: 'ga_active_users',    name: 'Active Users Right Now', desc: 'Users active in the last 30 minutes (realtime)', kind: 'value', modes: ['value'] },
  // The next three are polymorphic on `config.displayMode`:
  //   'value' (default) → today's metric as a single number
  //   'chart'           → daily/hourly chart over the selected period
  { type: 'ga_users_today',     name: 'Users',                  desc: 'Unique users — today’s total or daily chart', kind: 'value', modes: ['value', 'chart'] },
  { type: 'ga_sessions_today',  name: 'Sessions',               desc: 'Sessions — today’s total or daily chart',     kind: 'value', modes: ['value', 'chart'] },
  { type: 'ga_pageviews_today', name: 'Pageviews',              desc: 'Page views — today’s total or daily chart',   kind: 'value', modes: ['value', 'chart'] },
]

// Vercel view types are not yet implemented — no backend live-value endpoint exists.
export const VERCEL_VIEW_OPTIONS: ViewOption[] = []

// Composite "Project Overview" views — no connection required.
// Added in pairs (chart + sources) but stored and rendered as independent views.
export const COMPOSITE_VIEW_OPTIONS: ViewOption[] = [
  {
    type: 'project_overview',
    name: 'Overview',
    desc: 'Stacked visitors chart with an optional overlay line',
    kind: 'chart',
    modes: ['chart'],
  },
  {
    type: 'project_overview_sources',
    name: 'Sources',
    desc: 'Traffic sources breakdown sorted by volume',
    kind: 'list',
    modes: ['list'],
  },
]

// PostHog view types — funnel/retention/users join the existing dynamic
// "Track events" daily_counter flow. Each opens a sub-page in the picker
// (or in the case of users, creates immediately). All three render as
// wide cards (kind: 'list' or 'chart').
export const POSTHOG_VIEW_OPTIONS: ViewOption[] = [
  // `daily_counter` (the "Track an event" flow) is now polymorphic:
  //   'value' (default) → today's count of the configured event
  //   'chart'           → daily/hourly bar chart of occurrences
  // The picker collects displayMode BEFORE the events sub-page so each
  // selected event creates a row with the chosen mode pre-baked in.
  {
    type: 'daily_counter',
    name: 'Track an event',
    desc: 'Count occurrences of a PostHog event — today’s total or chart over time',
    kind: 'value',
    modes: ['value', 'chart'],
  },
  {
    type: 'posthog_funnel',
    name: 'Funnel',
    desc: '2–5 ordered events with drop-off at each step',
    kind: 'chart',
    // `value` mode renders a compact tile showing only the overall
    // conversion: count of users who reached the LAST step + the
    // start→end %, with a small "from / to" subtitle so the user
    // knows which two events are being compared. The `chart` mode
    // is the full step-by-step bar layout.
    modes: ['chart', 'value'],
  },
  {
    type: 'posthog_retention',
    name: 'Retention',
    desc: 'Cohort heatmap — % of users who return day-over-day',
    kind: 'chart',
    modes: ['chart'],
  },
  {
    type: 'posthog_users',
    name: 'Recent users',
    desc: 'List of users seen in the period with source and last-seen',
    kind: 'list',
    modes: ['list'],
  },
]

// Webhook view types — surfaced in the picker once the user has connected a
// webhook source. Counter and gauge render as a single value; append builds
// up a list of recent events.
export const WEBHOOK_VIEW_OPTIONS: ViewOption[] = [
  { type: 'webhook_counter', name: 'Event Counter', desc: 'Increments by +1 on every POST',     kind: 'value', modes: ['value'] },
  { type: 'webhook_gauge',   name: 'Gauge',         desc: 'Replaces value on every POST',       kind: 'value', modes: ['value'] },
  { type: 'webhook_append',  name: 'Timeline',      desc: 'Appends a new entry on every POST',  kind: 'list',  modes: ['list']  },
]

/**
 * Returns the picker option matching a (`connectionType`, `viewType`)
 * pair, or `null` when none exists. Used by `ViewHeader` to figure out
 * what display modes a live view can be converted between, without the
 * caller having to know which `*_VIEW_OPTIONS` array applies.
 *
 * Mapping is by `connectionType` because a few view-type names overlap
 * across integrations (e.g. there's no current overlap, but the
 * mapping keeps the API forwards-compatible if one ever lands).
 */
export function getViewOption(
  connectionType: string,
  viewType: string,
): ViewOption | null {
  const list = (() => {
    switch (connectionType) {
      case 'stripe':
      case 'stripe_manual':
        return STRIPE_VIEW_OPTIONS
      case 'google_analytics':
        return GA_VIEW_OPTIONS
      case 'calendly':
        return CALENDLY_VIEW_OPTIONS
      case 'posthog':
        return POSTHOG_VIEW_OPTIONS
      case 'webhook':
        return WEBHOOK_VIEW_OPTIONS
      case 'composite':
        return COMPOSITE_VIEW_OPTIONS
      default:
        return [] as ViewOption[]
    }
  })()
  return list.find(o => o.type === viewType) ?? null
}
