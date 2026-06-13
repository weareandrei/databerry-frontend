'use client'

/**
 * Real-mode wrapper around `<ViewCardOverviewSources>`.
 *
 * Owns the lazy-tab fetch state (`useOverviewSourcesData`) + the
 * active-tab state, and threads everything through the props-only
 * tile component below.
 *
 * Mirrors the same split as `<ViewCardOverviewChartConnected>`:
 * real callers (project page, folder page, pinned-views card,
 * mobile project body) get a drop-in replacement for the previous
 * public API. Demo callers render `<ViewCardOverviewSources>`
 * directly with static mock data.
 */

import { useState } from 'react'
import { ViewCardOverviewSources } from './ViewCardOverviewSources'
import { useOverviewSourcesData } from './data/useOverviewSourcesData'
import type { View } from '@/types/view'

type Tab = 'sources' | 'countries' | 'pages'

interface ViewCardOverviewSourcesConnectedProps {
  view: View
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
}

export function ViewCardOverviewSourcesConnected({
  view,
  dateFrom,
  dateTo,
  projectName,
  onUntrack,
  onPin,
  chromeless,
  onSourceHover,
}: ViewCardOverviewSourcesConnectedProps) {
  const [tab, setTab] = useState<Tab>('sources')
  const { sources, countries, pages, refreshSources, refreshCountries, refreshPages } =
    useOverviewSourcesData(view.projectId, { tab, dateFrom, dateTo })

  return (
    <ViewCardOverviewSources
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
    />
  )
}
