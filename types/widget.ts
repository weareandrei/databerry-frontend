export interface Widget {
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

/** Typed helper for `project_overview` widget config — stored in `views.config` JSON. */
export type OverviewPrimaryMetric = 'visitors' | 'pageviews' | 'conversions' | 'revenue'
export type OverviewSecondaryMetric =
  | 'conversion_rate'
  | 'bounce_rate'
  | 'avg_session_sec'
  | 'revenue'
  | null

export interface ConnectionMetricRef {
  connectionId: string
  connectionType: 'stripe' | 'stripe_manual' | 'google_analytics' | 'posthog'
  viewType: string
  eventName?: string
}

export interface ProjectOverviewChartConfig {
  primaryMetric: OverviewPrimaryMetric | null
  secondaryMetric: OverviewSecondaryMetric
  primaryConnectionMetric?: ConnectionMetricRef
  secondaryConnectionMetric?: ConnectionMetricRef | null
}

export interface ProjectOverviewSourcesConfig {
  sourcesLimit?: number
}
