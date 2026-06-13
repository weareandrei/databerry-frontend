export interface View {
  id: string
  projectId: string
  folderId: string | null
  connectionId: string | null
  connectionType: string
  type: string
  name: string
  config: Record<string, unknown>
  value: string | null
  isPinned: boolean
  userId: string
  createdAt: string
}

/** Typed helper for `project_overview` view config — stored in `views.config` JSON. */
export type OverviewPrimaryMetric = 'visitors' | 'pageviews' | 'conversions' | 'revenue'
export type OverviewSecondaryMetric =
  | 'conversion_rate'
  | 'bounce_rate'
  | 'avg_session_sec'
  | 'revenue'
  | null

/**
 * Reference to a metric pulled from a specific user connection
 * (Stripe / GA / PostHog), as picked from the cascade dropdown.
 * `viewType` is the metric within the provider (e.g. `stripe_gross`
 * for Stripe Gross Volume, `ga_users_today` for GA Users). The
 * `eventName` slot is reserved for PostHog `daily_counter` once the
 * event-picker UI lands; ignored for the other providers.
 */
export interface ConnectionMetricRef {
  connectionId: string
  /** Provider that owns this metric — kept on the ref so the data
   *  hook can pick the right per-provider endpoint without
   *  re-resolving the connection's type. */
  connectionType: 'stripe' | 'stripe_manual' | 'google_analytics' | 'posthog'
  /** Metric identifier within the provider (`stripe_gross`,
   *  `ga_users_today`, `daily_counter`, …). */
  viewType: string
  /** Configuration the metric needs beyond `viewType` — currently
   *  only the PostHog event name. Optional; ignored if irrelevant. */
  eventName?: string
}

export interface ProjectOverviewChartConfig {
  // Predefined metrics — the original, always-supported set. Existing
  // rows in `views.config` only have these fields; the new connection
  // refs below are additive and missing on legacy rows.
  //
  // `primaryMetric` is NULLABLE: a chart created while the project
  // has no traffic tool (PostHog/GA) starts with an explicitly-empty
  // left metric — the dropdown shows a "Select metric" placeholder
  // instead of pretending Visitors data exists. Legacy rows with the
  // key ABSENT still default to 'visitors' (see the readConfig
  // fallbacks, which distinguish `undefined` from explicit `null`).
  primaryMetric: OverviewPrimaryMetric | null
  secondaryMetric: OverviewSecondaryMetric
  // Connection-sourced override. When SET, takes priority over the
  // predefined field above and the chart plots data from the named
  // connection instead. When unset, the chart falls back to the
  // predefined `primaryMetric` / `secondaryMetric`.
  //
  // Stored as an additional field (rather than replacing the
  // predefined string) so legacy rows keep working AND the user can
  // switch back to a predefined metric without losing the connection
  // ref's other state — clearing the override is enough.
  primaryConnectionMetric?: ConnectionMetricRef
  secondaryConnectionMetric?: ConnectionMetricRef | null
}

export interface ProjectOverviewSourcesConfig {
  sourcesLimit?: number
}
