'use client'

import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Users } from '@phosphor-icons/react'
import {
  TimelineView,
  TimelineLoadingSkeleton,
  useTimelineNodes,
  type TimelineZoom,
} from '@/components/TimelineView'
import { ALGORITHM } from '@/lib/api'
import type { RootState } from '@/store'
import type { DateMode } from '@/types/dates'
import { setGlobalDateMode } from '@/store/slices/uiSlice'
import { fetchProjectSessionNodes } from './projectSessions'
import {
  PROJECT_SESSION_CARD_HEIGHT,
  PROJECT_SESSION_CARD_WIDTH,
  renderProjectSessionNode,
} from './ProjectSessionNodeCard'

const ZOOM_TO_MODE: Record<TimelineZoom, DateMode> = {
  day: 'daily',
  week: 'weekly',
  month: 'monthly',
}

const MODE_TO_ZOOM: Record<DateMode, TimelineZoom> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
}

function SessionsEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface">
        <Users size={20} weight="bold" className="text-subtle" />
      </span>
      <p className="text-sm font-medium text-foreground">No sessions in this period</p>
      <p className="mt-1 max-w-sm text-xs text-subtle">
        Sync people from PostHog or Stripe, then pick a date range when users were active.
      </p>
    </div>
  )
}

export function ProjectSessionsTimeline({ projectId }: { projectId: string }) {
  const dispatch = useDispatch()
  const dateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const dateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const dateMode = useSelector((s: RootState) => s.ui.globalDateMode)
  const zoom = MODE_TO_ZOOM[dateMode]

  const handleZoomChange = useCallback(
    (next: TimelineZoom) => {
      dispatch(setGlobalDateMode(ZOOM_TO_MODE[next]))
    },
    [dispatch],
  )

  const loadNodes = useCallback(
    async (ctx: { signal: AbortSignal }) => {
      return fetchProjectSessionNodes(
        async () => {
          const { people } = await ALGORITHM.getPeople(projectId, {
            limit: 200,
            autoResync: false,
          })
          return people
        },
        personId => ALGORITHM.getPersonEvents(personId, { limit: 200 }),
        dateFrom,
        dateTo,
        ctx.signal,
      )
    },
    [projectId, dateFrom, dateTo],
  )

  const { nodes, loading } = useTimelineNodes({
    fetch: loadNodes,
    deps: [projectId, dateFrom, dateTo],
  })

  if (loading || nodes === null) {
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <TimelineLoadingSkeleton />
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <SessionsEmptyState />
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <TimelineView
        nodes={nodes}
        nodeWidth={PROJECT_SESSION_CARD_WIDTH}
        estNodeHeight={PROJECT_SESSION_CARD_HEIGHT}
        viewportSize="fill"
        zoom={zoom}
        onZoomChange={handleZoomChange}
        showZoomControl={false}
        timeRange={{ from: dateFrom, to: dateTo }}
        renderNode={renderProjectSessionNode}
      />
    </div>
  )
}
