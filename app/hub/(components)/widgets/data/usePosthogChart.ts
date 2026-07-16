'use client'

/**
 * `usePosthogChart` — chart-mode data fetcher for `daily_counter` views
 * (the "Track an event" picker entry) when `config.displayMode === 'chart'`.
 * Mirrors `useStripeChart` / `useGAChart` so `<ChartWidget>` consumes
 * any of them through the same prop shape.
 *
 * Funnel / retention / users views have their own dedicated hooks; this
 * one is daily_counter-only.
 */

import { ALGORITHM } from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import type { ChartPoint } from '@/components/charts/types'
import type { Widget } from '@/types/widget'
import type { PerViewHookOptions } from './types'

export function isPosthogChartView(view: Widget): boolean {
  if (view.connectionType !== 'posthog') return false
  if (view.type !== 'daily_counter') return false
  const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
  return displayMode === 'chart'
}

interface PosthogChartPayload {
  points: ChartPoint[]
  total: number | null
}

export interface PosthogChartResource {
  points: ChartPoint[]
  total: number | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

export function usePosthogChart(
  view: Widget,
  options: PerViewHookOptions = {},
): PosthogChartResource {
  const { dateFrom, dateTo, enabled = true, tz = null } = options
  const isApplicable = enabled && isPosthogChartView(view) && !!view.connectionId

  const fetcher = isApplicable
    ? async (): Promise<PosthogChartPayload> => {
        const res = await ALGORITHM.getPosthogChartData(
          view.connectionId!,
          view.id,
          dateFrom,
          dateTo,
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
  // view.id, dateFrom/dateTo, tz) don't change during conversion and
  // the hook would stay on the previous render's `fetcher = null`
  // result — chart renders "no data" until a hard reload re-mounts
  // it with displayMode already 'chart'.
  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.id,
    dateFrom,
    dateTo,
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
