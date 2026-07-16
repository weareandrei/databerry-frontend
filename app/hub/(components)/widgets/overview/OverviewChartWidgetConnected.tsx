'use client'

/**
 * Real-mode wrapper around `<OverviewChartWidget>`.
 *
 * `<OverviewChartWidget>` itself is provider-free — it accepts
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
 * `<OverviewChartWidget>` (just `view`, dates, mode, untrack /
 * pin / projectName / chromeless props).
 *
 * Demo callers do *not* import this wrapper — they render
 * `<OverviewChartWidget>` directly with static mock data.
 */

import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { OverviewChartWidget } from './OverviewChartWidget'
import { ProjectConversionsDialog } from '../(components)/ProjectConversionsDialog'
import { useOverviewChartData } from '../data/useOverviewChartData'
import { useConnectionMetricSeries } from '../data/useConnectionMetricSeries'
import { ALGORITHM } from '@/lib/api'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import type {
  ConnectionMetricRef,
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
  ProjectOverviewChartConfig,
  Widget,
} from '@/types/widget'

function readConfig(view: Widget): ProjectOverviewChartConfig {
  const cfg = view.config as Partial<ProjectOverviewChartConfig>
  return {
    // `undefined` (legacy rows without the key) → 'visitors'. An
    // explicit `null` (chart created while no traffic tool was
    // connected) stays null so the metric dropdown renders its
    // "Select metric" placeholder instead of pretending data exists.
    primaryMetric: cfg.primaryMetric === undefined ? 'visitors' : cfg.primaryMetric,
    secondaryMetric: cfg.secondaryMetric ?? null,
    // Connection overrides — explicitly carried through so the chart's
    // dropdown can display the picked connection metric's label
    // immediately on mount (without round-tripping to fetch).
    primaryConnectionMetric: cfg.primaryConnectionMetric,
    secondaryConnectionMetric: cfg.secondaryConnectionMetric,
  }
}

interface OverviewChartWidgetConnectedProps {
  view: Widget
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
   * straight through to the underlying `<OverviewChartWidget>`.
   */
  externalHoveredSourceKey?: string | null
  hiddenSourceKeys?: ReadonlySet<string>
  /**
   * Wrap the tile in the standard view chrome (border + shadow).
   * `<ProjectView>` passes `true` for `custom_chart` views so they
   * look like every other regular tile in the grid, and omits it
   * (defaults to `false`) for the `project_overview` composite
   * chart half — that one stays borderless by design.
   */
  withChrome?: boolean
  /**
   * Composite mode — the sources panel rendered beside the chart under
   * the shared header. Passed straight through to
   * `<OverviewChartWidget sourcesSlot>`; see there for the layout.
   */
  sourcesSlot?: ReactNode
  /**
   * Composite mode — overrides the menu's Refresh action so it reloads
   * BOTH halves (chart + sources) via the composite's shared tick,
   * rather than only this chart's series. When omitted, Refresh falls
   * back to the local chart refetch (standalone chart tiles).
   */
  onMenuRefresh?: () => void
  /**
   * Composite refresh signal — bumped by `OverviewComposite` (usually
   * from `onMenuRefresh`). Re-fetches this chart's series on every
   * change so the shared Refresh reloads the chart too. 0 = initial
   * mount → no refetch.
   */
  refreshTick?: number
  /**
   * When false, the chart uses a fixed inner height instead of
   * `flex-1`/`h-full` — needed on the home page where the overview
   * sits alone without the sources pane to establish grid row height.
   */
  fillHeight?: boolean
}

export function OverviewChartWidgetConnected({
  view,
  dateFrom,
  dateTo,
  mode,
  projectName,
  onUntrack,
  onPin,
  chromeless,
  externalHoveredSourceKey = null,
  hiddenSourceKeys,
  withChrome = false,
  sourcesSlot,
  onMenuRefresh,
  refreshTick,
  fillHeight = true,
}: OverviewChartWidgetConnectedProps) {
  const initialConfig = useMemo(() => readConfig(view), [view])
  const [primaryMetric, setPrimaryMetric] = useState<OverviewPrimaryMetric | null>(
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

  // Composite "Refresh": OverviewComposite bumps a shared tick so the
  // unified menu's single Refresh reloads BOTH halves. Re-fetch the
  // chart series whenever it changes (0 = initial mount → never fires
  // on mount). `refresh` intentionally omitted from deps — fire on an
  // actual tick bump only, not when the fetcher's identity changes.
  useEffect(() => {
    if (refreshTick) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  // Fetch primary + secondary connection series in parallel with
  // the main chart fetch. Each `enabled` gate prevents a wasted
  // round-trip when the corresponding axis is on a predefined
  // metric (the common case). Both hooks share the same mode +
  // dateFrom/dateTo so their bucket count matches the main fetch
  // and the index-aligned merge below is safe.
  const primaryConnSeries = useConnectionMetricSeries({
    metric: primaryConnectionMetric ?? null,
    dateFrom,
    dateTo,
    mode,
    tz,
    enabled: !!primaryConnectionMetric,
  })
  const secondaryConnSeries = useConnectionMetricSeries({
    metric: secondaryConnectionMetric ?? null,
    dateFrom,
    dateTo,
    mode,
    tz,
    enabled: !!secondaryConnectionMetric,
  })

  // Compose the chart that goes into the presentation component.
  //
  // Two independent overrides apply on top of the project-overview
  // base payload (which always carries the predefined-metric series
  // with source breakdown):
  //
  //   - PRIMARY override (when `primaryConnectionMetric` is set):
  //     replace each bucket's `.total` with the connection series'
  //     value at the same INDEX, and clear `.bySource = []`.
  //     Clearing the source list flips `<OverviewChart>` from
  //     stacked-source bars to a single gradient bar — connection
  //     metrics (Stripe Gross, PostHog event count, etc.) don't
  //     have a source breakdown, so the stacked rendering would
  //     just be misleading "leftover" visitor segments. Also bump
  //     `totalPrimary` to the connection series' sum so the
  //     header "Total: N" reflects what's actually being plotted.
  //
  //   - SECONDARY override (when `secondaryConnectionMetric` is
  //     set): replace each bucket's `.secondary` with the
  //     connection series' value. Same index-aligned merge.
  //
  // Each override is independent — the user can pick a connection
  // metric for the primary axis only, the secondary only, or both.
  //
  // Loading: leave the previous payload in place so the chart
  // doesn't flash empty during the fetch. Error: explicitly null
  // the affected axis so it renders as "no data" rather than the
  // stale predefined value.
  const composedChart = useMemo(() => {
    if (!chart) return chart
    let next = chart

    if (primaryConnectionMetric && !primaryConnSeries.loading) {
      if (primaryConnSeries.error || !primaryConnSeries.points) {
        next = {
          ...next,
          buckets: next.buckets.map(b => ({ ...b, total: 0, bySource: [] })),
          totalPrimary: 0,
          primaryUnavailable: true,
        }
      } else {
        const series = primaryConnSeries.points
        const merged = next.buckets.map((b, i) => ({
          ...b,
          total: series[i]?.value ?? 0,
          // Connection metrics are a single series — no source
          // breakdown exists. Clearing this drops the chart into
          // single-bar (gradient) render mode.
          bySource: [],
        }))
        const total = series.reduce((sum, p) => sum + (p.value ?? 0), 0)
        next = {
          ...next,
          buckets: merged,
          totalPrimary: total,
          primaryUnavailable: false,
        }
      }
    }

    if (secondaryConnectionMetric && !secondaryConnSeries.loading) {
      if (secondaryConnSeries.error || !secondaryConnSeries.points) {
        next = {
          ...next,
          buckets: next.buckets.map(b => ({ ...b, secondary: null })),
          totalSecondary: null,
          secondaryUnavailable: true,
        }
      } else {
        const series = secondaryConnSeries.points
        const merged = next.buckets.map((b, i) => ({
          ...b,
          secondary: series[i]?.value ?? null,
        }))
        const total = series.reduce((sum, p) => sum + (p.value ?? 0), 0)
        next = {
          ...next,
          buckets: merged,
          totalSecondary: total,
          secondaryUnavailable: false,
        }
      }
    }

    return next
  }, [chart, primaryConnectionMetric, primaryConnSeries, secondaryConnectionMetric, secondaryConnSeries])

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
      <OverviewChartWidget
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
        loading={loading || primaryConnSeries.loading || secondaryConnSeries.loading}
        error={error}
        onRefresh={onMenuRefresh ?? refresh}
        onOpenConversions={() => setConversionsOpen(true)}
        onOpenSettings={() => router.push('/hub/settings')}
        projectName={projectName}
        onUntrack={onUntrack}
        onPin={onPin}
        chromeless={chromeless}
        fillHeight={fillHeight}
        externalHoveredSourceKey={externalHoveredSourceKey}
        hiddenSourceKeys={hiddenSourceKeys}
        withChrome={withChrome}
        sourcesSlot={sourcesSlot}
      />
      <ProjectConversionsDialog
        projectId={view.projectId}
        open={conversionsOpen}
        onOpenChange={setConversionsOpen}
      />
    </>
  )
}
