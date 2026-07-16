'use client'

/**
 * Person event timeline — fetch, filters, empty/loading states, and
 * `TimelineView` wiring. Pass `fetchEvents` so the same component works
 * in the dashboard (real API) and demo (synthetic data).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PersonEvent } from '@/lib/api'
import {
  TimelineView,
  TimelineLoadingSkeleton,
  useTimelineNodes,
  type TimelineNode,
} from '@/components/TimelineView'
import {
  eventsToTimelineNodes,
  isPageDwell,
  type PersonTimelineNodeData,
} from '../personPageSessions'
import { PersonEventsEmptyState } from './PersonEventsEmptyState'
import { PersonEventsSourceFilters } from './PersonEventsSourceFilters'
import { PERSON_EVENT_CARD_WIDTH } from './PersonEventCard'
import { renderPersonTimelineNode } from './PersonTimelineNodeCard'

export type PersonEventsFetcher = (ctx: {
  signal: AbortSignal
}) => Promise<PersonEvent[]>

function sourceForNode(data: PersonTimelineNodeData): string {
  if (isPageDwell(data)) return data.pageview.source ?? 'custom'
  return data.event.source ?? 'custom'
}

export function PersonEventsTimeline({
  fetchEvents,
  fetchKey,
  enabled = true,
  viewportSize = 'compact',
}: {
  /** Load events — dashboard uses the API; demo passes synthetic data. */
  fetchEvents: PersonEventsFetcher
  /** Refetch when this changes (e.g. person id). */
  fetchKey?: unknown
  enabled?: boolean
  /** Scrollport preset — bottom sheet uses `compact`; full pages can override. */
  viewportSize?: 'default' | 'compact' | 'fill'
}) {
  const loadNodes = useCallback(
    async (ctx: { signal: AbortSignal }) => {
      const events = await fetchEvents(ctx)
      return eventsToTimelineNodes(events)
    },
    [fetchEvents],
  )

  const { nodes, loading } = useTimelineNodes<PersonTimelineNodeData>({
    enabled,
    fetch: loadNodes,
    deps: [fetchKey],
  })

  const [activeSource, setActiveSource] = useState<string | null>(null)
  useEffect(() => setActiveSource(null), [nodes])

  const sources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of nodes ?? []) {
      const key = sourceForNode(n.data)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
  }, [nodes])

  const filteredNodes = useMemo((): TimelineNode<PersonTimelineNodeData>[] | null => {
    if (nodes === null) return null
    if (!activeSource) return nodes
    return nodes.filter(n => sourceForNode(n.data) === activeSource)
  }, [nodes, activeSource])

  if (loading || filteredNodes === null) {
    return <TimelineLoadingSkeleton />
  }

  if (filteredNodes.length === 0) {
    if (!nodes?.length) return <PersonEventsEmptyState />
    return (
      <div className="space-y-3">
        <PersonEventsSourceFilters
          sources={sources}
          activeSource={activeSource}
          onActiveSourceChange={setActiveSource}
        />
        <p className="rounded-xl border border-stroke bg-surface px-4 py-8 text-center text-sm text-subtle">
          No events for this source.
        </p>
      </div>
    )
  }

  return (
    <TimelineView
      nodes={filteredNodes}
      isVertical
      nodeWidth={PERSON_EVENT_CARD_WIDTH}
      viewportSize={viewportSize}
      headerRight={
        <PersonEventsSourceFilters
          sources={sources}
          activeSource={activeSource}
          onActiveSourceChange={setActiveSource}
        />
      }
      renderNode={renderPersonTimelineNode}
    />
  )
}
