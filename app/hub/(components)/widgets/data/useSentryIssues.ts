'use client'

/**
 * `useSentryIssues` — fetches the unresolved-issue list for a
 * `sentry_issues_list` view. The Sentry view ignores the global
 * date pill (`dateFrom` / `dateTo`) and uses its own per-tile
 * `period` + `sort` filters that live on the view's `config`. The
 * user toggles them via dropdowns inside the tile itself; that's a
 * better fit than the global pill because Sentry's "what's broken
 * recently" question lives in a different mental space than the
 * dashboard's revenue/users period.
 *
 * Filter values (kept in sync with the backend's whitelist in
 * `sentry/views/views.controller.ts`):
 *   - period: '24h' | '7d' | '30d' | '90d'
 *   - sort:   'recent' | 'frequent'
 *
 * Source-of-truth flows: callers persist their choice via
 * `ALGORITHM.updateView({ config: { ...prev, period, sort } })` —
 * same pattern `OverviewChartWidget` uses for its primary /
 * secondary metric pickers.
 */

import { ALGORITHM, type SentryIssue } from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import type { Widget } from '@/types/widget'

export type SentryIssuesPeriod = '24h' | '7d' | '30d' | '90d'
export type SentryIssuesSort = 'recent' | 'frequent'

export interface SentryIssuesResource {
  issues: SentryIssue[] | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

interface UseSentryIssuesOptions {
  period: SentryIssuesPeriod
  sort: SentryIssuesSort
  enabled?: boolean
}

export function useSentryIssues(
  view: Widget,
  options: UseSentryIssuesOptions,
): SentryIssuesResource {
  const { period, sort, enabled = true } = options
  const isApplicable =
    enabled && view.type === 'sentry_issues_list' && !!view.connectionId

  const fetcher = isApplicable
    ? () =>
        ALGORITHM.getSentryIssuesList(view.connectionId!, period, sort).then(
          res => res.issues,
        )
    : null

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.type,
    period,
    sort,
  ])

  return { issues: data, loading, error, refresh }
}

/**
 * Read the persisted filter values out of `view.config`. Defaults
 * match the backend's defaults so a freshly-created view (empty
 * config) reads the right "what's broken in the last 24h" payload.
 */
export function readSentryFilters(view: Widget): {
  period: SentryIssuesPeriod
  sort: SentryIssuesSort
} {
  const cfg = view.config as
    | { period?: SentryIssuesPeriod; sort?: SentryIssuesSort }
    | null
    | undefined
  const allowedPeriods: SentryIssuesPeriod[] = ['24h', '7d', '30d', '90d']
  const allowedSorts: SentryIssuesSort[] = ['recent', 'frequent']
  return {
    period: cfg?.period && allowedPeriods.includes(cfg.period) ? cfg.period : '24h',
    sort: cfg?.sort && allowedSorts.includes(cfg.sort) ? cfg.sort : 'recent',
  }
}
