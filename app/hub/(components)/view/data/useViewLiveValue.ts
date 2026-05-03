'use client'

/**
 * `useViewLiveValue` — the catch-all "single value" fetcher used by
 * `<ViewCard>` for every value-tile: Stripe SaaS metrics, Calendly
 * counters, GA tiles, PostHog daily counters.
 *
 * Each value-tile view type maps to one of four backend endpoints —
 * we pick the right one from the connection-type and the view's
 * `type` string. The tile itself doesn't care which endpoint produced
 * the number; it just renders `liveValue`.
 */

import { ALGORITHM } from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import { useStripeRefreshListener } from '@/lib/hooks/useStripeSyncOnMount'
import type { View } from '@/types/view'
import type { PerViewHookOptions } from './types'

// SaaS metrics tiles backed by `stripe_subscriptions` (MRR, active subs,
// churn) join `stripe_revenue_today` here — all served by the same
// `/stripe/views/live-value` endpoint.
const STRIPE_MANUAL_LIVE_TYPES = new Set([
  'stripe_revenue_today',
  'stripe_mrr',
  'stripe_active_subs',
  'stripe_churn_rate',
])
const CALENDLY_LIVE_TYPES = new Set(['calendly_meetings_today'])
const GA_LIVE_TYPES = new Set([
  'ga_active_users',
  'ga_users_today',
  'ga_sessions_today',
  'ga_pageviews_today',
])

interface LiveValueDispatch {
  stripeManual: boolean
  calendly: boolean
  ga: boolean
  posthog: boolean
  any: boolean
}

function classifyLiveValue(view: View): LiveValueDispatch {
  const stripeManual =
    view.connectionType === 'stripe_manual' && STRIPE_MANUAL_LIVE_TYPES.has(view.type)
  const calendly =
    view.connectionType === 'calendly' && CALENDLY_LIVE_TYPES.has(view.type)
  const ga =
    view.connectionType === 'google_analytics' && GA_LIVE_TYPES.has(view.type)
  const posthog = view.connectionType === 'posthog'
  return {
    stripeManual,
    calendly,
    ga,
    posthog,
    any: stripeManual || calendly || ga || posthog,
  }
}

export interface ViewLiveValueResource {
  liveValue: string | null
  liveLoading: boolean
  liveError: ViewResourceError | null
  /** `undefined` when this view doesn't produce a live value (e.g. wide
   *  PostHog cards) — matches the existing `<ViewCard onRefresh?>` shape. */
  refresh: (() => void) | undefined
}

export function useViewLiveValue(
  view: View,
  options: PerViewHookOptions = {},
): ViewLiveValueResource {
  const { dateFrom, dateTo, enabled = true, tz = null } = options

  const dispatch = classifyLiveValue(view)
  const isApplicable = enabled && dispatch.any && !!view.connectionId

  const fetcher = isApplicable
    ? async () => {
        if (dispatch.stripeManual)
          return ALGORITHM.getStripeManualLiveValue(view.connectionId!, view.type, dateFrom, dateTo, tz)
        if (dispatch.calendly)
          return ALGORITHM.getCalendlyLiveValue(view.connectionId!, view.type, dateFrom, dateTo, tz)
        if (dispatch.posthog)
          return ALGORITHM.getPosthogLiveValue(view.connectionId!, view.id, dateFrom, dateTo, tz)
        return ALGORITHM.getGoogleAnalyticsLiveValue(view.connectionId!, view.type, dateFrom, dateTo, tz)
      }
    : null

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.type,
    view.id,
    dispatch.any,
    dateFrom,
    dateTo,
    tz,
  ])

  // Auto-refresh when a Stripe sync (live-on-mount or manual reload) lands
  // for this connection. Stripe-only — Calendly / GA / PostHog tiles either
  // have their own freshness story (webhooks for Calendly, polling for the
  // others) or live-mode reads that bypass the DB cache entirely. Wiring
  // them into this listener would refire fetches needlessly.
  useStripeRefreshListener(
    dispatch.stripeManual ? view.connectionId : null,
    refresh,
  )

  return {
    liveValue: data?.unavailable ? null : (data?.value ?? null),
    liveLoading: loading,
    liveError: error,
    refresh,
  }
}
