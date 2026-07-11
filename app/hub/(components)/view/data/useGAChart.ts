'use client'

/**
 * `useGAChart` — chart-mode data fetcher for the polymorphic GA view types
 * (`ga_users_today`, `ga_sessions_today`, `ga_pageviews_today`) when their
 * `config.displayMode === 'chart'`. Mirrors `useStripeChart`'s shape so
 * `<ViewCardChart>` accepts both interchangeably.
 *
 * Notes:
 * - `ga_active_users` is excluded — the GA Realtime API has no historical
 *   series. Picker enforces this by only listing `'value'` in its modes.
 * - Total displayed in the card header is the SUM of the chart points.
 *   GA's runReport already returns the cumulative across the date range
 *   when called as a single value, but with the dimension split (`date` /
 *   `dateHour`) it returns per-bucket. Summing client-side keeps one
 *   round-trip.
 */

import { ALGORITHM } from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import type { ChartPoint } from '@/app/hub/(components)/view/(components)/ViewCardChart'
import type { View } from '@/types/view'
import type { PerViewHookOptions } from './types'

const GA_CHART_VIEW_TYPES = new Set([
  'ga_users_today',
  'ga_sessions_today',
  'ga_pageviews_today',
])

export function isGAChartView(view: View): boolean {
  if (view.connectionType !== 'google_analytics') return false
  if (!GA_CHART_VIEW_TYPES.has(view.type)) return false
  // Chart mode is opt-in via config.displayMode. Default ('value' or
  // unset) uses the live-value path — see `useViewLiveValue`.
  const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
  return displayMode === 'chart'
}

interface GAChartPayload {
  points: ChartPoint[]
  total: number | null
}

export interface GAChartResource {
  points: ChartPoint[]
  total: number | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

interface GAChartOptions extends PerViewHookOptions {
  mode?: 'daily' | 'weekly' | 'monthly'
}

export function useGAChart(view: View, options: GAChartOptions = {}): GAChartResource {
  const { dateFrom, dateTo, mode, enabled = true, tz = null } = options
  const isApplicable = enabled && isGAChartView(view) && !!view.connectionId

  const fetcher = isApplicable
    ? async (): Promise<GAChartPayload> => {
        const res = await ALGORITHM.getGoogleAnalyticsChartData(
          view.connectionId!,
          view.type,
          dateFrom,
          dateTo,
          mode,
          tz,
        )
        const points = res.points ?? []
        const total = points.length > 0 ? points.reduce((s, p) => s + p.value, 0) : null
        return { points, total }
      }
    : null

  // `isApplicable` participates in the deps so an in-place flip of
  // `view.config.displayMode` (the "Convert to chart" menu item)
  // re-triggers the fetch. Without it the surface deps (connectionId,
  // type, dateFrom/dateTo, mode, tz) don't change during conversion
  // and the hook would stay on the previous render's `fetcher = null`
  // result — chart renders "no data" until a hard reload re-mounts
  // it with displayMode already 'chart'.
  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.type,
    dateFrom,
    dateTo,
    mode,
    tz,
    isApplicable,
  ])

  return {
    points: data?.points ?? [],
    total: data?.total ?? null,
    loading,
    error,
    refresh,
  }
}
