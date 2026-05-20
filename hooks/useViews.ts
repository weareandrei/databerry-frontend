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
      toast.success('View removed')
    } catch {
      if (existing) dispatch(addViews([existing]))
      toast.error('Failed to untrack view')
    }
  }

  return {
    views,
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
    replaceView: replaceViewInState,
    openModal: (folderId: string | null, projectId: string) =>
      dispatch(openCreateViewModal({ folderId, projectId })),
    closeModal: () => dispatch(closeCreateViewModal()),
  }
}
