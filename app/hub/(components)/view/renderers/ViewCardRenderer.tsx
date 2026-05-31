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

import { memo } from 'react'
import {
  isGAChartView,
  isPosthogChartView,
  isStripeChartView,
  readSentryFilters,
  useCalendlyMeetings,
  useGAChart,
  usePosthogChart,
  usePosthogFunnel,
  useSentryIssues,
  useStripeChart,
  useStripeTopCustomers,
  useViewLiveValue,
} from '@/app/hub/(components)/view/data'
import { toast } from 'sonner'
import { ALGORITHM } from '@/lib/api'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardCustomerList } from '@/app/hub/(components)/view/ViewCardCustomerList'
import { ViewCardFunnel } from '@/app/hub/(components)/view/ViewCardFunnel'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import { ViewCardSentryIssues } from '@/app/hub/(components)/view/ViewCardSentryIssues'
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

function ViewCardRendererImpl({
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
  // `usePosthogFunnel` short-circuits when the view isn't a funnel
  // (returns empty steps), so calling it unconditionally here is fine.
  // Hooks must be called in the same order on every render — gating
  // would violate the rules-of-hooks. Same approach the hooks above
  // take: hook-of-hook-of-hook style, dispatch decides which result
  // to actually render below.
  const funnel = usePosthogFunnel(view, { dateFrom, dateTo, tz })
  // Sentry — filters live on the view's config, not on the global
  // date range, so we pull period + sort from there for the hook
  // call. `readSentryFilters` falls back to safe defaults when the
  // view was just created and hasn't had its config touched yet.
  const sentryFilters = readSentryFilters(view)
  const sentry = useSentryIssues(view, sentryFilters)

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
  // Funnel — slots into the regular tile grid. `<ViewCardFunnel>`
  // owns its own `col-span` based on `view.config.displayMode`:
  // chart mode → 2×2, value mode → 1×1. Used to render in a
  // separate "wide PostHog" lane via `<WidePosthogViewRenderer>`;
  // moved here so funnels share grid cells with everything else.
  if (view.connectionType === 'posthog' && view.type === 'posthog_funnel') {
    return (
      <ViewCardFunnel
        view={view}
        steps={funnel.steps}
        loading={funnel.loading}
        error={funnel.error}
        onUntrack={onUntrack}
        onPin={handlePin}
        isPinned={view.isPinned}
        onRefresh={funnel.refresh}
        refreshing={funnel.loading}
        onConnectionAssigned={onConnectionAssigned}
        chromeless={chromeless}
      />
    )
  }
  // Sentry errors-list — 2×2 list tile with its own period + sort
  // dropdowns inside the card. Filters persist via
  // `<ViewCardSentryIssues>` calling `ALGORITHM.updateView`.
  if (view.connectionType === 'sentry' && view.type === 'sentry_issues_list') {
    return (
      <ViewCardSentryIssues
        view={view}
        issues={sentry.issues}
        loading={sentry.loading}
        error={sentry.error}
        period={sentryFilters.period}
        sort={sentryFilters.sort}
        // Real-mode persistence — PATCH the view's `config` so the
        // picker choice survives reload. Demo passes a no-op for this
        // (the demo's `<DemoViewCard>` keeps the choice in local
        // component state only).
        onFiltersChange={async next => {
          try {
            await ALGORITHM.updateView(view.id, {
              config: {
                ...(view.config ?? {}),
                period: next.period,
                sort: next.sort,
              },
            })
          } catch {
            toast.error('Failed to save filter')
          }
        }}
        onUntrack={onUntrack}
        onPin={handlePin}
        isPinned={view.isPinned}
        onRefresh={sentry.refresh}
        refreshing={sentry.loading}
        onConnectionAssigned={onConnectionAssigned}
        chromeless={chromeless}
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

/**
 * `React.memo` wrap so the tile bails out of re-renders when nothing
 * about the view actually changed. This is what stops the funnel from
 * appearing to "reload" during drag-and-drop reorders: dnd-kit's
 * sortable ticks parent renders frequently while a drag is in flight,
 * and without memoisation every tick recursed all the way down through
 * every view-card renderer and its data hooks. With memoisation, a
 * reorder produces ONE re-render per tile that actually moved in the
 * `views` array (because the `view` object reference is preserved via
 * `byId.get` in `handleReorder`); idle tiles stay put.
 *
 * Memo works only if the parent passes STABLE prop identities — that's
 * why `<useProjectView>` wraps `onUntrack` / `onPin` /
 * `onConnectionAssigned` in `useCallback` with refs. Otherwise the
 * default shallow comparison fails every render and the memo is moot.
 */
export const ViewCardRenderer = memo(ViewCardRendererImpl)
ViewCardRenderer.displayName = 'ViewCardRenderer'
