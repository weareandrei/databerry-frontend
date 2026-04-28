'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { CaretLeft, CaretDown, ArrowsClockwise, Cube, Plus } from '@phosphor-icons/react'
import { ProjectViewBreadCrumbs } from './ProjectViewBreadCrumbs'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart, type ChartPoint } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import { ViewCardOverviewChart } from '@/app/hub/(components)/view/ViewCardOverviewChart'
import { ViewCardOverviewSources } from '@/app/hub/(components)/view/ViewCardOverviewSources'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { useDashboard } from '@/contexts/DashboardContext'
import { ALGORITHM, IntegrationReauthError, type CalendlyMeeting } from '@/lib/api'
import { periodBoundaries, today } from '@/utils/dateHelpers'
import type { RootState } from '@/store'
import type { Project } from '@/types/project'
import type { Folder } from '@/types/folder'
import type { View } from '@/types/view'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { Button } from '@/components/ui/button'

// ── View type helpers ──────────────────────────────────────────────────────

const CHART_VIEW_TYPES = new Set(['stripe_gross_today', 'stripe_gross_week', 'stripe_gross'])
const LIST_VIEW_TYPES = new Set(['calendly_meetings_list'])
const STRIPE_MANUAL_LIVE_TYPES = ['stripe_revenue_today']
const CALENDLY_LIVE_TYPES = ['calendly_meetings_today']
const GA_LIVE_TYPES = [
  'ga_active_users',
  'ga_users_today',
  'ga_sessions_today',
  'ga_pageviews_today',
]

function isChartView(view: View) {
  return view.connectionType === 'stripe_manual' && CHART_VIEW_TYPES.has(view.type)
}
function isListView(view: View) {
  return view.connectionType === 'calendly' && LIST_VIEW_TYPES.has(view.type)
}

// ── Per-view-card data hooks ───────────────────────────────────────────────

function fetchLiveValue(
  view: View,
  isStripeManualLive: boolean,
  isCalendlyLive: boolean,
  isPosthogLive: boolean,
  dateFrom: string,
  dateTo: string,
): Promise<{ value: string | null; unavailable?: boolean }> {
  if (isStripeManualLive) return ALGORITHM.getStripeManualLiveValue(view.connectionId!, view.type, dateFrom, dateTo)
  if (isCalendlyLive) return ALGORITHM.getCalendlyLiveValue(view.connectionId!, view.type, dateFrom, dateTo)
  if (isPosthogLive) return ALGORITHM.getPosthogLiveValue(view.connectionId!, view.id, dateFrom, dateTo)
  return ALGORITHM.getGoogleAnalyticsLiveValue(view.connectionId!, view.type, dateFrom, dateTo)
}

function useLiveValue(view: View, dateFrom: string, dateTo: string) {
  const isStripeManualLive =
    view.connectionType === 'stripe_manual' && STRIPE_MANUAL_LIVE_TYPES.includes(view.type)
  const isCalendlyLive =
    view.connectionType === 'calendly' && CALENDLY_LIVE_TYPES.includes(view.type)
  const isGALive =
    view.connectionType === 'google_analytics' && GA_LIVE_TYPES.includes(view.type)
  const isPosthogLive = view.connectionType === 'posthog'
  const isLive = isStripeManualLive || isCalendlyLive || isGALive || isPosthogLive

  const [liveValue, setLiveValue] = useState<string | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  // Typed-error preserved here (vs string-only) so ViewCard can route a
  // dead-refresh-token failure to the inline reconnect prompt.
  const [liveError, setLiveError] = useState<string | IntegrationReauthError | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!isLive || !view.connectionId) return
    setLiveLoading(true)
    setLiveError(null)
    fetchLiveValue(view, isStripeManualLive, isCalendlyLive, isPosthogLive, dateFrom, dateTo)
      .then(res => setLiveValue(res.unavailable ? null : res.value))
      .catch(err => {
        if (err instanceof IntegrationReauthError) setLiveError(err)
        else setLiveError(err instanceof Error ? err.message : 'Failed to fetch')
      })
      .finally(() => setLiveLoading(false))
  }, [view.connectionId, view.type, isLive, dateFrom, dateTo, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    if (isLive && view.connectionId) setRefreshTick(t => t + 1)
  }, [isLive, view.connectionId])

  return {
    liveValue: isLive ? liveValue : null,
    liveLoading,
    liveError,
    refresh: isLive ? refresh : undefined,
  }
}

function useChartData(
  view: View,
  dateFrom: string,
  dateTo: string,
  mode: 'daily' | 'weekly' | 'monthly',
) {
  const isChart = isChartView(view)
  const [points, setPoints] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(isChart)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!isChart) return
    if (!view.connectionId) return
    setLoading(true)
    setError(null)
    Promise.all([
      ALGORITHM.getStripeManualChartData(view.connectionId, view.type, dateFrom, dateTo, mode),
      ALGORITHM.getStripeManualLiveValue(view.connectionId, view.type, dateFrom, dateTo),
    ])
      .then(([chartRes, liveRes]) => {
        setPoints(chartRes.points)
        setTotal(liveRes.value != null && !liveRes.unavailable ? parseInt(liveRes.value, 10) : null)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [view.connectionId, view.type, dateFrom, dateTo, mode, isChart, refreshTick])

  const refresh = useCallback(() => {
    if (isChart && view.connectionId) setRefreshTick(t => t + 1)
  }, [isChart, view.connectionId])

  return { points, loading, error, total, refresh: isChart ? refresh : undefined }
}

function useCalendlyMeetings(view: View, dateFrom: string, dateTo: string) {
  const [meetings, setMeetings] = useState<CalendlyMeeting[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (view.type !== 'calendly_meetings_list' || !view.connectionId) return
    setLoading(true)
    setError(null)
    ALGORITHM.getCalendlyMeetingsList(view.connectionId, dateFrom, dateTo)
      .then(res => setMeetings(res.meetings))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setLoading(false))
  }, [view.connectionId, view.type, dateFrom, dateTo, refreshTick])

  const refresh = useCallback(() => {
    if (view.connectionId) setRefreshTick(t => t + 1)
  }, [view.connectionId])

  return { meetings, loading, error, refresh }
}

// ── Project-level state hook ───────────────────────────────────────────────

function useProjectView(project: Project) {
  const { folders: foldersCtx, views: viewsCtx, pins: pinsCtx } = useDashboard()
  const globalDateMode = useSelector((s: RootState) => s.ui.globalDateMode)
  const globalDateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const globalDateTo = useSelector((s: RootState) => s.ui.globalDateTo)

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
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const currentBoundaries = mounted ? periodBoundaries(globalDateMode, today()) : null
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

  const handleUntrack = async (viewId: string) => {
    setViews(prev => prev.filter(v => v.id !== viewId))
    await viewsCtx.untrackView(viewId)
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
    isEmpty,
    handleUntrack,
    handlePin,
    handleFolderClick,
    handleBack,
    openCreateViewModal,
    foldersCtx,
  }
}

// ── View card renderer ─────────────────────────────────────────────────────

function ViewCardRenderer({ view, isRange, dateFrom, dateTo, mode, onUntrack, onPin }: {
  view: View
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  onUntrack: (id: string) => void
  onPin: (viewId: string) => void
}) {
  const { liveValue, liveLoading, liveError, refresh: liveRefresh } = useLiveValue(view, dateFrom, dateTo)
  const { points, loading: chartLoading, error: chartError, total, refresh: chartRefresh } = useChartData(view, dateFrom, dateTo, mode)
  const { meetings, loading: listLoading, error: listError, refresh: listRefresh } = useCalendlyMeetings(view, dateFrom, dateTo)

  const handlePin = () => onPin(view.id)

  if (isChartView(view))
    return (
      <ViewCardChart
        view={view} onUntrack={onUntrack} historical={isRange}
        points={points} loading={chartLoading} error={chartError} total={total}
        onRefresh={chartRefresh} refreshing={chartLoading}
        onPin={handlePin} isPinned={view.isPinned}
      />
    )
  if (isListView(view))
    return (
      <ViewCardList
        view={view} onUntrack={onUntrack} historical={isRange}
        meetings={meetings} loading={listLoading} error={listError}
        onRefresh={listRefresh} refreshing={listLoading}
        onPin={handlePin} isPinned={view.isPinned}
      />
    )
  return (
    <ViewCard
      view={view} onUntrack={onUntrack}
      liveValue={liveValue} liveLoading={liveLoading} liveError={liveError}
      onRefresh={liveRefresh} refreshing={liveLoading}
      onPin={handlePin} isPinned={view.isPinned}
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
    isEmpty,
    handleUntrack,
    handlePin,
    handleFolderClick,
    handleBack,
    openCreateViewModal,
    foldersCtx,
  } = useProjectView(project)

  return (
    <div className="relative flex flex-col">
      <SectionHeader
        icon={
          <span
            className="flex items-center justify-center rounded-full bg-white border border-stroke p-2"
            style={{ boxShadow: '2px 2px 5px rgba(0,0,0,0.05)' }}
          >
            <Cube size={14} weight="bold" className="text-grey-darkest" />
          </span>
        }
        title={<ProjectViewBreadCrumbs project={project} folder={currentFolder} />}
        rightSlot={
          <div className="flex items-center gap-2">
            <Button onClick={openCreateViewModal} className="rounded-full gap-1.5 px-4 bg-brand hover:bg-brand/90 text-white">
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
          handleUntrack={handleUntrack}
          handlePin={handlePin}
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
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
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
  handleUntrack,
  handlePin,
  isEmpty,
}: ProjectBodyProps) {
  return (
    <div className="p-5 pb-16 min-h-[420px]">
      {currentFolder && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 mb-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CaretLeft size={11} weight="bold" />
          Back
        </button>
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
        <div className="flex items-center justify-center py-12">
          <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
        </div>
      ) : views.length > 0 ? (
        (() => {
          const chartView = views.find(v => v.type === 'project_overview')
          const sourcesView = views.find(v => v.type === 'project_overview_sources')
          const regularViews = views.filter(
            v => v.type !== 'project_overview' && v.type !== 'project_overview_sources',
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
                      onUntrack={handleUntrack}
                      onPin={handlePin}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })()
      ) : isEmpty ? (
        <p className="text-xs text-muted-foreground py-10">
          {isRange
            ? 'No data recorded for this date range.'
            : 'No views yet. Use the + button to add one.'}
        </p>
      ) : null}
    </div>
  )
}
