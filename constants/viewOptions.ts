export const STRIPE_VIEW_OPTIONS = [
  { type: 'stripe_gross' as const, name: 'Gross Volume', desc: 'Total succeeded charge amount for the selected period' },
  { type: 'stripe_revenue_today' as const, name: 'Total Gross Revenue', desc: 'All revenue collected for the selected period' },
]

export const CALENDLY_VIEW_OPTIONS = [
  { type: 'calendly_meetings_today' as const, name: 'Meetings', desc: 'Count of scheduled meetings for the selected period' },
  { type: 'calendly_meetings_list' as const, name: 'Meetings list', desc: 'Shows time, participants, and booking link for each meeting' },
]

export const GA_VIEW_OPTIONS = [
  { type: 'ga_active_users'    as const, name: 'Active Users Right Now', desc: 'Users active in the last 30 minutes (realtime)' },
  { type: 'ga_users_today'     as const, name: 'Users',                  desc: 'Total unique users for the selected period' },
  { type: 'ga_sessions_today'  as const, name: 'Sessions',               desc: 'Total sessions for the selected period' },
  { type: 'ga_pageviews_today' as const, name: 'Pageviews',              desc: 'Total page views for the selected period' },
]

// Vercel view types are not yet implemented — no backend live-value endpoint exists.
export const VERCEL_VIEW_OPTIONS: { type: string; name: string; desc: string }[] = []

// Composite "Project Overview" views — no connection required.
// Added in pairs (chart + sources) but stored and rendered as independent views.
export const COMPOSITE_VIEW_OPTIONS = [
  {
    type: 'project_overview' as const,
    name: 'Overview',
    desc: 'Stacked visitors chart with an optional overlay line',
  },
  {
    type: 'project_overview_sources' as const,
    name: 'Sources',
    desc: 'Traffic sources breakdown sorted by volume',
  },
]
