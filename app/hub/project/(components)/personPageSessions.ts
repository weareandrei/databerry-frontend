/**
 * Pair PostHog `$pageview` + `$pageleave` into dwell sessions for the
 * person timeline. Raw events stay in the DB; this runs at display time.
 */

import type { PersonEvent } from '@/lib/api'
import type { TimelineNode } from '@/components/TimelineView'

/** Max gap between view and leave — longer → orphan pageview (point). */
const MAX_DWELL_MS = 30 * 60 * 1000

export interface PageDwellSession {
  kind: 'page_dwell'
  id: string
  path: string
  pageview: PersonEvent
  pageleave: PersonEvent | null
  startedAt: string
  endedAt: string | null
  durationMs: number | null
}

export type PersonTimelineNodeData =
  | { kind: 'event'; event: PersonEvent }
  | PageDwellSession

export function isPageDwell(data: PersonTimelineNodeData): data is PageDwellSession {
  return data.kind === 'page_dwell'
}

function pathFromEvent(ev: PersonEvent): string | null {
  const p = ev.properties ?? {}
  if (typeof p.path === 'string' && p.path.trim()) return p.path.trim()
  return null
}

function normalizePath(path: string): string {
  try {
    if (path.startsWith('http')) return new URL(path).pathname || '/'
  } catch {
    /* keep as-is */
  }
  return path.startsWith('/') ? path : `/${path}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s'
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  if (min < 60) return rem > 0 ? `${min}m ${rem}s` : `${min}m`
  const hr = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${hr}h ${m}m` : `${hr}h`
}

/**
 * Turn raw person events into timeline nodes. Consumes matching
 * pageview/pageleave pairs; everything else stays a point event.
 */
export function eventsToTimelineNodes(
  events: PersonEvent[],
): TimelineNode<PersonTimelineNodeData>[] {
  const sorted = [...events].sort(
    (a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt),
  )

  const openPageviewByPath = new Map<string, PersonEvent>()
  const consumedIds = new Set<string>()
  const nodes: TimelineNode<PersonTimelineNodeData>[] = []

  const flushOpen = (path: string) => {
    const pv = openPageviewByPath.get(path)
    if (!pv) return
    openPageviewByPath.delete(path)
    consumedIds.add(pv.id)
    nodes.push(makeDwellNode(pv, null))
  }

  for (const ev of sorted) {
    const key = ev.eventKey ?? ''
    const rawPath = pathFromEvent(ev)

    if (key === '$pageview' && rawPath) {
      const path = normalizePath(rawPath)
      flushOpen(path)
      openPageviewByPath.set(path, ev)
      continue
    }

    if (key === '$pageleave' && rawPath) {
      const path = normalizePath(rawPath)
      const pv = openPageviewByPath.get(path)
      if (pv) {
        const start = new Date(pv.occurredAt).getTime()
        const end = new Date(ev.occurredAt).getTime()
        const durationMs = end - start
        if (durationMs > 0 && durationMs <= MAX_DWELL_MS) {
          openPageviewByPath.delete(path)
          consumedIds.add(pv.id)
          consumedIds.add(ev.id)
          nodes.push(makeDwellNode(pv, ev))
          continue
        }
      }
      consumedIds.add(ev.id)
      continue
    }

    if (!consumedIds.has(ev.id)) {
      nodes.push({
        id: ev.id,
        at: ev.occurredAt,
        data: { kind: 'event', event: ev },
      })
    }
  }

  for (const path of [...openPageviewByPath.keys()]) {
    flushOpen(path)
  }

  return nodes.sort((a, b) => +new Date(a.at) - +new Date(b.at))
}

function makeDwellNode(
  pageview: PersonEvent,
  pageleave: PersonEvent | null,
): TimelineNode<PersonTimelineNodeData> {
  const startedAt = pageview.occurredAt
  const endedAt = pageleave?.occurredAt ?? null
  const durationMs =
    endedAt != null
      ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
      : null

  const path = normalizePath(pathFromEvent(pageview) ?? '/')

  const session: PageDwellSession = {
    kind: 'page_dwell',
    id: `dwell-${pageview.id}`,
    path,
    pageview,
    pageleave,
    startedAt,
    endedAt,
    durationMs,
  }

  return {
    id: session.id,
    at: startedAt,
    endAt: endedAt ?? undefined,
    data: session,
  }
}
