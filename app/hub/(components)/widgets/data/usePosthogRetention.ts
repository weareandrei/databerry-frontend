'use client'

/**
 * `usePosthogRetention` — fetches cohort + per-period retention rows
 * for a `posthog_retention` view. The API also returns a
 * `periodLabel` ('day' | 'week') we hand back alongside `cohorts`,
 * so the heat-map column header can read "Day 0/1/2…" or "Week 0/1/2…".
 */

import {
  ALGORITHM,
  type PosthogRetentionRow,
} from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import type { Widget } from '@/types/widget'
import type { PerViewHookOptions } from './types'

interface RetentionPayload {
  cohorts: PosthogRetentionRow[]
  periodLabel: 'day' | 'week'
}

export interface PosthogRetentionResource {
  cohorts: PosthogRetentionRow[] | null
  /** Echoes back the view's `period` config — derived from the API
   *  response, not the view config, so a future server-side override
   *  (e.g. minimum cohort window) is reflected in the column labels. */
  periodLabel: 'day' | 'week' | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

export function usePosthogRetention(
  view: Widget,
  options: PerViewHookOptions = {},
): PosthogRetentionResource {
  const { dateFrom, dateTo, enabled = true, tz = null } = options

  const isApplicable =
    enabled && view.type === 'posthog_retention' && !!view.connectionId

  const fetcher = isApplicable
    ? (): Promise<RetentionPayload> =>
        ALGORITHM.getPosthogRetention(
          view.connectionId!,
          view.id,
          dateFrom,
          dateTo,
          tz,
        ).then(res => ({
          cohorts: res.unavailable ? [] : res.cohorts,
          periodLabel: res.periodLabel,
        }))
    : null

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.id,
    dateFrom,
    dateTo,
    tz,
  ])

  return {
    cohorts: data?.cohorts ?? null,
    periodLabel: data?.periodLabel ?? null,
    loading,
    error,
    refresh,
  }
}
