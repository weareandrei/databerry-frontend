'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { CaretLeft, ArrowsClockwise, Cube } from '@phosphor-icons/react'
import { DashboardSectionWrapper } from '../shared/DashboardSectionWrapper'
import { ProjectViewBreadCrumbs } from './ProjectViewBreadCrumbs'
import { ProjectDateRangePicker } from './ProjectDateRangePicker'
import { ProjectPlusButton } from './ProjectPlusButton'
import { ViewCard } from '../view/ViewCard'
import { ViewCardChart, type ChartPoint } from '../view/ViewCardChart'
import { ViewCardList } from '../view/ViewCardList'
import { FolderGrid } from '../folder/FolderGrid'
import { useDashboard } from '@/contexts/DashboardContext'
import { ALGORITHM, type CalendlyMeeting } from '@/lib/api'
import { toDateStr, parseISODate } from '@/utils/dateHelpers'
import type { RootState } from '@/store'
import type { Project } from '@/types/project'
import type { Folder } from '@/types/folder'
import type { View } from '@/types/view'

// ── View type helpers ──────────────────────────────────────────────────────
const CHART_VIEW_TYPES = new Set(['stripe_gross_today', 'stripe_gross_week'])
const LIST_VIEW_TYPES  = new Set(['calendly_meetings_list'])
const STRIPE_MANUAL_LIVE_TYPES = ['stripe_revenue_today']
const CALENDLY_LIVE_TYPES      = ['calendly_meetings_today']

function isChartView(view: View) {
  return view.connectionType === 'stripe_manual' && CHART_VIEW_TYPES.has(view.type)
}
function isListView(view: View) {
  return view.connectionType === 'calendly' && LIST_VIEW_TYPES.has(view.type)
}

// ── Per-view data hooks ────────────────────────────────────────────────────
function useLiveValue(view: View, isRange: boolean) {
  const isStripeManualLive =
    !isRange && view.connectionType === 'stripe_manual' && STRIPE_MANUAL_LIVE_TYPES.includes(view.type)
  const isCalendlyLive =
    !isRange && view.connectionType === 'calendly' && CALENDLY_LIVE_TYPES.includes(view.type)
  const isLive = isStripeManualLive || isCalendlyLive

  const [liveValue, setLiveValue] = useState<string | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLive || !view.connectionId) return
    setLiveLoading(true)
    setLiveError(null)
    const fetch = isStripeManualLive
      ? ALGORITHM.getStripeManualLiveValue(view.connectionId, view.type)
      : ALGORITHM.getCalendlyLiveValue(view.connectionId, view.type)
    fetch
      .then(res => setLiveValue(res.value))
      .catch(err => setLiveError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setLiveLoading(false))
  }, [view.connectionId, view.type, isLive]) // eslint-disable-line react-hooks/exhaustive-deps

  return { liveValue: isLive ? liveValue : null, liveLoading, liveError }
}

function useChartData(view: View, isRange: boolean) {
  const [points, setPoints] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(!isRange)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(
    isRange && view.value != null ? parseInt(view.value, 10) : null,
  )

  useEffect(() => {
    if (isRange) {
      setLoading(false)
      setTotal(view.value != null ? parseInt(view.value, 10) : null)
      setPoints([])
      return
    }
    if (!view.connectionId) return
    setLoading(true)
    setError(null)
    Promise.all([
      ALGORITHM.getStripeManualChartData(view.connectionId, view.type),
      ALGORITHM.getStripeManualLiveValue(view.connectionId, view.type),
    ])
      .then(([chartRes, liveRes]) => { setPoints(chartRes.points); setTotal(parseInt(liveRes.value, 10)) })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [view.connectionId, view.type, isRange, view.value])

  return { points, loading, error, total }
}

function useCalendlyMeetings(view: View, isRange: boolean) {
  const [meetings, setMeetings] = useState<CalendlyMeeting[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isRange || !view.connectionId) return
    setLoading(true)
    setError(null)
    ALGORITHM.getCalendlyMeetingsList(view.connectionId)
      .then(res => setMeetings(res.meetings))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setLoading(false))
  }, [view.connectionId, isRange])

  return { meetings, loading, error }
}

function ViewCardRouter({
  view, isRange, onUntrack,
}: { view: View; isRange: boolean; onUntrack: (id: string) => void }) {
  const liveData  = useLiveValue(view, isRange)
  const chartData = useChartData(view, isRange)
  const listData  = useCalendlyMeetings(view, isRange)

  if (isChartView(view))
    return <ViewCardChart view={view} onUntrack={onUntrack} historical={isRange} {...chartData} />
  if (isListView(view))
    return <ViewCardList view={view} onUntrack={onUntrack} historical={isRange} {...listData} />
  return <ViewCard view={view} onUntrack={onUntrack} {...liveData} />
}

// ── Main component ─────────────────────────────────────────────────────────
interface ProjectViewProps {
  project: Project
  totalProjects?: number
}

function todayDate(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function ProjectView({ project, totalProjects = 1 }: ProjectViewProps) {
  const { folders: foldersCtx, views: viewsCtx } = useDashboard()
  const globalDateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const globalDateTo   = useSelector((s: RootState) => s.ui.globalDateTo)

  // Per-panel navigation state — initialise from global range
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<Date>(() => parseISODate(globalDateFrom))
  const [endDate, setEndDate]     = useState<Date>(() => parseISODate(globalDateTo))
  const [views, setViews] = useState<View[]>([])
  const [loading, setLoading] = useState(true)

  // isRange = any time the range isn't "today–today" for live data purposes
  const actualToday = todayDate()
  const isRange = toDateStr(startDate) !== toDateStr(actualToday) || toDateStr(endDate) !== toDateStr(actualToday)

  // When global range changes → overwrite local dates exactly (all panels sync)
  useEffect(() => {
    setStartDate(parseISODate(globalDateFrom))
    setEndDate(parseISODate(globalDateTo))
  }, [globalDateFrom, globalDateTo])

  const currentFolder = currentFolderId
    ? (foldersCtx.folders.find(f => f.id === currentFolderId) ?? null)
    : null

  const subFolders = currentFolderId
    ? foldersCtx.folders.filter(f => f.parentId === currentFolderId)
    : foldersCtx.folders.filter(f => f.projectId === project.id && f.parentId === null)

  // Load views whenever context or date range changes
  const loadViews = useCallback(async () => {
    setLoading(true)
    try {
      const from = toDateStr(startDate)
      const to   = toDateStr(endDate)
      const data = currentFolderId
        ? await ALGORITHM.getViewsByFolder(currentFolderId, from, to)
        : await ALGORITHM.getViewsByProject(project.id, from, to)
      setViews(data)
    } catch {
      setViews([])
    } finally {
      setLoading(false)
    }
  }, [project.id, currentFolderId, startDate, endDate])

  useEffect(() => { loadViews() }, [loadViews])

  const handleUntrack = async (viewId: string) => {
    setViews(prev => prev.filter(v => v.id !== viewId))
    await viewsCtx.untrackView(viewId)
  }

  const handleFolderClick = (folder: Folder) => {
    setCurrentFolderId(folder.id)
    setViews([])
  }

  const handleBack = () => {
    setCurrentFolderId(null)
    setViews([])
  }

  const handleRangeChange = (start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
  }

  const isEmpty = !loading && subFolders.length === 0 && views.length === 0

  return (
    <DashboardSectionWrapper
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
        <ProjectDateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={handleRangeChange}
        />
      }
      className="min-h-[420px] max-h-[calc(100svh-190px)]"
      overlay={
        <ProjectPlusButton
          onCreateFolder={() => foldersCtx.openModal(currentFolderId, project.id)}
          onAddView={() => viewsCtx.openModal(currentFolderId, project.id)}
        />
      }
    >
      <div className="p-5 pb-16">
        {/* Back button */}
        {currentFolder && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 mb-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <CaretLeft size={11} weight="bold" />
            Back
          </button>
        )}

        {/* Sub-folders row */}
        {subFolders.length > 0 && (
          <div className="mb-5">
            <FolderGrid
              folders={subFolders}
              onDeleteFolder={foldersCtx.deleteFolder}
              onCreateSubfolder={foldersCtx.openModal}
              onFolderClick={(id) => {
                const f = foldersCtx.folders.find(fl => fl.id === id)
                if (f) handleFolderClick(f)
              }}
              cols={2}
            />
          </div>
        )}

        {/* Views grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
          </div>
        ) : views.length > 0 ? (
          <div
            className={`grid gap-y-6 gap-x-4 grid-flow-dense ${totalProjects === 1 ? 'grid-cols-4' : 'grid-cols-2'}`}
            style={{ gridAutoRows: '140px' }}
          >
            {views.map(view => (
              <ViewCardRouter
                key={view.id}
                view={view}
                isRange={isRange}
                onUntrack={handleUntrack}
              />
            ))}
          </div>
        ) : isEmpty ? (
          <p className="text-xs text-muted-foreground py-10">
            {isRange
              ? 'No data recorded for this date range.'
              : 'No views yet. Use the + button to add one.'}
          </p>
        ) : null}
      </div>
    </DashboardSectionWrapper>
  )
}
