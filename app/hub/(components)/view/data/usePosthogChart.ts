'use client'

/**
 * `usePosthogChart` — chart-mode data fetcher for `daily_counter` views
 * (the "Track an event" picker entry) when `config.displayMode === 'chart'`.
 * Mirrors `useStripeChart` / `useGAChart` so `<ViewCardChart>` consumes
 * any of them through the same prop shape.
 *
 * Funnel / retention / users views have their own dedicated hooks; this
 * one is daily_counter-only.
 */

import { ALGORITHM } from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import type { ChartPoint } from '@/app/hub/(components)/view/ViewCardChart'
import type { View } from '@/types/view'
import type { PerViewHookOptions } from './types'

export function isPosthogChartView(view: View): boolean {
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
  view: View,
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

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.id,
    dateFrom,
    dateTo,
    tz,
  ])

  return {
    points: data?.points ?? [],
    total: data?.total ?? null,
    loading,
    error,
    refresh,
  }
}
