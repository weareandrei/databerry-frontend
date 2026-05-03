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

const CHART_VIEW_TYPES = new Set([
  'stripe_gross_today',
  'stripe_gross_week',
  'stripe_gross',
])

export function isStripeChartView(view: View): boolean {
  return view.connectionType === 'stripe_manual' && CHART_VIEW_TYPES.has(view.type)
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

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.type,
    dateFrom,
    dateTo,
    mode,
    tz,
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
