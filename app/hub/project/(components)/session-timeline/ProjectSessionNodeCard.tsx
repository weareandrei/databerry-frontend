'use client'

import { CalendarBlank } from '@phosphor-icons/react'
import { SourceIcon } from '@/app/hub/(components)/widgets/(components)/SourceIcon'
import { ExpandableTimelineCard } from '@/components/TimelineView'
import type { TimelineRenderNodeProps } from '@/components/TimelineView'
import { PersonAvatar } from '../PersonAvatar'
import { formatDuration } from '../personPageSessions'
import { formatTime } from '../personEventUtils'
import { sourceLabel, type ProjectSessionNodeData } from './projectSessions'

export const PROJECT_SESSION_CARD_WIDTH = 280
/** Fixed collapsed height — every session card is the same size on the axis. */
export const PROJECT_SESSION_CARD_HEIGHT = 72

const ACCENT = 'hsl(var(--primary))'

function personTitle(data: ProjectSessionNodeData): string {
  const person = data.person
  return person.displayName ?? person.primaryEmail ?? 'Unknown person'
}

function personSubtitle(data: ProjectSessionNodeData): string {
  const person = data.person
  if (person.displayName && person.primaryEmail) return person.primaryEmail
  return '\u00a0'
}

export function ProjectSessionNodeCard({
  data,
  expanded,
  onToggle,
}: {
  data: ProjectSessionNodeData
  expanded: boolean
  onToggle: () => void
}) {
  const person = data.person
  const isSession = data.kind === 'session'
  const durationMs = isSession ? data.session.durationMs : null
  const source = person.initialSource
  const occurredAt = isSession ? data.session.startedAt : person.lastSeenAt!

  const header = (
    <>
      <div className="flex items-start gap-2.5">
        <PersonAvatar
          seed={person.id}
          name={person.displayName ?? person.primaryEmail}
          size={32}
        />
        <div className="min-h-[34px] min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground">
              {personTitle(data)}
            </p>
            {durationMs != null && (
              <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {formatDuration(durationMs)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-subtle">
            {personSubtitle(data)}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 pl-[42px] text-[11px] text-subtle">
        {source ? (
          <>
            <SourceIcon sourceKey={source} label={source} size={14} />
            <span className="truncate font-medium text-muted-foreground">{sourceLabel(source)}</span>
          </>
        ) : (
          <span className="text-subtle">Unknown source</span>
        )}
        <span aria-hidden>·</span>
        <span className="tabular-nums whitespace-nowrap">{formatTime(occurredAt)}</span>
      </div>
    </>
  )

  const expandedBody = isSession ? (
    <div className="mt-2 space-y-2 border-t border-stroke pt-2 pl-[42px]">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarBlank size={12} weight="bold" className="text-subtle" />
        <span>
          Entered {formatTime(data.session.startedAt)}
          {data.session.endedAt && (
            <>
              {' '}
              · Left {formatTime(data.session.endedAt)}
            </>
          )}
        </span>
      </div>
      {data.session.path && (
        <p className="truncate text-[11px] font-medium text-foreground">{data.session.path}</p>
      )}
      {durationMs != null && (
        <p className="text-[11px] font-medium text-foreground">
          Session {formatDuration(durationMs)}
        </p>
      )}
    </div>
  ) : (
    <div className="mt-2 border-t border-stroke pt-2 pl-[42px] text-[11px] text-muted-foreground">
      Last seen in this period — no session duration recorded.
    </div>
  )

  return (
    <ExpandableTimelineCard
      color={ACCENT}
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
