import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState, AppDispatch } from '@/store'
import { setViews, addViews, removeView, replaceView } from '@/store/slices/viewsSlice'
import { openCreateViewModal, closeCreateViewModal } from '@/store/slices/uiSlice'
import { ALGORITHM } from '@/lib/api'
import { EVENT, trackEvent } from '@/lib/posthog'
import type { View } from '@/types/view'

export function useViews() {
  const dispatch = useDispatch<AppDispatch>()
  const views = useSelector((state: RootState) => state.views.items)
  const loading = useSelector((state: RootState) => state.views.loading)

  // Total view count across ALL the user's projects, fetched eagerly
  // on mount. Distinct from `views.length` (the redux slice) which
  // only contains views the user has actively navigated into this
  // session — that one undercounts dramatically, and was the cause
  // of the sidebar plan card showing "0 / 100 views" for users
  // with real views in untouched folders.
  //
  // `null` while the count is loading; `number` once we have it.
  // Increment/decrement after successful create/delete so the
  // sidebar tracks reality without a refetch.
  const [totalCount, setTotalCount] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    ALGORITHM.getViewsCount()
      .then(r => {
        if (!cancelled) setTotalCount(r.count)
      })
      .catch(() => {
        // Leave as null — the sidebar will fall back to "—" and
        // hide the bar, which is the correct behaviour when we
        // don't know the count. The user's never blocked.
      })
    return () => {
      cancelled = true
    }
  }, [])
  // Per-project refresh tick map. Consumers (`<ProjectView>`) should
  // pick a single project's tick out of this map for their deps
  // array — see `getRefreshKeyForProject` below. Subscribing to the
  // whole map and pulling a single entry locally would still trigger
  // a re-render in every `<ProjectView>` whenever ANY project's tick
  // bumps; the helper avoids that by passing only the relevant
  // primitive number down.
  const refreshKeyByProject = useSelector(
    (state: RootState) => state.views.refreshKeyByProject,
  )
  const getRefreshKeyForProject = (projectId: string) =>
    refreshKeyByProject[projectId] ?? 0
  const isModalOpen = useSelector((state: RootState) => state.ui.createViewModalOpen)
  const createViewFolderId = useSelector((state: RootState) => state.ui.createViewFolderId)
  const createViewProjectId = useSelector((state: RootState) => state.ui.createViewProjectId)

  const fetchViewsByProject = async (projectId: string, from: string, to: string): Promise<View[]> => {
    try {
      return await ALGORITHM.getViewsByProject(projectId, from, to)
    } catch {
      toast.error('Failed to load views')
      return []
    }
  }

  const fetchViewsByFolder = async (folderId: string, from: string, to: string): Promise<View[]> => {
    try {
      return await ALGORITHM.getViewsByFolder(folderId, from, to)
    } catch {
      toast.error('Failed to load views')
      return []
    }
  }

  const loadViewsForFolder = async (folderId: string) => {
    try {
      const data = await ALGORITHM.getViewsByFolder(folderId)
      // Merge: replace existing views for this folder, keep others
      dispatch(setViews([...views.filter(v => v.folderId !== folderId), ...data]))
    } catch {
      toast.error('Failed to load views')
    }
  }

  const getViewsByFolder = (folderId: string) =>
    views.filter(v => v.folderId != null && v.folderId === folderId)

  const createViews = async (
    items: Array<Omit<View, 'id' | 'userId' | 'createdAt' | 'isPinned'>>,
  ) => {
    try {
      const created = await Promise.all(items.map(v => ALGORITHM.createView(v)))
      dispatch(addViews(created))

      // A PostHog view with no `hogFunctionId` means its live-update
      // destination couldn't be registered — almost always the API key is
      // missing the `hog_function:write` scope. The view still works on
      // refresh; warn so the user can add the scope for automatic updates.
      const noLiveUpdates = created.filter(
        v => v.connectionType === 'posthog' && !v.config?.hogFunctionId,
      )
      if (noLiveUpdates.length > 0) {
        toast.warning(
          `${
            noLiveUpdates.length === 1 ? 'View created' : `${noLiveUpdates.length} views created`
          }, but won't update live. Add the “hog_function:write” scope to your PostHog API key to enable automatic updates.`,
        )
      }

      // Keep `totalCount` in sync so the sidebar plan card updates
      // immediately instead of waiting for a page refresh. Only
      // bumps if we already have a count (null = still loading;
      // don't pretend to know).
      setTotalCount(c => (c == null ? c : c + created.length))
      // Centralised event — fires for every entry point (event picker,
      // funnel, retention, webhook field, composite "Add overview").
      // One event per `createViews()` call (one user intent), with
      // `viewTypes[]` so the composite chart+sources pair is grouped
      // together rather than counted as 2 separate creations.
      const firstItem = created[0]
      trackEvent(EVENT.VIEW_CREATED, {
        projectId: firstItem?.projectId,
        folderId: firstItem?.folderId,
        connectionType: firstItem?.connectionType,
        viewTypes: created.map(v => v.type),
        viewCount: created.length,
        viewIds: created.map(v => v.id),
      })
      return created
    } catch {
      toast.error('Failed to create views')
    }
  }

  /**
   * Swap a single view in redux state with the updated copy. Used after the
   * reassignment dialog attaches a fresh connection — `view.connectionId`
   * changes, which the live-value `useEffect`s in this file's consumers
   * watch as a dep, so the tile re-fetches without a full folder reload.
   */
  const replaceViewInState = (updated: View) => {
    dispatch(replaceView(updated))
  }

  const untrackView = async (viewId: string) => {
    const existing = views.find(v => v.id === viewId)
    dispatch(removeView(viewId))
    try {
      await ALGORITHM.deleteView(viewId)
      // Decrement only after the server confirms — the local
      // `removeView` dispatch is optimistic, and the catch below
      // re-adds the view if the delete failed. We don't decrement
      // optimistically because reverting a count is harder to keep
      // truthful than waiting for the server "ok".
      setTotalCount(c => (c == null ? c : Math.max(0, c - 1)))
      // Stable id so removing the two halves of a composite overview
      // (fired back-to-back from `OverviewComposite`) collapses into ONE
      // toast instead of stacking two identical "View removed"s.
      toast.success('View removed', { id: 'view-removed' })
    } catch {
      if (existing) dispatch(addViews([existing]))
      toast.error('Failed to untrack view')
    }
  }

  /**
   * Persist a new ordering for one container's views (project root
   * when `folderId` is null, a folder otherwise). Pure passthrough —
   * the optimistic local-state swap lives in the CALLER (`useProjectView`,
   * which owns the displayed view array) so a failed persist can revert
   * exactly what it changed; doing it here would split the snapshot
   * across two state owners. Throws on failure so the caller can catch
   * + revert + toast.
   */
  const reorderViews = async (
    projectId: string,
    folderId: string | null,
    orderedViewIds: string[],
  ) => {
    await ALGORITHM.reorderViews(projectId, folderId, orderedViewIds)
  }

  return {
    views,
    totalCount,
    loading,
    getRefreshKeyForProject,
    isModalOpen,
    fetchViewsByProject,
    fetchViewsByFolder,
    createViewFolderId,
    createViewProjectId,
    loadViewsForFolder,
    getViewsByFolder,
    createViews,
    untrackView,
    reorderViews,
    replaceView: replaceViewInState,
    openModal: (folderId: string | null, projectId: string) =>
      dispatch(openCreateViewModal({ folderId, projectId })),
    closeModal: () => dispatch(closeCreateViewModal()),
  }
}
