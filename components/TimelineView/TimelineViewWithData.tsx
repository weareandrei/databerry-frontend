'use client'

import { useCallback } from 'react'
import { TimelineView } from './TimelineView'
import { TimelineLoadingSkeleton } from './(components)/TimelineLoadingSkeleton'
import { useTimelineNodes } from './useTimelineNodes'
import type { TimelineViewWithDataProps } from './types'

/**
 * `TimelineView` + `useTimelineNodes` for screens that only need
 * fetch → render with no extra logic (no pre-filtering, etc.).
 */
export function TimelineViewWithData<T>({
  fetchNodes,
  fetchKey,
  enabled = true,
  renderLoading,
  renderEmpty,
  ...viewProps
}: TimelineViewWithDataProps<T>) {
  const fetch = useCallback(
    (ctx: { signal: AbortSignal }) => fetchNodes(ctx),
    [fetchNodes],
  )

  const { nodes, loading } = useTimelineNodes<T>({
    enabled,
    fetch,
    deps: [fetchKey],
  })

  if (loading || nodes === null) {
    return renderLoading?.() ?? <TimelineLoadingSkeleton />
  }

  if (nodes.length === 0) {
    return renderEmpty?.() ?? null
  }

  return <TimelineView {...viewProps} nodes={nodes} />
}
