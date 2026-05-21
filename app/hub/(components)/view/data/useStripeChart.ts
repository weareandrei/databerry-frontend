'use client'

/**
 * `useStripeChart` — fetches the chart points + a "total" header value
 * for the wide Stripe chart cards (`stripe_gross`, `stripe_gross_today`,
 * `stripe_gross_week`).
 *
 * The total is intentionally NOT a sum of the points — the live-value
 * endpoint is authoritative because it's the same number the SaaS-metric
 * tiles read elsewhere. We fall back to summing points only when the
 * live value is unavailable (typically because the Stripe account isn't
 * linked yet) so a real zero-revenue day still reads "$0" instead of "—".
 */

import { ALGORITHM } from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import { useStripeRefreshListener } from '@/lib/hooks/useStripeSyncOnMount'
import type { ChartPoint } from '@/app/hub/(components)/view/ViewCardChart'
import type { View } from '@/types/view'
import type { PerViewHookOptions } from './types'

// Legacy chart-only types — these always render as a chart. `stripe_gross`
// is the consolidated polymorphic type (chart by default, value when
// `config.displayMode === 'value'`); the legacy `stripe_revenue_today`
// type was merged in via the 2026-05 migration.
const CHART_ONLY_VIEW_TYPES = new Set([
  'stripe_gross_today',
  'stripe_gross_week',
])

export function isStripeChartView(view: View): boolean {
  if (view.connectionType !== 'stripe_manual') return false
  if (CHART_ONLY_VIEW_TYPES.has(view.type)) return true
  // stripe_gross is the polymorphic merged type — chart mode unless
  // explicitly opted into value mode via config.displayMode.
  if (view.type === 'stripe_gross') {
    const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
    return displayMode !== 'value'
  }
  return false
}

interface StripeChartPayload {
  points: ChartPoint[]
  total: number | null
}

export interface StripeChartResource {
  points: ChartPoint[]
  total: number | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

interface StripeChartOptions extends PerViewHookOptions {
  /** Bucket granularity for the chart. Folder page passes `undefined`
   *  and lets the API default kick in (per-day for short ranges, etc.). */
  mode?: 'daily' | 'weekly' | 'monthly'
}

export function useStripeChart(
  view: View,
  options: StripeChartOptions = {},
): StripeChartResource {
  const { dateFrom, dateTo, mode, enabled = true, tz = null } = options
  const isApplicable = enabled && isStripeChartView(view) && !!view.connectionId

  const fetcher = isApplicable
    ? async (): Promise<StripeChartPayload> => {
        const [chartRes, liveRes] = await Promise.all([
          ALGORITHM.getStripeManualChartData(
            view.connectionId!,
            view.type,
            dateFrom,
            dateTo,
            mode,
            tz,
          ),
          ALGORITHM.getStripeManualLiveValue(
            view.connectionId!,
            view.type,
            dateFrom,
            dateTo,
            tz,
          ),
        ])
        const liveTotal =
          liveRes.value != null && !liveRes.unavailable
            ? parseInt(liveRes.value, 10)
            : null
        const total =
          liveTotal != null
            ? liveTotal
            : chartRes.points.length > 0
              ? chartRes.points.reduce((s, p) => s + p.value, 0)
              : null
        return { points: chartRes.points, total }
      }
    : null

  // `isApplicable` participates in the deps so an in-place flip of
  // `view.config.displayMode` (the "Convert to chart" menu item)
  // re-triggers the fetch. Without it the dep array only watches the
  // surface props that didn't change during conversion (connectionId,
  // type, dateFrom/dateTo, mode, tz are all identical before/after),
  // so the hook stayed on the previous render's `fetcher = null`
  // result and the chart kept rendering "no data" until the next
  // hard page reload.
  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.type,
    dateFrom,
    dateTo,
    mode,
    tz,
    isApplicable,
  ])

  // Re-fetch when a Stripe sync lands for this connection — see the
  // listener docs in `useStripeSyncOnMount`.
  useStripeRefreshListener(
    isApplicable ? view.connectionId : null,
    refresh,
  )

  return {
    points: data?.points ?? [],
    total: data?.total ?? null,
    loading,
    error,
    refresh,
  }
}
