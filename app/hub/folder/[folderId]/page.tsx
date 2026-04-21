'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { ALGORITHM, type CalendlyMeeting } from '@/lib/api'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart, type ChartPoint } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import type { View } from '@/types/view'
import { toDateStr, isSameDay, addDays, formatDateLabel } from '@/utils/dateHelpers'

const CHART_VIEW_TYPES = new Set(['stripe_gross_today', 'stripe_gross_week'])
const LIST_VIEW_TYPES = new Set(['calendly_meetings_list'])
const STRIPE_MANUAL_LIVE_TYPES = ['stripe_revenue_today']
const CALENDLY_LIVE_TYPES = ['calendly_meetings_today']
const GA_LIVE_TYPES = ['ga_active_users', 'ga_users_today', 'ga_sessions_today', 'ga_pageviews_today']

function isChartView(view: View) {
  return view.connectionType === 'stripe_manual' && CHART_VIEW_TYPES.has(view.type)
}
function isListView(view: View) {
  return view.connectionType === 'calendly' && LIST_VIEW_TYPES.has(view.type)
}


function useLiveValue(view: View, historical: boolean) {
  const isStripeManualLive =
    !historical &&
    view.connectionType === 'stripe_manual' &&
    STRIPE_MANUAL_LIVE_TYPES.includes(view.type)
  const isCalendlyLive =
    !historical && view.connectionType === 'calendly' && CALENDLY_LIVE_TYPES.includes(view.type)
  const isGALive =
    !historical && view.connectionType === 'google_analytics' && GA_LIVE_TYPES.includes(view.type)
  const isLive = isStripeManualLive || isCalendlyLive || isGALive

  const [liveValue, setLiveValue] = useState<string | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!isLive || !view.connectionId) return
    setLiveLoading(true)
    setLiveError(null)
    let req: Promise<{ value: string }>
    if (isStripeManualLive) req = ALGORITHM.getStripeManualLiveValue(view.connectionId, view.type)
    else if (isCalendlyLive) req = ALGORITHM.getCalendlyLiveValue(view.connectionId, view.type)
    else req = ALGORITHM.getGoogleAnalyticsLiveValue(view.connectionId, view.type)
    req
      .then(res => setLiveValue(res.value))
      .catch(err => setLiveError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setLiveLoading(false))
  }, [view.connectionId, view.type, isLive, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    if (isLive && view.connectionId) setRefreshTick(t => t + 1)
  }, [isLive, view.connectionId])

  return { liveValue: isLive ? liveValue : null, liveLoading, liveError, refresh: isLive ? refresh : undefined }
}

function useChartData(view: View, historical: boolean) {
  const isChart = isChartView(view)
  const [points, setPoints] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(isChart && !historical)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(
    historical && view.value != null ? parseInt(view.value, 10) : null,
  )
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!isChart) return
    if (historical) {
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
      .then(([chartRes, liveRes]) => {
        setPoints(chartRes.points)
        setTotal(parseInt(liveRes.value, 10))
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [view.connectionId, view.type, historical, view.value, isChart, refreshTick])

  const refresh = useCallback(() => {
    if (isChart && !historical && view.connectionId) setRefreshTick(t => t + 1)
  }, [isChart, historical, view.connectionId])

  return { points, loading, error, total, refresh: isChart && !historical ? refresh : undefined }
}

function useCalendlyMeetings(view: View, historical: boolean) {
  const [meetings, setMeetings] = useState<CalendlyMeeting[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (view.type !== 'calendly_meetings_list' || historical || !view.connectionId) return
    setLoading(true)
    setError(null)
    ALGORITHM.getCalendlyMeetingsList(view.connectionId)
      .then(res => setMeetings(res.meetings))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setLoading(false))
  }, [view.connectionId, view.type, historical, refreshTick])

  const refresh = useCallback(() => {
    if (!historical && view.connectionId) setRefreshTick(t => t + 1)
  }, [historical, view.connectionId])

  return { meetings, loading, error, refresh: !historical ? refresh : undefined }
}

function ViewCardRouter({
  view,
  historical,
  onUntrack,
}: {
  view: View
  historical: boolean
  onUntrack: (id: string) => void
}) {
  const { liveValue, liveLoading, liveError, refresh: liveRefresh } = useLiveValue(view, historical)
  const { points, loading: chartLoading, error: chartError, total, refresh: chartRefresh } = useChartData(view, historical)
  const { meetings, loading: listLoading, error: listError, refresh: listRefresh } = useCalendlyMeetings(view, historical)

  if (isChartView(view))
    return (
      <ViewCardChart
        view={view} onUntrack={onUntrack} historical={historical}
        points={points} loading={chartLoading} error={chartError} total={total}
        onRefresh={chartRefresh} refreshing={chartLoading}
      />
    )
  if (isListView(view))
    return (
      <ViewCardList
        view={view} onUntrack={onUntrack} historical={historical}
        meetings={meetings} loading={listLoading} error={listError}
        onRefresh={listRefresh} refreshing={listLoading}
      />
    )
  return (
    <ViewCard
      view={view} onUntrack={onUntrack}
      liveValue={liveValue} liveLoading={liveLoading} liveError={liveError}
      onRefresh={liveRefresh} refreshing={liveLoading}
    />
  )
}

export default function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = use(params)
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

  if (!folder)
    return (
      <div className="p-8">
        <p className="text-muted-foreground text-sm">Folder not found</p>
      </div>
    )

  const isEmpty = subFolders.length === 0 && folderViews.length === 0 && !loadingHistorical

  return (
    <div className="p-8 max-w-6xl mx-auto">
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
          <button
            onClick={() => foldersCtx.openModal(folderId, folder.projectId)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            New folder
          </button>
          <button
            onClick={() => viewsCtx.openModal(folderId, folder.projectId)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Add view
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {subFolders.length > 0 && (
          <FolderGrid
            folders={subFolders}
            onDeleteFolder={foldersCtx.deleteFolder}
            onCreateSubfolder={foldersCtx.openModal}
          />
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Views
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDate(d => addDays(d, -1))}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <span className="text-sm font-medium min-w-[110px] text-center tabular-nums">
                {formatDateLabel(selectedDate)}
              </span>
              <button
                onClick={() => {
                  if (!isToday) setSelectedDate(d => addDays(d, 1))
                }}
                disabled={isToday}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
          </div>

          {loadingHistorical ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : folderViews.length > 0 ? (
            <div
              className="grid grid-cols-1 md:grid-cols-4 gap-3 grid-flow-dense"
              style={{ gridAutoRows: '140px' }}
            >
              {folderViews.map(view => (
                <ViewCardRouter
                  key={view.id}
                  view={view}
                  historical={!isToday}
                  onUntrack={viewsCtx.untrackView}
                />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-muted-foreground text-sm">
                {isToday
                  ? 'This folder is empty. Add sub-folders or create a view.'
                  : 'No data recorded for this date.'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
