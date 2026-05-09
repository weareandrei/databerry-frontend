'use client'

/**
 * View-tile dispatcher.
 *
 * Picks the right `<ViewCard*>` variant for a given view's type
 * (`stripe_*` chart → `ViewCardChart`, top customers → list,
 * Calendly meetings → list, anything else → the live-value
 * fallback). Used by both the desktop project body
 * (`<ProjectView>`) and the mobile project body
 * (`<MobileProjectBody>`) so the dispatch rules don't drift
 * between form factors.
 *
 * Used to be a private function inside `ProjectView.tsx`.
 * Extracted here so the mobile dispatcher can import it without
 * duplicating the four-case switch + the per-view-type data hook
 * calls.
 *
 * The view-type predicate helpers
 * (`isCalendlyMeetingsListView`, `isStripeTopCustomersView`,
 * `isListView`) live alongside the renderer and are exported
 * for any caller that needs to *partition* views by lane (e.g.
 * `ProjectBodyViews` filters out wide-PostHog + composite-
 * overview views before handing what remains to this
 * dispatcher).
 *
 * `chromeless` (default false) threads through to the inner
 * `<ViewCard*>` and from there into `<ViewWrapper variant=…>` —
 * `'borderless'` when chromeless. Mobile passes `chromeless` so
 * tiles render flat inside an outer white card; desktop omits
 * it and gets the existing border + shadow.
 */

import {
  isGAChartView,
  isPosthogChartView,
  isStripeChartView,
  useCalendlyMeetings,
  useGAChart,
  usePosthogChart,
  useStripeChart,
  useStripeTopCustomers,
  useViewLiveValue,
} from '@/app/hub/(components)/view/data'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardCustomerList } from '@/app/hub/(components)/view/ViewCardCustomerList'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import { formatIsoDateRange } from '@/utils/dateHelpers'
import type { View } from '@/types/view'

// ── View-type dispatch helpers ─────────────────────────────────────────────

export function isCalendlyMeetingsListView(view: View): boolean {
  return view.connectionType === 'calendly' && view.type === 'calendly_meetings_list'
}

export function isStripeTopCustomersView(view: View): boolean {
  return (
    (view.connectionType === 'stripe_manual' || view.connectionType === 'stripe') &&
    view.type === 'stripe_top_customers'
  )
}

export function isListView(view: View): boolean {
  // Calendly meetings + Stripe top customers both go through the wide list
  // lane — each has its own card component (different row shape) but they
  // share this dispatch helper so `ViewCardRenderer` only branches once.
  return isCalendlyMeetingsListView(view) || isStripeTopCustomersView(view)
}

/**
 * View types that get a date-range caption rendered below their value.
 * Currently just MRR — the caption answers "for which period was this
 * computed?", which is more meaningful for snapshot-style metrics than
 * for "today" tiles (e.g. today's gross revenue already says "today"
 * in its name; a redundant caption would just take vertical space).
 *
 * Lives here (not inside `ViewCard`) because the decision "should this
 * tile show a date caption?" is a CALLER concern: the page knows about
 * the global date range, ViewCard does not. Moving the predicate here
 * lets ViewCard stay provider-free.
 */
const DATE_RANGE_CAPTION_TYPES = new Set(['stripe_mrr'])

interface ViewCardRendererProps {
  view: View
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  /** User's currently-selected timezone, threaded into per-view data
   *  hooks so day-bucketing math runs in wall-clock time. Read once at
   *  the top of `useProjectView` from `state.ui.globalTimeZone`. */
  tz: string | null
  onUntrack: (id: string) => void
  onPin: (viewId: string) => void
  onConnectionAssigned: (updated: View) => void
  /**
   * When true, the picked `<ViewCard*>` renders without its own
   * border + shadow chrome (via `<ViewWrapper variant="borderless">`).
   * Mobile project body passes this so tiles sit flat inside its
   * outer white card. Default false → desktop behaviour, no change.
   */
  chromeless?: boolean
}

export function ViewCardRenderer({
  view,
  isRange,
  dateFrom,
  dateTo,
  mode,
  tz,
  onUntrack,
  onPin,
  onConnectionAssigned,
  chromeless = false,
}: ViewCardRendererProps) {
  const live = useViewLiveValue(view, { dateFrom, dateTo, tz })
  const stripeChart = useStripeChart(view, { dateFrom, dateTo, mode, tz })
  const gaChart = useGAChart(view, { dateFrom, dateTo, mode, tz })
  const posthogChart = usePosthogChart(view, { dateFrom, dateTo, tz })
  const meetings = useCalendlyMeetings(view, { dateFrom, dateTo, tz })
  const customers = useStripeTopCustomers(view, { dateFrom, dateTo, tz })

  // Compute the optional caption string for view types that benefit
  // from one (currently MRR). `formatIsoDateRange` returns null on
  // missing/invalid input, which `<ViewCard>` interprets as "no
  // caption" — keeps the dispatcher branchless.
  const dateRangeLabel = DATE_RANGE_CAPTION_TYPES.has(view.type)
    ? formatIsoDateRange(dateFrom, dateTo) ?? undefined
    : undefined

  const handlePin = () => onPin(view.id)
  const sharedCardProps = {
    view,
    onUntrack,
    onConnectionAssigned,
    onPin: handlePin,
    isPinned: view.isPinned,
    historical: isRange,
    chromeless,
  }

  if (isStripeChartView(view)) {
    return (
      <ViewCardChart
        {...sharedCardProps}
        points={stripeChart.points}
        loading={stripeChart.loading}
        error={stripeChart.error}
        total={stripeChart.total}
        onRefresh={stripeChart.refresh}
        refreshing={stripeChart.loading}
      />
    )
  }
  if (isGAChartView(view)) {
    return (
      <ViewCardChart
        {...sharedCardProps}
        points={gaChart.points}
        loading={gaChart.loading}
        error={gaChart.error}
        total={gaChart.total}
        onRefresh={gaChart.refresh}
        refreshing={gaChart.loading}
      />
    )
  }
  if (isPosthogChartView(view)) {
    return (
      <ViewCardChart
        {...sharedCardProps}
        points={posthogChart.points}
        loading={posthogChart.loading}
        error={posthogChart.error}
        total={posthogChart.total}
        onRefresh={posthogChart.refresh}
        refreshing={posthogChart.loading}
      />
    )
  }
  if (isStripeTopCustomersView(view)) {
    return (
      <ViewCardCustomerList
        {...sharedCardProps}
        customers={customers.customers}
        loading={customers.loading}
        error={customers.error}
        onRefresh={customers.refresh}
        refreshing={customers.loading}
      />
    )
  }
  if (isListView(view)) {
    return (
      <ViewCardList
        {...sharedCardProps}
        meetings={meetings.meetings}
        loading={meetings.loading}
        error={meetings.error}
        onRefresh={meetings.refresh}
        refreshing={meetings.loading}
      />
    )
  }
  return (
    <ViewCard
      view={view}
      onUntrack={onUntrack}
      liveValue={live.liveValue}
      liveLoading={live.liveLoading}
      liveError={live.liveError}
      onRefresh={live.refresh}
      refreshing={live.liveLoading}
      onPin={handlePin}
      isPinned={view.isPinned}
      onConnectionAssigned={onConnectionAssigned}
      dateRangeLabel={dateRangeLabel}
      chromeless={chromeless}
    />
  )
}
