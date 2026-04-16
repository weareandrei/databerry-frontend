import type { CalendlyMeeting } from '@/lib/api'

const TODAY = '2026-04-08'

export const MOCK_POSTHOG_EVENTS: { name: string; mockValue: string; volume: number }[] = [
  { name: 'user_signed_up', mockValue: '2841', volume: 2841 },
  { name: 'project_created', mockValue: '834', volume: 834 },
  { name: 'dashboard_viewed', mockValue: '12049', volume: 12049 },
  { name: 'export_csv', mockValue: '391', volume: 391 },
  { name: 'api_call', mockValue: '48203', volume: 48203 },
  { name: 'payment_completed', mockValue: '1293', volume: 1293 },
  { name: 'onboarding_finished', mockValue: '712', volume: 712 },
  { name: 'feature_flag_called', mockValue: '5621', volume: 5621 },
]

export const MOCK_STRIPE_CHARTS: Record<
  string,
  { chartTotal: number; chartPoints: { label: string; value: number }[] }
> = {
  stripe_gross_today: {
    chartTotal: 284000,
    chartPoints: [
      { label: '8am', value: 12000 },
      { label: '10am', value: 31000 },
      { label: '12pm', value: 58000 },
      { label: '2pm', value: 44000 },
      { label: '4pm', value: 72000 },
      { label: '6pm', value: 67000 },
    ],
  },
  stripe_gross_week: {
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
}

export const MOCK_CALENDLY_MEETINGS: CalendlyMeeting[] = [
  {
    startTime: `${TODAY}T10:00:00Z`,
    endTime: `${TODAY}T10:30:00Z`,
    name: 'Discovery Call',
    bookingUri: '#',
    description: null,
    invitees: [{ name: 'Demo User', email: 'demo@example.com' }],
  },
  {
    startTime: `${TODAY}T15:00:00Z`,
    endTime: `${TODAY}T15:45:00Z`,
    name: 'Follow-up',
    bookingUri: '#',
    description: null,
    invitees: [{ name: 'Jane Doe', email: 'jane@example.com' }],
  },
]
