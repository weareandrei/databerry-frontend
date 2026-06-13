'use client'

/**
 * Project-level state hook — drives the desktop `<ProjectView>`
 * (the `[project]/overview` page body) and the mobile
 * `<MobileProjectBody>` with the same fetch path.
 *
 * Owns:
 *   - the views fetch for the current container (project root or a
 *     folder), re-run on date-range / refresh-key changes
 *   - in-place folder navigation (current folder + back)
 *   - date-range awareness (`isRange` — historical vs current period)
 *   - optimistic untrack / pin / connection-reassign handlers with
 *     stable identities (refs, see below)
 *   - drag-reorder persistence with snapshot rollback
 *   - the plan-gated create-view modal opener
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { EVENT, trackEvent } from '@/lib/posthog'
import { useStripeSyncOnMount } from '@/lib/hooks/useStripeSyncOnMount'
import { useDashboard } from '@/contexts/DashboardContext'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { periodBoundariesInTz, todayInTz } from '@/utils/dateHelpers'
import type { RootState } from '@/store'
import type { Project } from '@/types/project'
import type { Folder } from '@/types/folder'
import type { View } from '@/types/view'

export function useProjectView(project: Project) {
  const { folders: foldersCtx, views: viewsCtx, pins: pinsCtx } = useDashboard()
  const { enforceViewLimit } = usePlanLimits()
  const globalDateMode = useSelector((s: RootState) => s.ui.globalDateMode)
  const globalDateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const globalDateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [views, setViews] = useState<View[]>([])
  const [loading, setLoading] = useState(true)

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

  // Per-project refresh tick — bumps ONLY when this project's views
  // change (a view was added/created for THIS project). Adding a
  // view in a sibling project doesn't reach into this dep array.
  const projectRefreshKey = viewsCtx.getRefreshKeyForProject(project.id)

  // While the create-project optimistic UI is in flight, the project
  // carries a placeholder id like `temp-${uuid}` (see
  // `useProjects.createProject`). Firing `/views?projectId=temp-…`
  // against that id 400s on the backend → "Failed to load views"
  // toast on every freshly-created project, even though there's
  // nothing wrong: the real id arrives a moment later, the caller is
  // keyed on `project.id` so this hook re-mounts with the real id and
  // fetches successfully (empty array — a brand-new project has no
  // views). Short-circuit: no fetch, no toast, no loading flicker.
  const isTempProject = project.id.startsWith('temp-')

  const loadViews = useCallback(async () => {
    if (isTempProject) return
    setLoading(true)
    const data = currentFolderId
      ? await viewsCtx.fetchViewsByFolder(currentFolderId, globalDateFrom, globalDateTo)
      : await viewsCtx.fetchViewsByProject(project.id, globalDateFrom, globalDateTo)
    setViews(data)
    setLoading(false)
  }, [project.id, isTempProject, currentFolderId, globalDateFrom, globalDateTo, projectRefreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadViews()
  }, [loadViews])

  // Live-on-mount: as soon as views land, fire a quick "did anything happen
  // since last sync" hit per Stripe connection so the tiles re-render
  // against fresh data within ~2s of opening the project. Backend throttle
  // (60s) + in-memory inflight Map mean repeat opens are cheap.
  useStripeSyncOnMount(views)

  // ── Stable handler refs ──────────────────────────────────────────────────
  //
  // The handlers below are passed down into every tile. Without
  // `useCallback` they're recreated on every render, which defeats
  // `<ViewCardRenderer>`'s `React.memo` — every tile re-renders on
  // every drag tick. The closures need fresh `views` / contexts, but
  // putting those in the deps would also recreate the handlers each
  // render; instead they live in refs (updated every render) and the
  // stable handlers read `.current`.
  const viewsRef = useRef(views)
  viewsRef.current = views
  const viewsCtxRef = useRef(viewsCtx)
  viewsCtxRef.current = viewsCtx
  const pinsCtxRef = useRef(pinsCtx)
  pinsCtxRef.current = pinsCtx

  const handleUntrack = useCallback(async (viewId: string) => {
    setViews(prev => prev.filter(v => v.id !== viewId))
    await viewsCtxRef.current.untrackView(viewId)
  }, [])

  // Swap a view's `connectionId` in place after the user attaches a fresh
  // connection through the reassignment dialog. The data hooks depend on
  // `view.connectionId`, so this triggers a refetch automatically.
  const handleConnectionAssigned = useCallback((updated: View) => {
    setViews(prev => prev.map(v => (v.id === updated.id ? updated : v)))
  }, [])

  const handlePin = useCallback(async (viewId: string) => {
    const view = viewsRef.current.find(v => v.id === viewId)
    if (!view) return
    // Fire BEFORE the optimistic toggle so `action` reflects the
    // intent (the value flips immediately, and reading it from `view`
    // after the toggle would invert the label).
    trackEvent(EVENT.VIEW_PINNED, {
      viewId,
      viewType: view.type,
      action: view.isPinned ? 'unpin' : 'pin',
    })
    setViews(prev => prev.map(v => v.id === viewId ? { ...v, isPinned: !v.isPinned } : v))
    if (view.isPinned) {
      await pinsCtxRef.current.unpinView(viewId)
    } else {
      await pinsCtxRef.current.pinView(viewId)
    }
  }, [])

  const handleFolderClick = (folder: Folder) => {
    // Track BEFORE the navigation so the event sticks even if the
    // route change interrupts. `parentFolderId` distinguishes
    // top-of-project folder clicks from drill-down inside a folder.
    trackEvent(EVENT.FOLDER_OPENED, {
      folderId: folder.id,
      projectId: folder.projectId,
      parentFolderId: folder.parentId,
    })
    setLoading(true)
    setCurrentFolderId(folder.id)
    setViews([])
  }

  const handleBack = () => {
    setLoading(true)
    setCurrentFolderId(null)
    setViews([])
  }

  /**
   * Persist a new ordering for the views in the current container after
   * a drag. `newDispatchTilesIds` is the new sequence of the
   * SORTABLE-only subset (the composite project_overview pair is the
   * immovable anchor and isn't reorderable by DnD).
   *
   * The persisted order always lists the composite pair first (chart
   * then sources) when it exists, then the dragged subset — that's the
   * shape the dashboard reads back into the same anchored layout on
   * next load. Optimistic: local state swaps immediately; on persist
   * failure we restore the snapshot and surface a toast.
   */
  const handleReorder = async (newDispatchTilesIds: string[]) => {
    const snapshot = views
    const chartView = views.find(v => v.type === 'project_overview')
    const sourcesView = views.find(v => v.type === 'project_overview_sources')
    const anchorIds: string[] = []
    // Only the FULL composite pair anchors at the top — when one half
    // is missing the surviving half goes back into the sortable set
    // (it's no longer "the composite") and participates in dispatch.
    if (chartView && sourcesView) {
      anchorIds.push(chartView.id, sourcesView.id)
    }
    const fullOrderedIds = [...anchorIds, ...newDispatchTilesIds]
    const byId = new Map(views.map(v => [v.id, v] as const))
    const reorderedViews = fullOrderedIds
      .map(id => byId.get(id))
      .filter((v): v is View => v != null)
    setViews(reorderedViews)
    try {
      await viewsCtx.reorderViews(project.id, currentFolderId, fullOrderedIds)
    } catch {
      setViews(snapshot)
      toast.error('Failed to save new order')
    }
  }

  const openCreateViewModal = () => {
    // Gate the create flow behind the plan's per-project view limit.
    // We count from the live Redux store — accurate when the user
    // has just navigated the project. Edge case: a fresh page where
    // the user clicks "Create view" before any fetch lands shows
    // count=0 and lets the click through; the server should
    // separately enforce the cap.
    const projectViewCount = viewsCtx.views.filter(
      v => v.projectId === project.id,
    ).length
    if (!enforceViewLimit(projectViewCount)) return
    viewsCtx.openModal(currentFolderId, project.id)
  }

  const isEmpty = !loading && subFolders.length === 0 && views.length === 0

  return {
    views,
    loading,
    currentFolder,
    subFolders,
    isRange,
    dateFrom: globalDateFrom,
    dateTo: globalDateTo,
    mode: globalDateMode,
    // `tz` is exposed by the hook (rather than read inside the tile
    // renderers) so the rendering tree stays pure prop-drilling — no
    // `useSelector` below this point.
    tz,
    isEmpty,
    handleUntrack,
    handlePin,
    handleConnectionAssigned,
    handleReorder,
    handleFolderClick,
    handleBack,
    openCreateViewModal,
    foldersCtx,
  }
}
