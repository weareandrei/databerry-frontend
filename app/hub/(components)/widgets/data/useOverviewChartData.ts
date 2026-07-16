'use client'

/**
 * Data hook for `<OverviewChartWidget>`.
 *
 * Fetches the overview chart series (`PROJECT_OVERVIEW.getChart`) for
 * a given project + date range + (primary, secondary) metric pair.
 * Returns the standard `{ data, loading, error, refresh }` shape every
 * other per-view-type hook in this folder uses.
 *
 * The chart component itself stays purely presentational — its own
 * metric-dropdown state lives inside the component (UI concern), but
 * any time those dropdowns flip the component calls back via a prop;
 * the caller decides whether to persist (real → `ALGORITHM.updateView`,
 * demo → no-op) and which `(primaryMetric, secondaryMetric)` to feed
 * back into this hook.
 *
 * Lives in `view/data/` (not as a private effect inside
 * `OverviewChartWidget.tsx`) so the demo project body can render
 * the same `<OverviewChartWidget>` with static mock data instead of
 * a network fetch — the chart component reads everything via props
 * and is provider-free.
 */
import { useEffect, useState } from 'react'
import { PROJECT_OVERVIEW, type OverviewChartResponse } from '@/lib/api'
import { useViewRefreshNonce } from '@/lib/viewRefreshBus'
import type {
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
} from '@/types/widget'

export interface OverviewChartDataResource {
  chart: OverviewChartResponse | null
  loading: boolean
  error: string | null
  refresh: () => void
}

interface UseOverviewChartDataOpts {
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  /** `null` = explicitly-empty primary (chart created with no traffic
   *  tool connected) — the hook skips fetching entirely. */
  primaryMetric: OverviewPrimaryMetric | null
  secondaryMetric: OverviewSecondaryMetric
}

export function useOverviewChartData(
  projectId: string,
  opts: UseOverviewChartDataOpts,
): OverviewChartDataResource {
  const { dateFrom, dateTo, mode, primaryMetric, secondaryMetric } = opts
  const [chart, setChart] = useState<OverviewChartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const globalRefreshNonce = useViewRefreshNonce()

  useEffect(() => {
    let cancelled = false

    // Empty primary → nothing to fetch. Synthesize the same shape
    // the backend returns for a missing traffic provider so the
    // chart renders its "connect an analytics tool" empty state
    // instead of a perpetual loading skeleton. Picking any metric
    // from the dropdown flips `primaryMetric` and fetches normally.
    if (primaryMetric === null) {
      setChart({
        buckets: [],
        totalPrimary: 0,
        totalSecondary: null,
        primaryUnavailable: true,
        trafficProvider: null,
      })
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    PROJECT_OVERVIEW.getChart(
      projectId,
      dateFrom,
      dateTo,
      mode,
      primaryMetric,
      secondaryMetric,
    )
      .then(chartRes => {
        if (!cancelled) setChart(chartRes)
      })
      .catch(err => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load overview')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, dateFrom, dateTo, mode, primaryMetric, secondaryMetric, refreshTick, globalRefreshNonce])

  return {
    chart,
    loading,
    error,
    refresh: () => setRefreshTick(t => t + 1),
  }
}
