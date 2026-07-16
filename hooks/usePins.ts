import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { ALGORITHM } from '@/lib/api'
import type { Widget } from '@/types/widget'

export function usePins() {
  const [pinnedViews, setPinnedViews] = useState<Widget[]>([])
  const [loading, setLoading] = useState(false)

  const loadPinnedViews = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ALGORITHM.getPinnedViews()
      setPinnedViews(data)
    } catch {
      // Silently ignore — pinned section just stays empty
    } finally {
      setLoading(false)
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

  /**
   * Replace a single pin in local state. Used by `ReassignConnectionDialog`
   * to swap an orphan view's `connectionId` after the user attaches a fresh
   * connection — the tile then re-fetches its live value because the
   * `view.connectionId` dependency on the live-value `useEffect` changes.
   */
  const replacePin = (updated: Widget) => {
    setPinnedViews(prev => prev.map(v => (v.id === updated.id ? updated : v)))
  }

  return { pinnedViews, loading, loadPinnedViews, pinView, unpinView, replacePin }
}
