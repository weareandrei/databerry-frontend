export const STRIPE_VIEW_OPTIONS = [
  { type: 'stripe_gross_today' as const, name: 'Today Gross Volume', desc: 'Total succeeded charge amount today' },
  { type: 'stripe_gross_week' as const, name: 'This Week Gross Volume', desc: 'Total succeeded charge amount since Monday' },
  { type: 'stripe_revenue_today' as const, name: 'Total Gross Revenue Today', desc: 'All revenue collected today' },
]

export const CALENDLY_VIEW_OPTIONS = [
  { type: 'calendly_meetings_today' as const, name: 'Meetings Today', desc: 'Count of scheduled meetings for today' },
  { type: 'calendly_meetings_list' as const, name: "Today's Meeting List", desc: 'Shows time, participants, and booking link for each meeting' },
]
