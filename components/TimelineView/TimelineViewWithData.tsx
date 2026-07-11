'use client'

import { useCallback } from 'react'
import { TimelineView } from './TimelineView'
import { useTimelineNodes } from './useTimelineNodes'
import type { TimelineViewWithDataProps } from './types'

function DefaultLoading() {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-black/[0.04]" />
      ))}
    </div>
  )
}

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
    return renderLoading?.() ?? <DefaultLoading />
  }

  if (nodes.length === 0) {
    return renderEmpty?.() ?? null
  }

  return <TimelineView {...viewProps} nodes={nodes} />
}
