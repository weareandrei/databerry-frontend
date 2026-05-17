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

type Tab = 'sources' | 'countries'

interface ViewCardOverviewSourcesConnectedProps {
  view: View
  dateFrom: string
  dateTo: string
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
  chromeless?: boolean
}

export function ViewCardOverviewSourcesConnected({
  view,
  dateFrom,
  dateTo,
  projectName,
  onUntrack,
  onPin,
  chromeless,
}: ViewCardOverviewSourcesConnectedProps) {
  const [tab, setTab] = useState<Tab>('sources')
  const { sources, countries, refreshSources, refreshCountries } = useOverviewSourcesData(
    view.projectId,
    { tab, dateFrom, dateTo },
  )

  return (
    <ViewCardOverviewSources
      view={view}
      dateFrom={dateFrom}
      dateTo={dateTo}
      tab={tab}
      onTabChange={setTab}
      sources={sources}
      countries={countries}
      onRefreshSources={refreshSources}
      onRefreshCountries={refreshCountries}
      projectName={projectName}
      onUntrack={onUntrack}
      onPin={onPin}
      chromeless={chromeless}
    />
  )
}
