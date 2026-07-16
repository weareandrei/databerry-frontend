/**
 * Per-view data hooks. Each one is a thin wrapper around
 * `useViewResource` (in `lib/hooks/`) that handles a single view-type
 * fetch path — gating by `view.type`, threading the global `tz` from
 * redux, and unwrapping the `unavailable` flag from the API response.
 *
 * Call sites (project page, folder page, pinned views) consume these
 * hooks rather than re-implementing the loading / refresh / typed-error
 * recipe inline.
 */

export { useWidgetLiveValue } from './useWidgetLiveValue'
export type { WidgetLiveValueResource } from './useWidgetLiveValue'

export { useStripeChart, isStripeChartView } from './useStripeChart'
export type { StripeChartResource } from './useStripeChart'

export { useGAChart, isGAChartView } from './useGAChart'
export type { GAChartResource } from './useGAChart'

export { usePosthogChart, isPosthogChartView } from './usePosthogChart'
export type { PosthogChartResource } from './usePosthogChart'

export { useStripeTopCustomers } from './useStripeTopCustomers'
export type { StripeTopCustomersResource } from './useStripeTopCustomers'

export { useCalendlyMeetings } from './useCalendlyMeetings'
export type { CalendlyMeetingsResource } from './useCalendlyMeetings'

export { usePosthogFunnel } from './usePosthogFunnel'
export type { PosthogFunnelResource } from './usePosthogFunnel'

export { usePosthogRetention } from './usePosthogRetention'
export type { PosthogRetentionResource } from './usePosthogRetention'

export { usePosthogUsers } from './usePosthogUsers'
export type { PosthogUsersResource } from './usePosthogUsers'

export { useSentryIssues, readSentryFilters } from './useSentryIssues'
export type {
  SentryIssuesResource,
  SentryIssuesPeriod,
  SentryIssuesSort,
} from './useSentryIssues'

export type { PerViewHookOptions } from './types'
