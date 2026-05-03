'use client'

/**
 * Project page: header (project name, create-view button, collapse) +
 * folder breadcrumb + a body that renders the project's pinned and
 * untracked views.
 *
 * Per-view fetching lives in `app/hub/(components)/view/data/` —
 * each view-type has its own hook there. The wide PostHog cards
 * (funnel/retention/users) come from
 * `app/hub/(components)/view/renderers/WidePosthogViewRenderer.tsx`.
 *
 * What stays in this file:
 *   - The project-level state hook (`useProjectView`) — folder
 *     navigation, optimistic untrack/pin, ProjectBody data.
 *   - The dispatch component (`ViewCardRenderer`) that picks the right
 *     card for a given view-type.
 *   - The body component that lays out folders + composite lane +
 *     wide-PostHog lane + the regular tile grid.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { CaretLeft, CaretDown, ArrowsClockwise, Cube, Plus } from '@phosphor-icons/react'
import { ProjectViewBreadCrumbs } from './ProjectViewBreadCrumbs'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import { ViewCardCustomerList } from '@/app/hub/(components)/view/ViewCardCustomerList'
import { ViewCardOverviewChart } from '@/app/hub/(components)/view/ViewCardOverviewChart'
import { ViewCardOverviewSources } from '@/app/hub/(components)/view/ViewCardOverviewSources'
import {
  WidePosthogViewRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/view/renderers/WidePosthogViewRenderer'
import {
  isStripeChartView,
  useCalendlyMeetings,
  useStripeChart,
  useStripeTopCustomers,
  useViewLiveValue,
} from '@/app/hub/(components)/view/data'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { useStripeSyncOnMount } from '@/lib/hooks/useStripeSyncOnMount'
import { useDashboard } from '@/contexts/DashboardContext'
import { formatIsoDateRange, periodBoundariesInTz, todayInTz } from '@/utils/dateHelpers'
import type { RootState } from '@/store'
import type { Project } from '@/types/project'
import type { Folder } from '@/types/folder'
import type { View } from '@/types/view'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { Button } from '@/components/ui/button'

// ── View-type dispatch helpers ─────────────────────────────────────────────

function isCalendlyMeetingsListView(view: View): boolean {
  return view.connectionType === 'calendly' && view.type === 'calendly_meetings_list'
}

function isStripeTopCustomersView(view: View): boolean {
  return (
    (view.connectionType === 'stripe_manual' || view.connectionType === 'stripe') &&
    view.type === 'stripe_top_customers'
  )
}

function isListView(view: View): boolean {
  // Calendly meetings + Stripe top customers both go through the wide list
  // lane — each has its own card component (different row shape) but they
  // share this dispatch helper so `ViewCardRenderer` only branches once.
  return isCalendlyMeetingsListView(view) || isStripeTopCustomersView(view)
}

// ── Project-level state hook ───────────────────────────────────────────────

function useProjectView(project: Project) {
  const { folders: foldersCtx, views: viewsCtx, pins: pinsCtx } = useDashboard()
  const globalDateMode = useSelector((s: RootState) => s.ui.globalDateMode)
  const globalDateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const globalDateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [views, setViews] = useState<View[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  // isRange = selected period is not the current period in the current mode.
  // Used for gating behaviours that only apply to historical data.
  //
  // Defer `today()` until after hydration. The redux store carries
  // server-computed dates across hydration; computing `today()` on the server
  // vs the client can flip `isRange` and cause a React 19 hydration mismatch
  // (and we'd kick off the wrong fetches on first render). Pre-mount we treat
  // the period as "current" (isRange=false), which matches the most common
  // case and never triggers historical-only branches inadvertently.
  //
  // tz-aware: "current period" uses the user's wall-clock day, not UTC.
  // While tz is null (settings still loading) we fall back to UTC so the
  // computation has *some* answer; once it lands, the boundaries re-compute.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const effectiveTz = tz ?? 'UTC'
  const currentBoundaries = mounted
    ? periodBoundariesInTz(globalDateMode, todayInTz(effectiveTz), effectiveTz)
    : null
  const isRange = currentBoundaries
    ? globalDateFrom !== currentBoundaries.from || globalDateTo !== currentBoundaries.to
    : false

  const currentFolder = currentFolderId
    ? (foldersCtx.folders.find(f => f.id === currentFolderId) ?? null)
    : null

  const subFolders = currentFolderId
    ? foldersCtx.folders.filter(f => f.parentId === currentFolderId)
    : foldersCtx.folders.filter(f => f.projectId === project.id && f.parentId === null)

  const loadViews = useCallback(async () => {
    setLoading(true)
    const data = currentFolderId
      ? await viewsCtx.fetchViewsByFolder(currentFolderId, globalDateFrom, globalDateTo)
      : await viewsCtx.fetchViewsByProject(project.id, globalDateFrom, globalDateTo)
    setViews(data)
    setLoading(false)
  }, [project.id, currentFolderId, globalDateFrom, globalDateTo, viewsCtx.refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadViews()
  }, [loadViews])

  // Live-on-mount: as soon as views land, fire a quick "did anything happen
  // since last sync" hit per Stripe connection so the tiles re-render
  // against fresh data within ~2s of opening the project. Backend throttle
  // (60s) + in-memory inflight Map mean repeat opens are cheap.
  useStripeSyncOnMount(views)

  const handleUntrack = async (viewId: string) => {
    setViews(prev => prev.filter(v => v.id !== viewId))
    await viewsCtx.untrackView(viewId)
  }

  // Swap a view's `connectionId` in place after the user attaches a fresh
  // connection through the reassignment dialog. The data hooks depend on
  // `view.connectionId`, so this triggers a refetch automatically.
  const handleConnectionAssigned = (updated: View) => {
    setViews(prev => prev.map(v => (v.id === updated.id ? updated : v)))
  }

  const handlePin = async (viewId: string) => {
    const view = views.find(v => v.id === viewId)
    if (!view) return
    // Optimistic toggle
    setViews(prev => prev.map(v => v.id === viewId ? { ...v, isPinned: !v.isPinned } : v))
    if (view.isPinned) {
      await pinsCtx.unpinView(viewId)
    } else {
      await pinsCtx.pinView(viewId)
    }
  }

  const handleFolderClick = (folder: Folder) => {
    setLoading(true)
    setCurrentFolderId(folder.id)
    setViews([])
  }

  const handleBack = () => {
    setLoading(true)
    setCurrentFolderId(null)
    setViews([])
  }

  const openCreateViewModal = () => viewsCtx.openModal(currentFolderId, project.id)

  const isEmpty = !loading && subFolders.length === 0 && views.length === 0

  return {
    views,
    loading,
    collapsed,
    setCollapsed,
    currentFolder,
    subFolders,
    isRange,
    dateFrom: globalDateFrom,
    dateTo: globalDateTo,
    mode: globalDateMode,
    // `tz` is exposed by the hook (rather than read directly inside
    // `ViewCardRenderer`) so the renderer stays a pure prop-drilling
    // component — no `useSelector` inside the rendering tree.
    tz,
    isEmpty,
    handleUntrack,
    handlePin,
    handleConnectionAssigned,
    handleFolderClick,
    handleBack,
    openCreateViewModal,
    foldersCtx,
  }
}

// ── View card renderer ─────────────────────────────────────────────────────

/**
 * View types that get a date-range caption rendered below their value.
 * Currently just MRR — the caption answers "for which period was this
 * computed?", which is more meaningful for snapshot-style metrics than
 * for "today" tiles (e.g. `stripe_revenue_today` already says "today"
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
}

function ViewCardRenderer({
  view,
  isRange,
  dateFrom,
  dateTo,
  mode,
  tz,
  onUntrack,
  onPin,
  onConnectionAssigned,
}: ViewCardRendererProps) {
  const live = useViewLiveValue(view, { dateFrom, dateTo, tz })
  const chart = useStripeChart(view, { dateFrom, dateTo, mode, tz })
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
  }

  if (isStripeChartView(view)) {
    return (
      <ViewCardChart
        {...sharedCardProps}
        points={chart.points}
        loading={chart.loading}
        error={chart.error}
        total={chart.total}
        onRefresh={chart.refresh}
        refreshing={chart.loading}
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
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface ProjectViewProps {
  project: Project
}

export function ProjectView({ project }: ProjectViewProps) {
  const {
    views,
    loading,
    collapsed,
    setCollapsed,
    currentFolder,
    subFolders,
    isRange,
    dateFrom,
    dateTo,
    mode,
    tz,
    isEmpty,
    handleUntrack,
    handlePin,
    handleConnectionAssigned,
    handleFolderClick,
    handleBack,
    openCreateViewModal,
    foldersCtx,
  } = useProjectView(project)

  return (
    <div className="relative flex flex-col">
      <SectionHeader
        icon={
          <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
            <Cube size={14} weight="bold" className="text-grey-darkest" />
          </span>
        }
        title={<ProjectViewBreadCrumbs project={project} folder={currentFolder} />}
        rightSlot={
          <div className="flex items-center gap-2">
            <Button
              onClick={openCreateViewModal}
              className="rounded-full gap-1.5 px-4 bg-brand hover:bg-brand/90 text-white"
            >
              <Plus size={14} weight="bold" />
              Create view
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setCollapsed(c => !c)}
              className="rounded-full shadow-sm"
            >
              <CaretDown
                size={13}
                weight="bold"
                className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
              />
            </Button>
          </div>
        }
        // Flush against the bottom of the global top bar (which has its own
        // `border-b` acting as the divider between the two sticky rows).
        // Matches PinnedViews' sticky header for consistent stacking.
        className="sticky top-[74px] left-0 z-[10]"
      />
      {!collapsed && (
        <ProjectBody
          projectId={project.id}
          currentFolder={currentFolder}
          handleBack={handleBack}
          subFolders={subFolders}
          foldersCtx={foldersCtx}
          loading={loading}
          handleFolderClick={handleFolderClick}
          views={views}
          isRange={isRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          tz={tz}
          handleUntrack={handleUntrack}
          handlePin={handlePin}
          handleConnectionAssigned={handleConnectionAssigned}
          isEmpty={isEmpty}
        />
      )}
    </div>
  )
}

// ── Project body ───────────────────────────────────────────────────────────

interface ProjectBodyProps {
  projectId: string
  currentFolder: Folder | null
  handleBack: () => void
  subFolders: Folder[]
  foldersCtx: {
    folders: Folder[]
    deleteFolder: (id: string) => void
    openModal: (parentId: string | null, projectId: string) => void
  }
  loading: boolean
  handleFolderClick: (folder: Folder) => void
  views: View[]
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  tz: string | null
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
  handleConnectionAssigned: (updated: View) => void
  isEmpty: boolean
}

function ProjectBody({
  projectId,
  currentFolder,
  handleBack,
  subFolders,
  foldersCtx,
  loading,
  handleFolderClick,
  views,
  isRange,
  dateFrom,
  dateTo,
  mode,
  tz,
  handleUntrack,
  handlePin,
  handleConnectionAssigned,
  isEmpty,
}: ProjectBodyProps) {
  return (
    <div className="p-5 pb-16 min-h-[420px]">
      {currentFolder && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="-ml-2 mb-4 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <CaretLeft size={11} weight="bold" />
          Back
        </Button>
      )}

      <div className="mb-5">
        <FolderGrid
          folders={subFolders}
          onDeleteFolder={foldersCtx.deleteFolder}
          onCreateSubfolder={foldersCtx.openModal}
          onCreateFolder={() => foldersCtx.openModal(currentFolder?.id ?? null, projectId)}
          onFolderClick={id => {
            const f = foldersCtx.folders.find(fl => fl.id === id)
            if (f) handleFolderClick(f)
          }}
        />
      </div>

      {loading ? (
        <ProjectBodyLoadingState />
      ) : views.length > 0 ? (
        <ProjectBodyViews
          views={views}
          isRange={isRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          tz={tz}
          handleUntrack={handleUntrack}
          handlePin={handlePin}
          handleConnectionAssigned={handleConnectionAssigned}
        />
      ) : isEmpty ? (
        <ProjectBodyEmptyState isRange={isRange} />
      ) : null}
    </div>
  )
}

function ProjectBodyLoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
    </div>
  )
}

function ProjectBodyEmptyState({ isRange }: { isRange: boolean }) {
  return (
    <p className="text-xs text-muted-foreground py-10">
      {isRange
        ? 'No data recorded for this date range.'
        : 'No views yet. Use the + button to add one.'}
    </p>
  )
}

interface ProjectBodyViewsProps {
  views: View[]
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  /** Forwarded to `ViewCardRenderer` → per-view data hooks. Read once
   *  in `useProjectView` from `state.ui.globalTimeZone`. */
  tz: string | null
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
  handleConnectionAssigned: (updated: View) => void
}

function ProjectBodyViews({
  views,
  isRange,
  dateFrom,
  dateTo,
  mode,
  tz,
  handleUntrack,
  handlePin,
  handleConnectionAssigned,
}: ProjectBodyViewsProps) {
  const chartView = views.find(v => v.type === 'project_overview')
  const sourcesView = views.find(v => v.type === 'project_overview_sources')
  // Wide PostHog views (funnel/retention/users) ride alongside the
  // overview composite lane — full-width, stacked vertically.
  const widePosthogViews = views.filter(isWidePosthogView)
  const regularViews = views.filter(
    v =>
      v.type !== 'project_overview' &&
      v.type !== 'project_overview_sources' &&
      !isWidePosthogView(v),
  )
  return (
    <div className="flex flex-col gap-6">
      {(chartView || sourcesView) && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(280px,360px)] gap-4">
          {chartView && (
            <ViewCardOverviewChart
              key={chartView.id}
              view={chartView}
              dateFrom={dateFrom}
              dateTo={dateTo}
              mode={mode}
              onUntrack={handleUntrack}
              onPin={handlePin}
            />
          )}
          {sourcesView && (
            <ViewCardOverviewSources
              key={sourcesView.id}
              view={sourcesView}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onUntrack={handleUntrack}
              onPin={handlePin}
            />
          )}
        </div>
      )}
      {widePosthogViews.length > 0 && (
        <div className="flex flex-col gap-4">
          {widePosthogViews.map(v => (
            <WidePosthogViewRenderer
              key={v.id}
              view={v}
              historical={isRange}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onUntrack={handleUntrack}
              onPin={handlePin}
              onConnectionAssigned={handleConnectionAssigned}
            />
          ))}
        </div>
      )}
      {regularViews.length > 0 && (
        <div
          className="grid gap-y-6 gap-x-4 grid-flow-dense grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6"
          style={{ gridAutoRows: '140px' }}
        >
          {regularViews.map(view => (
            <ViewCardRenderer
              key={view.id}
              view={view}
              isRange={isRange}
              dateFrom={dateFrom}
              dateTo={dateTo}
              mode={mode}
              tz={tz}
              onUntrack={handleUntrack}
              onPin={handlePin}
              onConnectionAssigned={handleConnectionAssigned}
            />
          ))}
        </div>
      )}
    </div>
  )
}
