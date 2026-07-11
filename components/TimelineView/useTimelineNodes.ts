'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TimelineNode } from './types'

export interface UseTimelineNodesOptions<T> {
  /** When false, skips fetch and leaves `nodes` null. */
  enabled?: boolean
  fetch: (ctx: { signal: AbortSignal }) => Promise<TimelineNode<T>[]>
  /** Values that should trigger a refetch (e.g. person id). */
  deps?: unknown[]
}

export interface UseTimelineNodesResult<T> {
  nodes: TimelineNode<T>[] | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Generic data hook for timeline wrappers. Keeps API-specific fetch
 * functions out of `TimelineView` while colocating load logic with the
 * timeline UI layer.
 */
export function useTimelineNodes<T>({
  enabled = true,
  fetch,
  deps = [],
}: UseTimelineNodesOptions<T>): UseTimelineNodesResult<T> {
  const [nodes, setNodes] = useState<TimelineNode<T>[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!enabled) {
      setNodes(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    setNodes(null)
    setLoading(true)
    setError(null)

    fetch({ signal: controller.signal })
      .then(result => {
        if (!cancelled) setNodes(result)
      })
      .catch(err => {
        if (cancelled || controller.signal.aborted) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setNodes([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the intentional refetch key list
  }, [enabled, fetch, tick, ...deps])

  return { nodes, loading, error, refetch }
}
