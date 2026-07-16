'use client'

/**
 * `useWidgetLiveValue` — the catch-all "single value" fetcher used by
 * `<LiveValueWidget>` for every value-tile: Stripe SaaS metrics, Calendly
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
import type { Widget } from '@/types/widget'
import type { PerViewHookOptions } from './types'

// SaaS metrics tiles backed by `stripe_subscriptions` (MRR, active subs,
// churn) — all served by the same `/stripe/views/live-value` endpoint.
// `stripe_gross` joins this set when `config.displayMode === 'value'`
// (the merged-in successor of the legacy `stripe_revenue_today` type).
const STRIPE_MANUAL_LIVE_TYPES = new Set([
  'stripe_mrr',
  'stripe_active_subs',
  'stripe_churn_rate',
])
const CALENDLY_LIVE_TYPES = new Set(['calendly_meetings_today'])
// GA live-value types stay live-value when `config.displayMode === 'value'`
// (the default). Chart mode for users/sessions/pageviews routes through
// `useGAChart` instead — see `WidgetRenderer.tsx`.
const GA_LIVE_TYPES = new Set([
  'ga_active_users',
  'ga_users_today',
  'ga_sessions_today',
  'ga_pageviews_today',
])

function isStripeManualValueView(view: Widget): boolean {
  if (view.connectionType !== 'stripe_manual') return false
  if (STRIPE_MANUAL_LIVE_TYPES.has(view.type)) return true
  // stripe_gross + displayMode='value' → today's gross revenue (legacy
  // `stripe_revenue_today` semantics, merged into the polymorphic type).
  if (view.type === 'stripe_gross') {
    const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
    return displayMode === 'value'
  }
  return false
}

function isGAValueView(view: Widget): boolean {
  if (view.connectionType !== 'google_analytics') return false
  if (!GA_LIVE_TYPES.has(view.type)) return false
  // ga_active_users is realtime-only — no chart mode exists, so always value.
  if (view.type === 'ga_active_users') return true
  // The other three are polymorphic — value when displayMode is unset (legacy
  // default) or explicitly 'value'. Chart mode routes through useGAChart.
  const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
  return displayMode !== 'chart'
}

function isPosthogValueView(view: Widget): boolean {
  if (view.connectionType !== 'posthog') return false
  // daily_counter is the only PostHog *live-value* type. funnel/retention/users
  // route through their own dedicated hooks. Chart mode for daily_counter
  // routes through usePosthogChart.
  if (view.type === 'daily_counter') {
    const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
    return displayMode !== 'chart'
  }
  // Legacy PostHog wide cards are not live-value views — preserved by the
  // existing `dispatch.posthog` short-circuit when the view-type doesn't
  // match daily_counter (the dispatch returns false via the same predicate).
  return false
}

interface LiveValueDispatch {
  stripeManual: boolean
  calendly: boolean
  ga: boolean
  posthog: boolean
  any: boolean
}

function classifyLiveValue(view: Widget): LiveValueDispatch {
  const stripeManual = isStripeManualValueView(view)
  const calendly =
    view.connectionType === 'calendly' && CALENDLY_LIVE_TYPES.has(view.type)
  const ga = isGAValueView(view)
  // PostHog stays on the live-value path for daily_counter (value mode) and
  // for the legacy wide cards (funnel/retention/users) — those return null
  // values via their own hooks but still flow through this dispatch as
  // historical no-ops. `isPosthogValueView` handles daily_counter; the
  // remaining wide cards keep the existing posthog short-circuit.
  const posthog =
    view.connectionType === 'posthog' &&
    (isPosthogValueView(view) || view.type !== 'daily_counter')
  return {
    stripeManual,
    calendly,
    ga,
    posthog,
    any: stripeManual || calendly || ga || posthog,
  }
}

export interface WidgetLiveValueResource {
  liveValue: string | null
  liveLoading: boolean
  liveError: ViewResourceError | null
  /** `undefined` when this view doesn't produce a live value (e.g. wide
   *  PostHog cards) — matches the existing `<LiveValueWidget onRefresh?>` shape. */
  refresh: (() => void) | undefined
}

export function useWidgetLiveValue(
  view: Widget,
  options: PerViewHookOptions = {},
): WidgetLiveValueResource {
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
