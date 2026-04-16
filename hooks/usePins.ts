import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { ALGORITHM } from '@/lib/api'
import type { View } from '@/types/view'

export function usePins() {
  const [pinnedViews, setPinnedViews] = useState<View[]>([])

  const loadPinnedViews = useCallback(async () => {
    try {
      const data = await ALGORITHM.getPinnedViews()
      setPinnedViews(data)
    } catch {
      // Silently ignore — pinned section just stays empty
    }
  }, [])

  const pinView = async (viewId: string) => {
    try {
      await ALGORITHM.pinView(viewId)
      await loadPinnedViews()
    } catch {
      toast.error('Failed to pin view')
    }
  }

  const unpinView = async (viewId: string) => {
    setPinnedViews(prev => prev.filter(v => v.id !== viewId))
    try {
      await ALGORITHM.unpinView(viewId)
    } catch {
      toast.error('Failed to unpin view')
      await loadPinnedViews()
    }
  }

  return { pinnedViews, loadPinnedViews, pinView, unpinView }
}
