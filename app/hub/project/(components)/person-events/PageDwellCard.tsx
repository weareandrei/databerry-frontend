'use client'

import { CalendarBlank } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { ExpandableTimelineCard } from '@/components/TimelineView'
import { cn } from '@/lib/utils'
import {
  connectionName,
  formatFull,
  formatTime,
  propertyRows,
  sourceColor,
} from '../personEventUtils'
import {
  formatDuration,
  type PageDwellSession,
} from '../personPageSessions'
import { PERSON_EVENT_CARD_WIDTH } from './PersonEventCard'

export function PageDwellCard({
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

  const header = (
    <>
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
    </>
  )

  const expandedBody = (
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
  )

  return (
    <ExpandableTimelineCard
      color={color}
      expanded={expanded}
      onToggle={onToggle}
      header={header}
      expandedBody={expandedBody}
      maxWidth={PERSON_EVENT_CARD_WIDTH}
      expandedMinHeight={hasRange ? primarySpan : undefined}
      headerClassName="flex min-h-0 min-w-0 flex-col"
    />
  )
}
