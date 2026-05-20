'use client'

/**
 * Real-mode wrapper around `<ViewCardOverviewChart>`.
 *
 * `<ViewCardOverviewChart>` itself is provider-free — it accepts
 * its data + selected metrics + handlers as props. Real callers
 * (project page, folder page, pinned-views card, mobile project
 * body) compose the same wiring every time:
 *
 *   - read initial metrics from `view.config`
 *   - call `useOverviewChartData()` to fetch the series
 *   - persist metric changes to the backend via `ALGORITHM.updateView`
 *   - mount the `<ProjectConversionsDialog>` so the menu's
 *     "Configure conversions" item has somewhere to open into
 *
 * This wrapper bundles all of that. Real callers get a drop-in
 * replacement for the previous public API of
 * `<ViewCardOverviewChart>` (just `view`, dates, mode, untrack /
 * pin / projectName / chromeless props).
 *
 * Demo callers do *not* import this wrapper — they render
 * `<ViewCardOverviewChart>` directly with static mock data.
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ViewCardOverviewChart } from './ViewCardOverviewChart'
import { ProjectConversionsDialog } from './ProjectConversionsDialog'
import { useOverviewChartData } from './data/useOverviewChartData'
import { useConnectionMetricSeries } from './data/useConnectionMetricSeries'
import { ALGORITHM } from '@/lib/api'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import type {
  ConnectionMetricRef,
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
  ProjectOverviewChartConfig,
  View,
} from '@/types/view'

function readConfig(view: View): ProjectOverviewChartConfig {
  const cfg = view.config as Partial<ProjectOverviewChartConfig>
  return {
    primaryMetric: cfg.primaryMetric ?? 'visitors',
    secondaryMetric: cfg.secondaryMetric ?? null,
    // Connection overrides — explicitly carried through so the chart's
    // dropdown can display the picked connection metric's label
    // immediately on mount (without round-tripping to fetch).
    primaryConnectionMetric: cfg.primaryConnectionMetric,
    secondaryConnectionMetric: cfg.secondaryConnectionMetric,
  }
}

interface ViewCardOverviewChartConnectedProps {
  view: View
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
  chromeless?: boolean
  /**
   * Cross-component highlight: when set, every stacked bar segment
   * matching this source key stays lit and everything else dims.
   * Driven by the paired sources panel in the project_overview
   * composite (see `ProjectView`'s `hoveredSourceKey` state). Passed
   * straight through to the underlying `<ViewCardOverviewChart>`.
   */
  externalHoveredSourceKey?: string | null
}

export function ViewCardOverviewChartConnected({
  view,
  dateFrom,
  dateTo,
  mode,
  projectName,
  onUntrack,
  onPin,
  chromeless,
  externalHoveredSourceKey = null,
}: ViewCardOverviewChartConnectedProps) {
  const initialConfig = useMemo(() => readConfig(view), [view])
  const [primaryMetric, setPrimaryMetric] = useState<OverviewPrimaryMetric>(
    initialConfig.primaryMetric,
  )
  const [secondaryMetric, setSecondaryMetric] = useState<OverviewSecondaryMetric>(
    initialConfig.secondaryMetric,
  )
  // Connection-sourced overrides — when set, take priority over the
  // predefined string above. See `ProjectOverviewChartConfig` for
  // the storage contract.
  const [primaryConnectionMetric, setPrimaryConnectionMetric] = useState<
    ConnectionMetricRef | undefined
  >(initialConfig.primaryConnectionMetric)
  const [secondaryConnectionMetric, setSecondaryConnectionMetric] = useState<
    ConnectionMetricRef | null | undefined
  >(initialConfig.secondaryConnectionMetric)

  const [conversionsOpen, setConversionsOpen] = useState(false)
  const router = useRouter()

  // User tz threads into the per-provider chart endpoints so their
  // bucket labels line up with the project-overview chart's bars.
  // Without this the overlay would land in the wrong buckets when
  // user-tz differs from UTC.
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const { chart, loading, error, refresh } = useOverviewChartData(view.projectId, {
    dateFrom,
    dateTo,
    mode,
    primaryMetric,
    secondaryMetric,
  })

  // Fetch the secondary connection series in parallel with the main
  // chart fetch. `enabled` gates this so we don't spend a network
  // round-trip when the user is on a predefined secondary metric.
  const secondaryConnSeries = useConnectionMetricSeries({
    metric: secondaryConnectionMetric ?? null,
    dateFrom,
    dateTo,
    mode,
    tz,
    enabled: !!secondaryConnectionMetric,
  })

  // Compose the chart that goes into the presentation component:
  // when a secondary connection metric is set AND its series has
  // landed, replace each bucket's `.secondary` with the connection
  // series' value at the same INDEX. Index-aligned merge holds
  // because both fetches share the same (mode, dateFrom, dateTo)
  // → identical bucket count.
  //
  // When the series hasn't loaded yet we leave the original
  // `secondary` in place so the chart doesn't flash "empty
  // overlay" during the fetch. When the series errors out we
  // null the overlay (so it renders as "no data" rather than the
  // stale predefined value).
  const composedChart = useMemo(() => {
    if (!chart) return chart
    if (!secondaryConnectionMetric) return chart
    if (secondaryConnSeries.loading) return chart
    if (secondaryConnSeries.error || !secondaryConnSeries.points) {
      return {
        ...chart,
        buckets: chart.buckets.map(b => ({ ...b, secondary: null })),
        totalSecondary: null,
        secondaryUnavailable: true,
      }
    }
    const series = secondaryConnSeries.points
    const merged = chart.buckets.map((b, i) => ({
      ...b,
      secondary: series[i]?.value ?? null,
    }))
    const total = series.reduce((sum, p) => sum + (p.value ?? 0), 0)
    return {
      ...chart,
      buckets: merged,
      totalSecondary: total,
      secondaryUnavailable: false,
    }
  }, [chart, secondaryConnectionMetric, secondaryConnSeries])

  const handleMetricChange = (next: ProjectOverviewChartConfig) => {
    setPrimaryMetric(next.primaryMetric)
    setSecondaryMetric(next.secondaryMetric)
    setPrimaryConnectionMetric(next.primaryConnectionMetric)
    setSecondaryConnectionMetric(next.secondaryConnectionMetric)
    void persistConfig(next)
  }

  const persistConfig = async (next: ProjectOverviewChartConfig) => {
    try {
      await ALGORITHM.updateView(view.id, {
        config: next as unknown as Record<string, unknown>,
      })
    } catch {
      toast.error('Failed to save view settings')
    }
  }

  return (
    <>
      <ViewCardOverviewChart
        view={view}
        dateFrom={dateFrom}
        dateTo={dateTo}
        mode={mode}
        primaryMetric={primaryMetric}
        secondaryMetric={secondaryMetric}
        primaryConnectionMetric={primaryConnectionMetric}
        secondaryConnectionMetric={secondaryConnectionMetric}
        onMetricChange={handleMetricChange}
        chart={composedChart}
        loading={loading || secondaryConnSeries.loading}
        error={error}
        onRefresh={refresh}
        onOpenConversions={() => setConversionsOpen(true)}
        onOpenSettings={() => router.push('/hub/settings')}
        projectName={projectName}
        onUntrack={onUntrack}
        onPin={onPin}
        chromeless={chromeless}
        /* Always fill the parent's height — every real-mode caller
           of this wrapper places it in a grid cell with an
           explicit row-span-derived height (project view's
           unified grid, pinned views' grid). The chart adapts to
           the cell's height instead of forcing its own fixed
           340 px and overflowing into the next row. Demo + mobile
           paths use `<ViewCardOverviewChart>` directly without
           this wrapper, so they keep the fixed-height behavior. */
        fillHeight
        externalHoveredSourceKey={externalHoveredSourceKey}
      />
      <ProjectConversionsDialog
        projectId={view.projectId}
        open={conversionsOpen}
        onOpenChange={setConversionsOpen}
      />
    </>
  )
}
