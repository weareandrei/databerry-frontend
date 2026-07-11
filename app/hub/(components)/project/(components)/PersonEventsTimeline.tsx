'use client'

/**
 * Person event timeline — fetch, filters, empty/loading states, and
 * `TimelineView` wiring. Pass `fetchEvents` so the same component works
 * in the dashboard (real API) and demo (synthetic data).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, CalendarBlank, Lightning } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import type { PersonEvent } from '@/lib/api'
import { TimelineView, useTimelineNodes, type TimelineNode } from '@/components/TimelineView'
import { cn } from '@/lib/utils'
import {
  connectionName,
  detailFor,
  formatFull,
  formatTime,
  propertyRows,
  sourceColor,
} from './personEventUtils'
import {
  eventsToTimelineNodes,
  formatDuration,
  isPageDwell,
  type PageDwellSession,
  type PersonTimelineNodeData,
} from './personPageSessions'

const CARD_MAX_W = 260

export type PersonEventsFetcher = (ctx: {
  signal: AbortSignal
}) => Promise<PersonEvent[]>

function sourceForNode(data: PersonTimelineNodeData): string {
  if (isPageDwell(data)) return data.pageview.source ?? 'custom'
  return data.event.source ?? 'custom'
}

function PersonEventCard({
  ev,
  expanded,
  onToggle,
}: {
  ev: PersonEvent
  expanded: boolean
  onToggle: () => void
}) {
  const color = sourceColor(ev.source)
  const detail = detailFor(ev)
  const label = ev.eventLabel ?? ev.eventKey ?? 'Event'
  const rows = expanded ? propertyRows(ev) : []

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        'flex w-full overflow-hidden rounded-lg border bg-white text-left transition-shadow cursor-pointer',
        expanded
          ? 'border-foreground/20 shadow-card'
          : 'border-stroke shadow-pill hover:shadow-card',
      )}
      style={{ maxWidth: CARD_MAX_W }}
    >
      <span
        aria-hidden
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: color }}
      />

      <div className="min-w-0 flex-1 px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground">
            {label}
          </p>
          {detail && (
            <p className="min-w-0 shrink truncate text-[11px] leading-tight text-subtle">
              {detail}
            </p>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-subtle">
          <ConnectionIcon type={ev.source ?? 'custom'} size={13} />
          <span className="truncate font-medium text-muted-foreground">
            {connectionName(ev.source ?? 'custom')}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums whitespace-nowrap">{formatTime(ev.occurredAt)}</span>
        </div>

        {expanded && (
          <div className="mt-2 space-y-1.5 border-t border-stroke pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarBlank size={12} weight="bold" className="text-subtle" />
              <span>{formatFull(ev.occurredAt)}</span>
            </div>
            {rows.length > 0 && (
              <dl className="space-y-1">
                {rows.map(r => (
                  <div key={r.label} className="flex gap-2 text-[11px]">
                    <dt className="shrink-0 text-subtle">{r.label}</dt>
                    <dd className="min-w-0 flex-1 break-words text-right font-medium text-muted-foreground">
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {ev.eventKey && (
              <p className="truncate pt-0.5 font-mono text-[10px] text-subtle">
                {ev.eventKey}
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

function PageDwellCard({
  session,
  expanded,
  onToggle,
  primarySpan,
}: {
  session: PageDwellSession
  expanded: boolean
  onToggle: () => void
  primarySpan: number
}) {
  const ev = session.pageview
  const color = sourceColor(ev.source)
  const hasRange = session.endedAt != null && session.durationMs != null
  const tall = hasRange && primarySpan >= 72

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        'flex h-full w-full overflow-hidden rounded-lg border bg-white text-left transition-shadow cursor-pointer',
        expanded
          ? 'border-foreground/20 shadow-card'
          : 'border-stroke shadow-pill hover:shadow-card',
      )}
      style={{ maxWidth: CARD_MAX_W, minHeight: hasRange ? primarySpan : undefined }}
    >
      <span
        aria-hidden
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: color }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground">
            {session.path}
          </p>
          {session.durationMs != null && (
            <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {formatDuration(session.durationMs)}
            </span>
          )}
        </div>

        {tall && !expanded && (
          <p className="mt-auto pt-2 text-[10px] font-medium tabular-nums text-subtle">
            {formatTime(session.startedAt)} → {formatTime(session.endedAt!)}
          </p>
        )}

        <div className={cn('flex items-center gap-1.5 text-[11px] text-subtle', !tall && 'mt-1')}>
          <ConnectionIcon type={ev.source ?? 'custom'} size={13} />
          <span className="truncate font-medium text-muted-foreground">
            {connectionName(ev.source ?? 'custom')}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums whitespace-nowrap">{formatTime(session.startedAt)}</span>
          {!hasRange && (
            <>
              <span aria-hidden>·</span>
              <span className="text-subtle">no leave</span>
            </>
          )}
        </div>

        {expanded && (
          <div className="mt-2 space-y-2 border-t border-stroke pt-2">
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarBlank size={12} weight="bold" className="text-subtle" />
                <span>
                  Entered {formatFull(session.startedAt)}
                  {session.endedAt && (
                    <>
                      {' '}
                      · Left {formatFull(session.endedAt)}
                    </>
                  )}
                </span>
              </div>
              {session.durationMs != null && (
                <p className="font-medium text-foreground">
                  On page {formatDuration(session.durationMs)}
                </p>
              )}
            </div>
            {propertyRows(session.pageview).length > 0 && (
              <dl className="space-y-1">
                {propertyRows(session.pageview).map(r => (
                  <div key={r.label} className="flex gap-2 text-[11px]">
                    <dt className="shrink-0 text-subtle">{r.label}</dt>
                    <dd className="min-w-0 flex-1 break-words text-right font-medium text-muted-foreground">
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

function TimelineNodeCard({
  data,
  expanded,
  onToggle,
  primarySpan,
}: {
  data: PersonTimelineNodeData
  expanded: boolean
  onToggle: () => void
  primarySpan: number
}) {
  if (isPageDwell(data)) {
    return (
      <PageDwellCard
        session={data}
        expanded={expanded}
        onToggle={onToggle}
        primarySpan={primarySpan}
      />
    )
  }
  return <PersonEventCard ev={data.event} expanded={expanded} onToggle={onToggle} />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-black/[0.04]" />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface">
        <Lightning size={20} weight="bold" className="text-subtle" />
      </span>
      <p className="text-sm font-medium text-foreground">No events yet</p>
      <p className="mt-1 max-w-xs text-xs text-subtle">
        We haven&apos;t recorded any activity for this person. Run{' '}
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
          <ArrowsClockwise size={11} weight="bold" /> Refresh
        </span>{' '}
        to pull their latest events from Stripe / PostHog.
      </p>
    </div>
  )
}

function filterBadgesFor(
  sources: { key: string; count: number }[],
  activeSource: string | null,
  setActiveSource: (v: string | null) => void,
) {
  if (sources.length <= 1) return undefined
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map(({ key, count }) => {
        const active = activeSource === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSource(active ? null : key)}
            className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-1 text-xs font-medium transition-colors cursor-pointer ${
              active
                ? 'border-foreground bg-surface text-foreground'
                : 'border-stroke bg-white text-muted-foreground hover:bg-hover-fill'
            }`}
          >
            <ConnectionIcon type={key} size={16} />
            <span>{connectionName(key)}</span>
            <span
              className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
                active ? 'bg-foreground text-white' : 'bg-surface text-muted-foreground'
              }`}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function PersonEventsTimeline({
  fetchEvents,
  fetchKey,
  enabled = true,
}: {
  /** Load events — dashboard uses the API; demo passes synthetic data. */
  fetchEvents: PersonEventsFetcher
  /** Refetch when this changes (e.g. person id). */
  fetchKey?: unknown
  enabled?: boolean
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
    return <LoadingSkeleton />
  }

  if (filteredNodes.length === 0) {
    if (nodes.length === 0) return <EmptyState />
    return (
      <div className="space-y-3">
        {filterBadgesFor(sources, activeSource, setActiveSource)}
        <p className="rounded-xl border border-stroke bg-surface px-4 py-8 text-center text-sm text-subtle">
          No events for this source.
        </p>
      </div>
    )
  }

  const filterBadges = filterBadgesFor(sources, activeSource, setActiveSource)

  return (
    <TimelineView
      nodes={filteredNodes}
      isVertical
      nodeWidth={CARD_MAX_W}
      headerRight={filterBadges}
      renderNode={({ node, expanded, onToggle, primarySpan }) => (
        <TimelineNodeCard
          data={node.data}
          expanded={expanded}
          onToggle={onToggle}
          primarySpan={primarySpan}
        />
      )}
    />
  )
}
