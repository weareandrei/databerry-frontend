'use client'

/**
 * Folder page: deep view of a single folder with the ability to rewind
 * dates per-tile via the local date picker (independent from the global
 * range used on the project page).
 *
 * Per-view fetching lives in `app/hub/(components)/view/data/`. The wide
 * PostHog cards come from
 * `app/hub/(components)/view/renderers/WidePosthogViewRenderer.tsx`.
 *
 * Historical (non-today) date semantics:
 *   - Live-only views (Stripe live-value, Calendly meetings,
 *     PostHog funnel/retention/users) skip-fetch and render their
 *     "Live data only" empty state.
 *   - Stripe charts use the historical *cached* value from
 *     `view.value` (`views_values` row) for the header total — that's
 *     why the folder page is the only consumer of that field.
 *   - Project-overview cards (chart + sources) take the chosen day
 *     directly as their range.
 */

import { use, useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import type { RootState } from '@/store'
import { ALGORITHM } from '@/lib/api'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import { ViewCardCustomerList } from '@/app/hub/(components)/view/ViewCardCustomerList'
import { ViewCardOverviewChartConnected } from '@/app/hub/(components)/view/ViewCardOverviewChartConnected'
import { ViewCardOverviewSourcesConnected } from '@/app/hub/(components)/view/ViewCardOverviewSourcesConnected'
import {
  WidePosthogViewRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/view/renderers/WidePosthogViewRenderer'
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
import { useStripeSyncOnMount } from '@/lib/hooks/useStripeSyncOnMount'
import { Button } from '@/components/ui/button'
import type { View } from '@/types/view'
import { toDateStr, isSameDay, addDays, formatDateLabel } from '@/utils/dateHelpers'

// ── View dispatch helpers ──────────────────────────────────────────────────

function isCalendlyMeetingsListView(view: View): boolean {
  return view.connectionType === 'calendly' && view.type === 'calendly_meetings_list'
}
function isStripeTopCustomersView(view: View): boolean {
  return (
    (view.connectionType === 'stripe_manual' || view.connectionType === 'stripe') &&
    view.type === 'stripe_top_customers'
  )
}

// ── Per-view dispatch ──────────────────────────────────────────────────────

interface ViewCardRouterProps {
  view: View
  historical: boolean
  selectedDate: Date
  /** User's currently-selected timezone (page reads it once from Redux
   *  and passes down). Threaded into the per-view data hooks so day
   *  bucketing matches the rest of the app. */
  tz: string | null
  onUntrack: (id: string) => void
  onConnectionAssigned?: (updated: View) => void
}

function ViewCardRouter({
  view,
  historical,
  selectedDate,
  tz,
  onUntrack,
  onConnectionAssigned,
}: ViewCardRouterProps) {
  // Folder-page hooks always run with API defaults (no explicit dateFrom/
  // dateTo); the date picker is local to this page, not global. When
  // `historical` is true we skip-fetch via `enabled: false` so the cards
  // show their "Live data only" empty state.
  const live = useViewLiveValue(view, { enabled: !historical, tz })
  const stripeChart = useStripeChart(view, { enabled: !historical, tz })
  const gaChart = useGAChart(view, { enabled: !historical, tz })
  const posthogChart = usePosthogChart(view, { enabled: !historical, tz })
  const meetings = useCalendlyMeetings(view, { enabled: !historical, tz })
  const customers = useStripeTopCustomers(view, { enabled: !historical, tz })

  // Special-case for Stripe charts on historical days: read the cached
  // header total from `view.value` (the `views_values` row keyed on the
  // selected day) since the live-value endpoint was skipped. Points stay
  // empty — we don't store hourly historical buckets.
  const historicalChartTotal =
    historical && view.value != null ? parseInt(view.value, 10) : null

  if (view.type === 'project_overview') {
    const dateStr = toDateStr(selectedDate)
    return (
      <ViewCardOverviewChartConnected
        view={view}
        dateFrom={dateStr}
        dateTo={dateStr}
        mode="daily"
        onUntrack={onUntrack}
      />
    )
  }
  if (view.type === 'project_overview_sources') {
    const dateStr = toDateStr(selectedDate)
    return (
      <ViewCardOverviewSourcesConnected
        view={view}
        dateFrom={dateStr}
        dateTo={dateStr}
        onUntrack={onUntrack}
      />
    )
  }

  if (isWidePosthogView(view)) {
    // Pass `selectedDate` as a single-day window so funnels / retention /
    // users render for the rewound day rather than the API's "today"
    // default. The renderer no longer cares about `historical` — it
    // always fetches against whatever range we hand it.
    const dateStr = toDateStr(selectedDate)
    return (
      <WidePosthogViewRenderer
        view={view}
        dateFrom={dateStr}
        dateTo={dateStr}
        onUntrack={onUntrack}
        onConnectionAssigned={onConnectionAssigned}
      />
    )
  }

  if (isStripeChartView(view)) {
    return (
      <ViewCardChart
        view={view}
        onUntrack={onUntrack}
        historical={historical}
        points={stripeChart.points}
        loading={stripeChart.loading}
        error={stripeChart.error}
        total={historical ? historicalChartTotal : stripeChart.total}
        onRefresh={stripeChart.refresh}
        refreshing={stripeChart.loading}
        onConnectionAssigned={onConnectionAssigned}
      />
    )
  }
  if (isGAChartView(view)) {
    return (
      <ViewCardChart
        view={view}
        onUntrack={onUntrack}
        historical={historical}
        points={gaChart.points}
        loading={gaChart.loading}
        error={gaChart.error}
        total={gaChart.total}
        onRefresh={gaChart.refresh}
        refreshing={gaChart.loading}
        onConnectionAssigned={onConnectionAssigned}
      />
    )
  }
  if (isPosthogChartView(view)) {
    return (
      <ViewCardChart
        view={view}
        onUntrack={onUntrack}
        historical={historical}
        points={posthogChart.points}
        loading={posthogChart.loading}
        error={posthogChart.error}
        total={posthogChart.total}
        onRefresh={posthogChart.refresh}
        refreshing={posthogChart.loading}
        onConnectionAssigned={onConnectionAssigned}
      />
    )
  }
  if (isStripeTopCustomersView(view)) {
    return (
      <ViewCardCustomerList
        view={view}
        onUntrack={onUntrack}
        historical={historical}
        customers={customers.customers}
        loading={customers.loading}
        error={customers.error}
        onRefresh={customers.refresh}
        refreshing={customers.loading}
        onConnectionAssigned={onConnectionAssigned}
      />
    )
  }
  if (isCalendlyMeetingsListView(view)) {
    return (
      <ViewCardList
        view={view}
        onUntrack={onUntrack}
        historical={historical}
        meetings={meetings.meetings}
        loading={meetings.loading}
        error={meetings.error}
        onRefresh={meetings.refresh}
        refreshing={meetings.loading}
        onConnectionAssigned={onConnectionAssigned}
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
      onConnectionAssigned={onConnectionAssigned}
    />
  )
}

// ── Folder-level state hook ────────────────────────────────────────────────

function useFolderPage(folderId: string) {
  const { folders: foldersCtx, views: viewsCtx } = useDashboard()
  const folder = foldersCtx.folders.find(f => f.id === folderId)
  const subFolders = foldersCtx.getChildFolders(folderId)
  const todayViews = viewsCtx.getViewsByFolder(folderId)

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [historicalViews, setHistoricalViews] = useState<View[] | null>(null)
  const [loadingHistorical, setLoadingHistorical] = useState(false)

  const isToday = isSameDay(selectedDate, new Date())
  const folderViews = isToday ? todayViews : (historicalViews ?? [])

  useEffect(() => {
    viewsCtx.loadViewsForFolder(folderId)
  }, [folderId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistorical = useCallback(
    async (date: Date) => {
      setLoadingHistorical(true)
      try {
        const data = await ALGORITHM.getViewsByFolder(folderId, toDateStr(date))
        setHistoricalViews(data)
      } catch {
        setHistoricalViews([])
      } finally {
        setLoadingHistorical(false)
      }
    },
    [folderId],
  )

  useEffect(() => {
    if (isToday) setHistoricalViews(null)
    else loadHistorical(selectedDate)
  }, [selectedDate, isToday, loadHistorical])

  // Live-on-mount Stripe sync — only for the "today" view, since historical
  // dates render from the `views_values` cache and don't read the live
  // tables (the sync wouldn't change what the user sees).
  useStripeSyncOnMount(isToday ? folderViews : null)

  const isEmpty =
    subFolders.length === 0 && folderViews.length === 0 && !loadingHistorical

  return {
    folder,
    subFolders,
    folderViews,
    isToday,
    selectedDate,
    setSelectedDate,
    loadingHistorical,
    isEmpty,
    foldersCtx,
    viewsCtx,
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = use(params)
  const {
    folder,
    subFolders,
    folderViews,
    isToday,
    selectedDate,
    setSelectedDate,
    loadingHistorical,
    isEmpty,
    foldersCtx,
    viewsCtx,
  } = useFolderPage(folderId)

  // Lifted Redux read — passed down to FolderViewsBody → ViewCardRouter
  // → per-view data hooks. The view tree itself stays provider-free.
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  if (!folder) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground text-sm">Folder not found</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <FolderHeader
        folder={folder}
        onNewFolder={() => foldersCtx.openModal(folderId, folder.projectId)}
        onAddView={() => viewsCtx.openModal(folderId, folder.projectId)}
      />

      <div className="space-y-8">
        {subFolders.length > 0 && (
          <FolderGrid
            folders={subFolders}
            onDeleteFolder={foldersCtx.deleteFolder}
            onRenameFolder={foldersCtx.renameFolder}
            onCreateSubfolder={foldersCtx.openModal}
          />
        )}

        <div>
          <FolderViewsHeader
            selectedDate={selectedDate}
            isToday={isToday}
            onPrevDay={() => setSelectedDate(d => addDays(d, -1))}
            onNextDay={() => {
              if (!isToday) setSelectedDate(d => addDays(d, 1))
            }}
          />

          <FolderViewsBody
            loadingHistorical={loadingHistorical}
            folderViews={folderViews}
            isToday={isToday}
            selectedDate={selectedDate}
            tz={tz}
            isEmpty={isEmpty}
            onUntrack={viewsCtx.untrackView}
            onConnectionAssigned={viewsCtx.replaceView}
          />
        </div>
      </div>
    </div>
  )
}

// ── Page sub-components ────────────────────────────────────────────────────

function FolderHeader({
  folder,
  onNewFolder,
  onAddView,
}: {
  folder: { name: string; parentId: string | null }
  onNewFolder: () => void
  onAddView: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <Link
          href={folder.parentId ? `/hub/folder/${folder.parentId}` : '/hub/home'}
          className="flex items-center justify-center w-7 h-7 rounded-full border border-stroke bg-white shadow-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <CaretLeft size={12} weight="bold" />
        </Link>
        <h1 className="text-base font-semibold">{folder.name}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewFolder}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          New folder
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddView}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Add view
        </Button>
      </div>
    </div>
  )
}

function FolderViewsHeader({
  selectedDate,
  isToday,
  onPrevDay,
  onNextDay,
}: {
  selectedDate: Date
  isToday: boolean
  onPrevDay: () => void
  onNextDay: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Views
      </h2>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrevDay}
          aria-label="Previous day"
          className="text-muted-foreground hover:text-foreground"
        >
          <CaretLeft size={14} weight="bold" />
        </Button>
        <span className="text-sm font-medium min-w-[110px] text-center tabular-nums">
          {formatDateLabel(selectedDate)}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNextDay}
          disabled={isToday}
          aria-label="Next day"
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <CaretRight size={14} weight="bold" />
        </Button>
      </div>
    </div>
  )
}

function FolderViewsBody({
  loadingHistorical,
  folderViews,
  isToday,
  selectedDate,
  tz,
  isEmpty,
  onUntrack,
  onConnectionAssigned,
}: {
  loadingHistorical: boolean
  folderViews: View[]
  isToday: boolean
  selectedDate: Date
  /** Forwarded to `ViewCardRouter` → per-view data hooks. Read once at
   *  the page level from `state.ui.globalTimeZone`; we don't read Redux
   *  inside `ViewCardRouter` to keep the routing tree provider-free. */
  tz: string | null
  isEmpty: boolean
  onUntrack: (id: string) => void
  onConnectionAssigned: (updated: View) => void
}) {
  if (loadingHistorical) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }
  if (folderViews.length === 0) {
    if (!isEmpty) return null
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground text-sm">
          {isToday
            ? 'This folder is empty. Add sub-folders or create a view.'
            : 'No data recorded for this date.'}
        </p>
      </div>
    )
  }

  const chartView = folderViews.find(v => v.type === 'project_overview')
  const sourcesView = folderViews.find(v => v.type === 'project_overview_sources')
  const widePosthogViews = folderViews.filter(isWidePosthogView)
  const regularViews = folderViews.filter(
    v =>
      v.type !== 'project_overview' &&
      v.type !== 'project_overview_sources' &&
      !isWidePosthogView(v),
  )

  const renderRouter = (view: View) => (
    <ViewCardRouter
      key={view.id}
      view={view}
      historical={!isToday}
      selectedDate={selectedDate}
      tz={tz}
      onUntrack={onUntrack}
      onConnectionAssigned={onConnectionAssigned}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      {(chartView || sourcesView) && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(280px,360px)] gap-4">
          {chartView && renderRouter(chartView)}
          {sourcesView && renderRouter(sourcesView)}
        </div>
      )}
      {widePosthogViews.length > 0 && (
        <div className="flex flex-col gap-4">{widePosthogViews.map(renderRouter)}</div>
      )}
      {regularViews.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-3 grid-flow-dense"
          style={{ gridAutoRows: '140px' }}
        >
          {regularViews.map(renderRouter)}
        </div>
      )}
    </div>
  )
}
