'use client'

/**
 * Data hook for `<ViewCardOverviewSources>`.
 *
 * Fetches the two tabs' data — top-traffic-sources +
 * recently-active users — for a given project + date range.
 *
 * Original implementation lived inside `<ViewCardOverviewSources>`
 * with a lazy-on-first-tab-activation pattern (each tab fetched only
 * when first activated). We hoist that logic out here for the same
 * reason as `useOverviewChartData`: the demo's `<DemoProjectView>`
 * needs to render the same tile component with static mock data and
 * no API calls.
 *
 * The lazy pattern is preserved — `tab` is passed in by the caller
 * (component owns its own tab state), and the hook only fetches the
 * active tab plus refetches when `refreshSources` / `refreshUsers`
 * is called for that tab. Switching tabs back to a previously-fetched
 * one re-uses cached data.
 */
import { useEffect, useState } from 'react'
import { PROJECT_OVERVIEW, type OverviewSource, type OverviewUser } from '@/lib/api'

type Tab = 'sources' | 'users'

export interface OverviewSourcesTabState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** True once a fetch has at least been attempted. */
  fetched: boolean
}

export interface OverviewSourcesUsersTabState extends OverviewSourcesTabState<OverviewUser[]> {
  /** Only meaningful for 'users' — backend tells us why the list is empty. */
  provider?: 'google_analytics' | 'posthog' | null
}

export interface OverviewSourcesDataResource {
  sources: OverviewSourcesTabState<OverviewSource[]>
  users: OverviewSourcesUsersTabState
  refreshSources: () => void
  refreshUsers: () => void
}

interface UseOverviewSourcesDataOpts {
  tab: Tab
  dateFrom: string
  dateTo: string
}

function initialState<T>(): OverviewSourcesTabState<T> {
  return { data: null, loading: false, error: null, fetched: false }
}

export function useOverviewSourcesData(
  projectId: string,
  opts: UseOverviewSourcesDataOpts,
): OverviewSourcesDataResource {
  const { tab, dateFrom, dateTo } = opts
  const [sources, setSources] = useState<OverviewSourcesTabState<OverviewSource[]>>(initialState)
  const [users, setUsers] = useState<OverviewSourcesUsersTabState>(initialState)
  const [sourcesTick, setSourcesTick] = useState(0)
  const [usersTick, setUsersTick] = useState(0)

  // Sources fetch — runs on first 'sources' activation, on range
  // changes while the tab is visible, or on refresh tick bump.
  useEffect(() => {
    if (tab !== 'sources') return
    let cancelled = false
    setSources(s => ({ ...s, loading: true, error: null }))
    PROJECT_OVERVIEW.getSources(projectId, dateFrom, dateTo)
      .then(res => {
        if (cancelled) return
        setSources({ data: res.sources, loading: false, error: null, fetched: true })
      })
      .catch(err => {
        if (cancelled) return
        setSources({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load sources',
          fetched: true,
        })
      })
    return () => {
      cancelled = true
    }
  }, [tab, projectId, dateFrom, dateTo, sourcesTick])

  // Users fetch — same lazy + refresh pattern.
  useEffect(() => {
    if (tab !== 'users') return
    let cancelled = false
    setUsers(s => ({ ...s, loading: true, error: null }))
    PROJECT_OVERVIEW.getUsers(projectId, dateFrom, dateTo, 100)
      .then(res => {
        if (cancelled) return
        setUsers({
          data: res.users,
          loading: false,
          error: null,
          provider: res.provider,
          fetched: true,
        })
      })
      .catch(err => {
        if (cancelled) return
        setUsers({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load users',
          fetched: true,
        })
      })
    return () => {
      cancelled = true
    }
  }, [tab, projectId, dateFrom, dateTo, usersTick])

  return {
    sources,
    users,
    refreshSources: () => setSourcesTick(t => t + 1),
    refreshUsers: () => setUsersTick(t => t + 1),
  }
}
