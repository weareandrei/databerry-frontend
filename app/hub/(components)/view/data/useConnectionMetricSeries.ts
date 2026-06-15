'use client'

/**
 * `useConnectionMetricSeries` — fetches a `ChartPoint[]` series for a
 * single connection-sourced metric (Stripe Gross Volume, GA Users,
 * etc.) so the overview chart can overlay it on its existing primary
 * bars.
 *
 * Routes by `connectionType` to the per-provider chart-data endpoint
 * the integration already exposes (no new backend code — these
 * endpoints already power the standalone tiles in the dashboard;
 * we're just calling them from a different surface).
 *
 * Wire shape it returns: `{ label, value }[]`. The OverviewChart
 * caller index-aligns these with its own bucket list — both
 * requests use the same `mode + dateFrom + dateTo`, so the bucket
 * COUNT is identical and a positional merge holds. This is the "B1"
 * pragmatic path we picked over the canonical-grid contract for v1;
 * see `backend/src/common/chart-grid.ts` for the eventual
 * keyspace-join replacement (Phase 3.0b/c).
 *
 * PostHog's `daily_counter` is intentionally NOT routed here — its
 * per-provider chart endpoint requires a stored `viewId`, not a
 * connectionId + viewType. The cascade UI surfaces it but the
 * onSelect handler short-circuits with a "needs event picker" hint;
 * full integration lands once we add a PostHog-specific event-name
 * sub-flow inside the dropdown.
 */

import { useEffect, useState } from 'react'
import { ALGORITHM } from '@/lib/api'
import { useViewRefreshNonce } from '@/lib/viewRefreshBus'
import type { ConnectionMetricRef } from '@/types/view'

/**
 * Stripe view types that return currency values in CENTS from the
 * upstream API (per Stripe's convention — `charge.amount` is always
 * the smallest currency unit). The OverviewChart formats secondary
 * values as dollars; if we passed cents through, a $246 charge
 * would render as "$24,600.00". Converted at the hook boundary so
 * the rest of the data path stays in canonical "dollars-as-floats".
 *
 * Aligns with the existing predefined-revenue path on the backend
 * (`project-overview.service.ts` divides Stripe values by 100
 * before stuffing them into `bySecondary[]`) — both sources now
 * agree on "secondary in dollars" as the wire contract.
 */
const STRIPE_CENTS_VIEW_TYPES = new Set(['stripe_gross', 'stripe_mrr'])

export interface ConnectionSeriesPoint {
  label: string
  value: number
}

export interface ConnectionSeriesResource {
  /** Series points if the fetch succeeded; `null` while loading or on error. */
  points: ConnectionSeriesPoint[] | null
  loading: boolean
  error: string | null
}

interface Opts {
  metric: ConnectionMetricRef | null | undefined
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  tz?: string | null
  /** Skip the fetch entirely — used when a parent gates the
   *  resource (e.g. the chart's data hook only wants the connection
   *  series when the predefined metric isn't already in use). */
  enabled?: boolean
}

export function useConnectionMetricSeries(opts: Opts): ConnectionSeriesResource {
  const { metric, dateFrom, dateTo, mode, tz = null, enabled = true } = opts
  const [points, setPoints] = useState<ConnectionSeriesPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const globalRefreshNonce = useViewRefreshNonce()

  // Serialise the metric ref for the deps array — the object itself
  // changes identity every render and would trigger an infinite
  // re-fetch loop. Stringification is cheap (refs are tiny).
  const metricKey = metric ? JSON.stringify(metric) : null

  useEffect(() => {
    if (!enabled || !metric) {
      setPoints(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    // Route by provider. Stripe Connect and Stripe Manual share the
    // same chart endpoint — both stored under `connections_stripe*`
    // and surfaced via `/stripe/views/chart-data`. PostHog uses the
    // dedicated `event-chart-data` endpoint which takes the event
    // name directly (no stored viewId needed for an ad-hoc cascade
    // pick); the `eventName` on the metric ref is filled by
    // `<PosthogEventPickerDialog>` before the ref is committed.
    let promise: Promise<{ points: { label: string; value: number }[] }>
    if (metric.connectionType === 'google_analytics') {
      promise = ALGORITHM.getGoogleAnalyticsChartData(
        metric.connectionId,
        metric.viewType,
        dateFrom,
        dateTo,
        mode,
        tz,
      )
    } else if (metric.connectionType === 'posthog') {
      if (!metric.eventName) {
        // The picker dialog should always set this before persisting
        // the ref — if we get here, something committed an
        // incomplete ref. Surface as error so the chart shows a clear
        // "no overlay" state rather than rendering an empty line.
        setPoints(null)
        setLoading(false)
        setError('PostHog metric is missing its event name — re-pick it from the dropdown.')
        return
      }
      promise = ALGORITHM.getPosthogEventChartData(
        metric.connectionId,
        metric.eventName,
        dateFrom,
        dateTo,
        mode,
        tz,
      )
    } else {
      promise = ALGORITHM.getStripeManualChartData(
        metric.connectionId,
        metric.viewType,
        dateFrom,
        dateTo,
        mode,
        tz,
      )
    }

    promise
      .then(res => {
        if (cancelled) return
        // GA's response includes an `unavailable: true` soft-failure
        // signal (e.g. property scope revoked); Stripe's doesn't.
        // Cast through `unknown` because only one of the two
        // promise branches has that field — TS narrows the union to
        // the lowest common denominator.
        const maybeUnavailable = (res as { unavailable?: boolean }).unavailable
        if (maybeUnavailable) {
          setPoints([])
          return
        }
        // Stripe currency metrics arrive in cents; convert here so
        // downstream display logic (which assumes dollars) renders
        // correctly. See STRIPE_CENTS_VIEW_TYPES at the top.
        const needsCentsConversion =
          (metric.connectionType === 'stripe' ||
            metric.connectionType === 'stripe_manual') &&
          STRIPE_CENTS_VIEW_TYPES.has(metric.viewType)
        if (needsCentsConversion) {
          setPoints(res.points.map(p => ({ ...p, value: p.value / 100 })))
        } else {
          setPoints(res.points)
        }
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch metric')
        setPoints(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricKey, dateFrom, dateTo, mode, tz, enabled, globalRefreshNonce])

  return { points, loading, error }
}
