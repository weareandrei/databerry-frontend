'use client'

import { CalendarBlank } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { ExpandableTimelineCard } from '@/components/TimelineView'
import type { PersonEvent } from '@/lib/api'
import {
  connectionName,
  detailFor,
  formatFull,
  formatTime,
  propertyRows,
  sourceColor,
} from '../personEventUtils'

export const PERSON_EVENT_CARD_WIDTH = 260

export function PersonEventCard({
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
  const rows = propertyRows(ev)

  const header = (
    <>
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
    </>
  )

  const expandedBody = (
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
        <p className="truncate pt-0.5 font-mono text-[10px] text-subtle">{ev.eventKey}</p>
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
    />
  )
}
