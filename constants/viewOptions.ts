export const STRIPE_VIEW_OPTIONS = [
  { type: 'stripe_gross_today' as const, name: 'Today Gross Volume', desc: 'Total succeeded charge amount today' },
  { type: 'stripe_gross_week' as const, name: 'This Week Gross Volume', desc: 'Total succeeded charge amount since Monday' },
  { type: 'stripe_revenue_today' as const, name: 'Total Gross Revenue Today', desc: 'All revenue collected today' },
]

export const CALENDLY_VIEW_OPTIONS = [
  { type: 'calendly_meetings_today' as const, name: 'Meetings Today', desc: 'Count of scheduled meetings for today' },
  { type: 'calendly_meetings_list' as const, name: "Today's Meeting List", desc: 'Shows time, participants, and booking link for each meeting' },
]

export const GA_VIEW_OPTIONS = [
  { type: 'ga_active_users'    as const, name: 'Active Users Right Now', desc: 'Users active in the last 30 minutes (realtime)' },
  { type: 'ga_users_today'     as const, name: 'Users Today',            desc: 'Total unique users today' },
  { type: 'ga_sessions_today'  as const, name: 'Sessions Today',         desc: 'Total sessions today' },
  { type: 'ga_pageviews_today' as const, name: 'Pageviews Today',        desc: 'Total page views today' },
]

// Vercel view types are not yet implemented — no backend live-value endpoint exists.
export const VERCEL_VIEW_OPTIONS: { type: string; name: string; desc: string }[] = []
