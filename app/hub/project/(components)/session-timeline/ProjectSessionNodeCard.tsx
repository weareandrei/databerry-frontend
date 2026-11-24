'use client'

import { CalendarBlank } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { SourceIcon } from '@/app/hub/(components)/widgets/(components)/SourceIcon'
import { ExpandableTimelineCard } from '@/components/TimelineView'
import type { TimelineRenderNodeProps } from '@/components/TimelineView'
import type { PersonRow } from '@/lib/api'
import { PersonAvatar } from '../PersonAvatar'
import { formatDuration } from '../personPageSessions'
import {
  connectionName,
  detailFor,
  formatFull,
  formatTime,
  propertyRows,
  sourceColor,
} from '../personEventUtils'
import { sourceLabel, type ProjectSessionNodeData } from './projectSessions'

export const PROJECT_SESSION_CARD_WIDTH = 240
/** Fixed collapsed height — every card is the same size on the axis. */
export const PROJECT_SESSION_CARD_HEIGHT = 72

/** Accent for "last seen" cards, which no connected tool reported. */
const FALLBACK_ACCENT = 'var(--primary)'

interface CardContent {
  /** What happened — the card's headline. */
  label: string
  /** The specific page / amount / method, when the event carries one. */
  detail: string | null
  /** Connected tool that reported it; null for last-seen fallbacks. */
  tool: string | null
  at: string
  durationMs: number | null
}

function cardContent(data: ProjectSessionNodeData): CardContent {
  switch (data.kind) {
    case 'session':
      return {
        label: 'Page view',
        detail: data.session.path,
        tool: data.session.pageview.source ?? 'custom',
        at: data.session.startedAt,
        durationMs: data.session.durationMs,
      }
    case 'event':
      return {
        label: data.event.eventLabel ?? data.event.eventKey ?? 'Event',
        detail: detailFor(data.event),
        tool: data.event.source ?? 'custom',
        at: data.event.occurredAt,
        durationMs: null,
      }
    case 'visit':
      return {
        label: 'Last seen',
        detail: null,
        tool: null,
        at: data.person.lastSeenAt!,
        durationMs: null,
      }
  }
}

function personName(person: PersonRow): string {
  return person.displayName ?? person.primaryEmail ?? 'Unknown person'
}

/** "When" line at the top of the expanded card. */
function whenLine(data: ProjectSessionNodeData): string {
  switch (data.kind) {
    case 'session': {
      const { startedAt, endedAt } = data.session
      return endedAt
        ? `Entered ${formatTime(startedAt)} · Left ${formatTime(endedAt)}`
        : `Entered ${formatTime(startedAt)}`
    }
    case 'event':
      return formatFull(data.event.occurredAt)
    case 'visit':
      return 'Last seen in this period — no activity recorded.'
  }
}

/** Key/value rows listed under the "when" line of the expanded card. */
function detailRows(data: ProjectSessionNodeData): { label: string; value: string }[] {
  const { person } = data
  const rows: { label: string; value: string }[] = []

  // The collapsed card shows the name; surface the email it stands for.
  if (person.displayName && person.primaryEmail) {
    rows.push({ label: 'Email', value: person.primaryEmail })
  }
  if (data.kind === 'session') {
    rows.push({ label: 'Path', value: data.session.path })
    if (data.session.durationMs != null) {
      rows.push({ label: 'Time on page', value: formatDuration(data.session.durationMs) })
    }
  } else if (data.kind === 'event') {
    rows.push(...propertyRows(data.event))
  }
  if (person.initialSource) {
    rows.push({ label: 'Source', value: sourceLabel(person.initialSource) })
  }
  return rows
}

/**
 * One project-timeline card: what happened, who did it, and which
 * connected tool reported it — the same anatomy as the landing page's
 * "It knows everything that happens" showcase.
 */
export function ProjectSessionNodeCard({
  data,
  expanded,
  onToggle,
}: {
  data: ProjectSessionNodeData
  expanded: boolean
  onToggle: () => void
}) {
  const { person } = data
  const { label, detail, tool, at, durationMs } = cardContent(data)
  const trafficSource = person.initialSource
  const rows = detailRows(data)

  const header = (
    <>
      <div className="flex items-start gap-2">
        <PersonAvatar
          seed={person.id}
          name={person.displayName ?? person.primaryEmail}
          size={28}
        />
        <div className="min-w-0 flex-1">
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
          <p className="mt-0.5 truncate text-[11px] leading-tight text-subtle">
            {personName(person)}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 pl-[36px] text-[11px] text-subtle">
        {tool ? (
          <>
            <ConnectionIcon type={tool} size={13} />
            <span className="truncate font-medium text-muted-foreground">
              {connectionName(tool)}
            </span>
          </>
        ) : trafficSource ? (
          // No tool reported this one — fall back to where they came from.
          <>
            <SourceIcon sourceKey={trafficSource} label={trafficSource} size={13} />
            <span className="truncate font-medium text-muted-foreground">
              {sourceLabel(trafficSource)}
            </span>
          </>
        ) : (
          <span>Unknown source</span>
        )}
        <span aria-hidden>·</span>
        <span className="tabular-nums whitespace-nowrap">{formatTime(at)}</span>
        {durationMs != null && (
          <span className="ml-auto shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-muted-foreground">
            {formatDuration(durationMs)}
          </span>
        )}
      </div>
    </>
  )

  const expandedBody = (
    <div className="mt-2 space-y-1.5 border-t border-stroke pt-2 pl-[36px]">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarBlank size={12} weight="bold" className="shrink-0 text-subtle" />
        <span>{whenLine(data)}</span>
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
    </div>
  )

  return (
    <ExpandableTimelineCard
      color={tool ? sourceColor(tool) : FALLBACK_ACCENT}
      expanded={expanded}
      onToggle={onToggle}
      header={header}
      expandedBody={expandedBody}
      maxWidth={PROJECT_SESSION_CARD_WIDTH}
      collapsedHeight={PROJECT_SESSION_CARD_HEIGHT}
    />
  )
}

export function renderProjectSessionNode(props: TimelineRenderNodeProps<ProjectSessionNodeData>) {
  return (
    <ProjectSessionNodeCard
      data={props.node.data}
      expanded={props.expanded}
      onToggle={props.onToggle}
    />
  )
}
