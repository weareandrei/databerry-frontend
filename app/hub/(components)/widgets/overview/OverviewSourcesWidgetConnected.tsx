'use client'

/**
 * Real-mode wrapper around `<OverviewSourcesWidget>`.
 *
 * Owns the lazy-tab fetch state (`useOverviewSourcesData`) + the
 * active-tab state, and threads everything through the props-only
 * tile component below.
 *
 * Mirrors the same split as `<OverviewChartWidgetConnected>`:
 * real callers (project page, folder page, pinned-views card,
 * mobile project body) get a drop-in replacement for the previous
 * public API. Demo callers render `<OverviewSourcesWidget>`
 * directly with static mock data.
 */

import { useState, useEffect } from 'react'
import { OverviewSourcesWidget } from './OverviewSourcesWidget'
import { useOverviewSourcesData } from '../data/useOverviewSourcesData'
import type { Widget } from '@/types/widget'

type Tab = 'sources' | 'countries' | 'pages'

interface OverviewSourcesWidgetConnectedProps {
  view: Widget
  dateFrom: string
  dateTo: string
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
  chromeless?: boolean
  /**
   * Cross-component hover bridge — fires on Sources row hover so the
   * paired chart on the left can highlight matching segments. Owned
   * by the composite project_overview block in `ProjectView`, which
   * keeps the hovered source key in local state and feeds it back
   * into the chart's `externalHoveredSourceKey`. Optional so other
   * callers (mobile body, pinned tile) don't have to plumb it.
   */
  onSourceHover?: (sourceKey: string | null) => void
  hiddenSourceKeys?: ReadonlySet<string>
  onSourceToggle?: (sourceKey: string) => void
  /**
   * Composite mode — hides this panel's own 3-dots menu; the unified
   * project_overview header owns the single menu (see `hideMenu` on
   * `<OverviewSourcesWidget>`).
   */
  hideMenu?: boolean
  /**
   * Composite refresh signal. `OverviewComposite` bumps this when the
   * shared header's Refresh is clicked; on every change we re-fetch all
   * three tabs so "Refresh" reloads the whole overview, not just the
   * chart. 0 = initial mount → no refetch.
   */
  refreshTick?: number
}

export function OverviewSourcesWidgetConnected({
  view,
  dateFrom,
  dateTo,
  projectName,
  onUntrack,
  onPin,
  chromeless,
  onSourceHover,
  hiddenSourceKeys,
  onSourceToggle,
  hideMenu,
  refreshTick,
}: OverviewSourcesWidgetConnectedProps) {
  const [tab, setTab] = useState<Tab>('sources')
  const { sources, countries, pages, refreshSources, refreshCountries, refreshPages } =
    useOverviewSourcesData(view.projectId, { tab, dateFrom, dateTo })

  // Composite "Refresh" — re-fetch all three tabs whenever the shared
  // tick bumps (the unified header's single Refresh drives it). The
  // refresh fns are intentionally omitted from deps: fire on tick change
  // only, not when the fetchers' identities change between renders.
  useEffect(() => {
    if (refreshTick) {
      refreshSources()
      refreshCountries()
      refreshPages?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  return (
    <OverviewSourcesWidget
      view={view}
      dateFrom={dateFrom}
      dateTo={dateTo}
      tab={tab}
      onTabChange={setTab}
      sources={sources}
      countries={countries}
      pages={pages}
      onRefreshSources={refreshSources}
      onRefreshCountries={refreshCountries}
      onRefreshPages={refreshPages}
      projectName={projectName}
      onUntrack={onUntrack}
      onPin={onPin}
      chromeless={chromeless}
      onSourceHover={onSourceHover}
      hiddenSourceKeys={hiddenSourceKeys}
      onSourceToggle={onSourceToggle}
      hideMenu={hideMenu}
    />
  )
}
