'use client'

/**
 * Shared body for the project's FILTERED views sub-pages:
 *
 *   /views/charts            — chart-type views
 *   /views/funnels           — funnel views
 *   /tools/[connectionId]    — views fed by one connection
 *
 * All three are the same surface: fetch the project's views for the
 * global date range, keep the ones matching `filter`, render them in
 * the standard lane layout — AUTO-POSITIONED (`sortable=false`; only
 * the Overview page offers drag-to-reorder) and with NO folders row
 * (folders exist only on Overview, per the layout spec).
 *
 * Untrack / pin / connection-reassign reuse the same optimistic
 * patterns as `useProjectView`, just without the folder navigation.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { ProjectBodyViews } from '@/app/hub/(components)/project/ProjectBodyViews'
import { BodySkeleton } from '@/app/hub/(components)/BodySkeleton'
import { HubTopBar } from '@/app/hub/(components)/HubTopBar'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { useStripeSyncOnMount } from '@/lib/hooks/useStripeSyncOnMount'
import type { RootState } from '@/store'
import type { Project } from '@/types/project'
import type { View } from '@/types/view'

interface ProjectFilteredViewsProps {
  project: Project
  /** Page heading shown above the grid ("Charts", "Funnels", tool name). */
  title: string
  /** Keep a view on this page? Applied AFTER the project fetch. */
  filter: (view: View) => boolean
  /** Copy for the no-matches state. */
  emptyText: string
}

export function ProjectFilteredViews({
  project,
  title,
  filter,
  emptyText,
}: ProjectFilteredViewsProps) {
  const router = useRouter()
  const { views: viewsCtx, pins: pinsCtx } = useDashboard()
  const dateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const dateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const [views, setViews] = useState<View[]>([])
  const [loading, setLoading] = useState(true)

  const projectRefreshKey = viewsCtx.getRefreshKeyForProject(project.id)

  // `filter` is typically an inline closure at the call site — keep
  // it out of the effect deps via a ref so a parent re-render doesn't
  // refetch; the filter is re-applied to fresh data on every fetch.
  const filterRef = useRef(filter)
  filterRef.current = filter

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    viewsCtx
      .fetchViewsByProject(project.id, dateFrom, dateTo)
      .then(data => {
        if (cancelled) return
        setViews(data.filter(v => filterRef.current(v)))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setViews([])
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, dateFrom, dateTo, projectRefreshKey])

  useStripeSyncOnMount(views)

  // Same stable-handler pattern as `useProjectView` — see the long
  // comment there for why refs instead of deps.
  const viewsCtxRef = useRef(viewsCtx)
  viewsCtxRef.current = viewsCtx
  const pinsCtxRef = useRef(pinsCtx)
  pinsCtxRef.current = pinsCtx
  const viewsRef = useRef(views)
  viewsRef.current = views

  const handleUntrack = useCallback(async (viewId: string) => {
    setViews(prev => prev.filter(v => v.id !== viewId))
    await viewsCtxRef.current.untrackView(viewId)
  }, [])

  const handlePin = useCallback(async (viewId: string) => {
    const view = viewsRef.current.find(v => v.id === viewId)
    if (!view) return
    setViews(prev =>
      prev.map(v => (v.id === viewId ? { ...v, isPinned: !v.isPinned } : v)),
    )
    if (view.isPinned) await pinsCtxRef.current.unpinView(viewId)
    else await pinsCtxRef.current.pinView(viewId)
  }, [])

  const handleConnectionAssigned = useCallback((updated: View) => {
    setViews(prev => prev.map(v => (v.id === updated.id ? updated : v)))
  }, [])

  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] md:h-screen">
      <MobileTopBar
        variant="project"
        projectName={`${project.name} — ${title}`}
        onBack={() => router.push('/hub/home')}
      />
      <HubTopBar />
      {/* White panel = the ONLY scroll container; the page column
          (top bar + panel) is exactly one viewport tall. */}
      <div className="flex-1 min-h-0 mx-4 mb-4 bg-white rounded-2xl border border-stroke shadow-card overflow-y-auto">
        {loading ? (
          <BodySkeleton />
        ) : (
          <div className="p-5 pb-6">
            <h2 className="px-1 mb-4 text-xs font-medium uppercase tracking-wider text-grey-light">
              {title}
            </h2>
            {views.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10">{emptyText}</p>
            ) : (
              <ProjectBodyViews
                views={views}
                isRange={false}
                dateFrom={dateFrom}
                dateTo={dateTo}
                mode={mode}
                tz={tz}
                handleUntrack={handleUntrack}
                handlePin={handlePin}
                handleConnectionAssigned={handleConnectionAssigned}
                handleReorder={() => {}}
                sortable={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
