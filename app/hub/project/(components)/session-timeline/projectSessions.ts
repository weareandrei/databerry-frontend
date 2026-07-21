/**
 * Map people + their events into project-wide session timeline nodes.
 * Pairs pageview/pageleave dwell sessions where possible; falls back to
 * a point node at last-seen when no session detail exists in range.
 */

import type { PersonEvent, PersonRow } from '@/lib/api'
import type { TimelineNode } from '@/components/TimelineView'
import {
  eventsToTimelineNodes,
  isPageDwell,
  type PageDwellSession,
} from '../personPageSessions'

export type ProjectSessionNodeData =
  | { kind: 'session'; person: PersonRow; session: PageDwellSession }
  | { kind: 'visit'; person: PersonRow }

const MAX_PEOPLE = 75
const EVENT_FETCH_CONCURRENCY = 6

function parseDayStart(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getTime()
}

function parseDayEnd(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999`).getTime()
}

export function isInDateRange(
  at: string | Date | number,
  dateFrom: string,
  dateTo: string,
): boolean {
  const t = at instanceof Date ? at.getTime() : new Date(at).getTime()
  if (!Number.isFinite(t)) return false
  return t >= parseDayStart(dateFrom) && t <= parseDayEnd(dateTo)
}

function sourceLabel(src: string): string {
  return src === 'direct' ? 'Direct' : src
}

export { sourceLabel }

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const i = index++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

export function personSessionsToTimelineNodes(
  person: PersonRow,
  events: PersonEvent[],
  dateFrom: string,
  dateTo: string,
): TimelineNode<ProjectSessionNodeData>[] {
  const inRangeEvents = events.filter(e => isInDateRange(e.occurredAt, dateFrom, dateTo))
  const mapped = eventsToTimelineNodes(inRangeEvents)
  const nodes: TimelineNode<ProjectSessionNodeData>[] = []

  for (const n of mapped) {
    if (isPageDwell(n.data)) {
      nodes.push({
        id: `${person.id}-${n.id}`,
        at: n.at,
        data: { kind: 'session', person, session: n.data },
      })
    }
  }

  if (
    nodes.length === 0 &&
    person.lastSeenAt &&
    isInDateRange(person.lastSeenAt, dateFrom, dateTo)
  ) {
    nodes.push({
      id: `${person.id}-visit`,
      at: person.lastSeenAt,
      data: { kind: 'visit', person },
    })
  }

  return nodes
}

export async function fetchProjectSessionNodes(
  fetchPeople: () => Promise<PersonRow[]>,
  fetchPersonEvents: (personId: string) => Promise<PersonEvent[]>,
  dateFrom: string,
  dateTo: string,
  signal?: AbortSignal,
): Promise<TimelineNode<ProjectSessionNodeData>[]> {
  const people = await fetchPeople()
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const activePeople = people
    .filter(p => p.lastSeenAt && isInDateRange(p.lastSeenAt, dateFrom, dateTo))
    .slice(0, MAX_PEOPLE)

  const perPerson = await mapWithConcurrency(
    activePeople,
    EVENT_FETCH_CONCURRENCY,
    async person => {
      const events = await fetchPersonEvents(person.id)
      return personSessionsToTimelineNodes(person, events, dateFrom, dateTo)
    },
    signal,
  )

  return perPerson
    .flat()
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))
}
