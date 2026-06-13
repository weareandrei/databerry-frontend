'use client'

/**
 * Data hook for `<ViewCardOverviewSources>`.
 *
 * Fetches the two tabs' data — top-traffic-sources +
 * top-countries — for a given project + date range.
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
 * active tab plus refetches when `refreshSources` / `refreshCountries`
 * is called for that tab. Switching tabs back to a previously-fetched
 * one re-uses cached data.
 *
 * The old "Users" tab was retired in favour of "Countries" — a more
 * scannable rollup that doesn't require PostHog person-identification
 * to be meaningful. The standalone per-user list still exists as the
 * `posthog_users` view type for users who want per-visitor depth.
 */
import { useEffect, useState } from 'react'
import {
  PROJECT_OVERVIEW,
  type OverviewSource,
  type OverviewCountry,
  type OverviewPage,
} from '@/lib/api'

type Tab = 'sources' | 'countries' | 'pages'

export interface OverviewSourcesTabState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** True once a fetch has at least been attempted. */
  fetched: boolean
}

export interface OverviewCountriesTabState extends OverviewSourcesTabState<OverviewCountry[]> {
  /** Backend tells us why the list is empty (GA unsupported, etc.). */
  provider?: 'google_analytics' | 'posthog' | null
}

export interface OverviewPagesTabState extends OverviewSourcesTabState<OverviewPage[]> {
  /** `null` = no traffic provider connected. */
  provider?: 'google_analytics' | 'posthog' | null
}

export interface OverviewSourcesDataResource {
  sources: OverviewSourcesTabState<OverviewSource[]>
  countries: OverviewCountriesTabState
  pages: OverviewPagesTabState
  refreshSources: () => void
  refreshCountries: () => void
  refreshPages: () => void
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
  const [countries, setCountries] = useState<OverviewCountriesTabState>(initialState)
  const [pages, setPages] = useState<OverviewPagesTabState>(initialState)
  const [sourcesTick, setSourcesTick] = useState(0)
  const [countriesTick, setCountriesTick] = useState(0)
  const [pagesTick, setPagesTick] = useState(0)

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

  // Countries fetch — same lazy + refresh pattern.
  useEffect(() => {
    if (tab !== 'countries') return
    let cancelled = false
    setCountries(s => ({ ...s, loading: true, error: null }))
    PROJECT_OVERVIEW.getCountries(projectId, dateFrom, dateTo, 50)
      .then(res => {
        if (cancelled) return
        setCountries({
          data: res.countries,
          loading: false,
          error: null,
          provider: res.provider,
          fetched: true,
        })
      })
      .catch(err => {
        if (cancelled) return
        setCountries({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load countries',
          fetched: true,
        })
      })
    return () => {
      cancelled = true
    }
  }, [tab, projectId, dateFrom, dateTo, countriesTick])

  // Pages fetch — same lazy + refresh pattern as the other tabs.
  useEffect(() => {
    if (tab !== 'pages') return
    let cancelled = false
    setPages(s => ({ ...s, loading: true, error: null }))
    PROJECT_OVERVIEW.getPages(projectId, dateFrom, dateTo, 50)
      .then(res => {
        if (cancelled) return
        setPages({
          data: res.pages,
          loading: false,
          error: null,
          provider: res.provider,
          fetched: true,
        })
      })
      .catch(err => {
        if (cancelled) return
        setPages({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load pages',
          fetched: true,
        })
      })
    return () => {
      cancelled = true
    }
  }, [tab, projectId, dateFrom, dateTo, pagesTick])

  return {
    sources,
    countries,
    pages,
    refreshSources: () => setSourcesTick(t => t + 1),
    refreshCountries: () => setCountriesTick(t => t + 1),
    refreshPages: () => setPagesTick(t => t + 1),
  }
}
