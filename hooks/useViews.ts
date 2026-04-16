import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState, AppDispatch } from '@/store'
import { setViews, addViews, removeView } from '@/store/slices/viewsSlice'
import { openCreateViewModal, closeCreateViewModal } from '@/store/slices/uiSlice'
import { ALGORITHM } from '@/lib/api'
import type { View } from '@/types/view'

export function useViews() {
  const dispatch = useDispatch<AppDispatch>()
  const views = useSelector((state: RootState) => state.views.items)
  const loading = useSelector((state: RootState) => state.views.loading)
  const isModalOpen = useSelector((state: RootState) => state.ui.createViewModalOpen)
  const createViewFolderId = useSelector((state: RootState) => state.ui.createViewFolderId)
  const createViewProjectId = useSelector((state: RootState) => state.ui.createViewProjectId)

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
      return created
    } catch {
      toast.error('Failed to create views')
    }
  }

  const untrackView = async (viewId: string) => {
    const existing = views.find(v => v.id === viewId)
    dispatch(removeView(viewId))
    try {
      await ALGORITHM.deleteView(viewId)
    } catch {
      if (existing) dispatch(addViews([existing]))
      toast.error('Failed to untrack view')
    }
  }

  return {
    views,
    loading,
    isModalOpen,
    createViewFolderId,
    createViewProjectId,
    loadViewsForFolder,
    getViewsByFolder,
    createViews,
    untrackView,
    openModal: (folderId: string | null, projectId: string) =>
      dispatch(openCreateViewModal({ folderId, projectId })),
    closeModal: () => dispatch(closeCreateViewModal()),
  }
}
