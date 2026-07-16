import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState, AppDispatch } from '@/store'
import {
  setWidgets,
  addWidgets,
  removeWidget,
  replaceWidget,
} from '@/store/slices/widgetsSlice'
import { openCreateViewModal, closeCreateViewModal } from '@/store/slices/uiSlice'
import { ALGORITHM } from '@/lib/api'
import { EVENT, trackEvent } from '@/lib/posthog'
import type { Widget } from '@/types/widget'

export function useWidgets() {
  const dispatch = useDispatch<AppDispatch>()
  const widgets = useSelector((state: RootState) => state.widgets.items)
  const loading = useSelector((state: RootState) => state.widgets.loading)

  const [totalCount, setTotalCount] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    ALGORITHM.getViewsCount()
      .then(r => {
        if (!cancelled) setTotalCount(r.count)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const refreshKeyByProject = useSelector(
    (state: RootState) => state.widgets.refreshKeyByProject,
  )
  const getRefreshKeyForProject = (projectId: string) =>
    refreshKeyByProject[projectId] ?? 0
  const isModalOpen = useSelector((state: RootState) => state.ui.createViewModalOpen)
  const createViewFolderId = useSelector((state: RootState) => state.ui.createViewFolderId)
  const createViewProjectId = useSelector((state: RootState) => state.ui.createViewProjectId)

  const fetchWidgetsByProject = async (
    projectId: string,
    from: string,
    to: string,
  ): Promise<Widget[]> => {
    try {
      return await ALGORITHM.getViewsByProject(projectId, from, to)
    } catch {
      toast.error('Failed to load widgets')
      return []
    }
  }

  const fetchWidgetsByFolder = async (
    folderId: string,
    from: string,
    to: string,
  ): Promise<Widget[]> => {
    try {
      return await ALGORITHM.getWidgetsByFolder(folderId, from, to)
    } catch {
      toast.error('Failed to load widgets')
      return []
    }
  }

  const loadWidgetsForFolder = async (folderId: string) => {
    try {
      const data = await ALGORITHM.getWidgetsByFolder(folderId)
      dispatch(setWidgets([...widgets.filter(w => w.folderId !== folderId), ...data]))
    } catch {
      toast.error('Failed to load widgets')
    }
  }

  const getWidgetsByFolder = (folderId: string) =>
    widgets.filter(w => w.folderId != null && w.folderId === folderId)

  const createWidgets = async (
    items: Array<Omit<Widget, 'id' | 'userId' | 'createdAt' | 'isPinned'>>,
  ) => {
    try {
      const created = await Promise.all(items.map(w => ALGORITHM.createView(w)))
      dispatch(addWidgets(created))

      const noLiveUpdates = created.filter(
        w => w.connectionType === 'posthog' && !w.config?.hogFunctionId,
      )
      if (noLiveUpdates.length > 0) {
        toast.warning(
          `${
            noLiveUpdates.length === 1 ? 'Widget created' : `${noLiveUpdates.length} widgets created`
          }, but won't update live. Add the “hog_function:write” scope to your PostHog API key to enable automatic updates.`,
        )
      }

      setTotalCount(c => (c == null ? c : c + created.length))
      const firstItem = created[0]
      trackEvent(EVENT.VIEW_CREATED, {
        projectId: firstItem?.projectId,
        folderId: firstItem?.folderId,
        connectionType: firstItem?.connectionType,
        viewTypes: created.map(w => w.type),
        viewCount: created.length,
        viewIds: created.map(w => w.id),
      })
      return created
    } catch {
      toast.error('Failed to create widgets')
    }
  }

  const replaceWidgetInState = (updated: Widget) => {
    dispatch(replaceWidget(updated))
  }

  const untrackWidget = async (widgetId: string) => {
    const existing = widgets.find(w => w.id === widgetId)
    dispatch(removeWidget(widgetId))
    try {
      await ALGORITHM.deleteView(widgetId)
      setTotalCount(c => (c == null ? c : Math.max(0, c - 1)))
      toast.success('Widget removed', { id: 'widget-removed' })
    } catch {
      if (existing) dispatch(addWidgets([existing]))
      toast.error('Failed to untrack widget')
    }
  }

  const reorderWidgets = async (
    projectId: string,
    folderId: string | null,
    orderedWidgetIds: string[],
  ) => {
    await ALGORITHM.reorderWidgets(projectId, folderId, orderedWidgetIds)
  }

  return {
    widgets,
    totalCount,
    loading,
    getRefreshKeyForProject,
    isModalOpen,
    fetchWidgetsByProject,
    fetchWidgetsByFolder,
    createViewFolderId,
    createViewProjectId,
    loadWidgetsForFolder,
    getWidgetsByFolder,
    createWidgets,
    untrackWidget,
    reorderWidgets,
    replaceWidget: replaceWidgetInState,
    openModal: (folderId: string | null, projectId: string) =>
      dispatch(openCreateViewModal({ folderId, projectId })),
    closeModal: () => dispatch(closeCreateViewModal()),
  }
}
