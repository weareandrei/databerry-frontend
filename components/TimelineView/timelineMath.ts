import { scaleTime } from 'd3-scale'
import { timeHour, timeDay, timeMonth, timeMinute, type CountableTimeInterval } from 'd3-time'
import { timeFormat } from 'd3-time-format'
import type {
  PlacedTimelineNode,
  TimelineAxisTick,
  TimelineLayout,
  TimelineMajorBand,
  TimelineNode,
  TimelineZoom,
} from './types'

const hourLabel24 = (d: Date) => timeFormat('%H:%M')(d)

const dayNumberLabel = (d: Date) => timeFormat('%-d')(d)
const monthAbbrevLabel = (d: Date) => timeFormat('%b')(d)
const weekdayAbbrevLabel = (d: Date) => timeFormat('%a')(d)

interface ZoomConfig {
  base: CountableTimeInterval
  basePx: number
  tickEvery: number
  major: CountableTimeInterval
  frame: CountableTimeInterval
  padStart: number
  padEnd: number
  minorLabel: (d: Date) => string
  majorLabel: (d: Date) => string
}

const ZOOMS: Record<TimelineZoom, ZoomConfig> = {
  day: {
    base: timeHour,
    basePx: 96,
    tickEvery: 1,
    major: timeDay,
    frame: timeDay,
    padStart: 0,
    padEnd: 0,
    minorLabel: hourLabel24,
    majorLabel: timeFormat('%A, %B %-d'),
  },
  week: {
    base: timeDay,
    basePx: 140,
    tickEvery: 1,
    major: timeMonth,
    frame: timeDay,
    padStart: 1,
    padEnd: 2,
    minorLabel: dayNumberLabel,
    majorLabel: timeFormat('%B'),
  },
  month: {
    base: timeDay,
    basePx: 80,
    tickEvery: 1,
    major: timeMonth,
    frame: timeMonth,
    padStart: 0,
    padEnd: 0,
    minorLabel: dayNumberLabel,
    majorLabel: timeFormat('%Y'),
  },
}

function toDate(at: string | Date | number): Date {
  return at instanceof Date ? at : new Date(at)
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

export function computeVisibleWindow<T>(
  nodes: TimelineNode<T>[],
  zoom: TimelineZoom,
  focusedDay?: Date | null,
  timeRange?: { from: string | Date; to: string | Date },
): { start: Date; end: Date } {
  if (focusedDay && zoom === 'day') {
    const start = startOfDay(focusedDay)
    return { start, end: addDays(start, 1) }
  }

  if (timeRange) {
    const start = startOfDay(toDate(timeRange.from))
    const end = addDays(startOfDay(toDate(timeRange.to)), 1)
    return { start, end }
  }

  if (nodes.length === 0) {
    const now = startOfDay(new Date())
    return { start: addDays(now, -1), end: addDays(now, 2) }
  }

  const times: number[] = []
  for (const n of nodes) {
    const t = toDate(n.at).getTime()
    if (!Number.isNaN(t)) times.push(t)
    if (n.endAt != null) {
      const e = toDate(n.endAt).getTime()
      if (!Number.isNaN(e)) times.push(e)
    }
  }
  const min = new Date(Math.min(...times))
  const max = new Date(Math.max(...times))

  switch (zoom) {
    case 'day':
      return { start: startOfDay(min), end: addDays(startOfDay(max), 1) }
    case 'week':
      return { start: addDays(startOfDay(min), -1), end: addDays(startOfDay(max), 2) }
    case 'month':
      return {
        start: new Date(min.getFullYear(), min.getMonth(), 1),
        end: new Date(max.getFullYear(), max.getMonth() + 1, 1),
      }
  }
}

/** Keep nodes that overlap a single calendar day. */
export function filterNodesForDay<T>(nodes: TimelineNode<T>[], day: Date): TimelineNode<T>[] {
  const start = startOfDay(day).getTime()
  const end = addDays(startOfDay(day), 1).getTime()
  return nodes.filter(n => {
    const t = toDate(n.at).getTime()
    const e = n.endAt != null ? toDate(n.endAt).getTime() : t
    return e >= start && t < end
  })
}

interface ScaledItem<T> {
  node: TimelineNode<T>
  primary: number
  primarySpan: number
}

/** Week/month: one fixed-height band per day — avoids fractional scale overlap. */
function linearDayScale(
  rangeStart: Date,
  bandPx: number,
  base: CountableTimeInterval,
) {
  return (d: Date) => {
    const dayStart = base.floor(d)
    const dayIdx = base.count(rangeStart, dayStart)
    const bandEnd = base.offset(dayStart, 1)
    const bandMs = +bandEnd - +dayStart
    if (bandMs <= 0) return dayIdx * bandPx
    const msInto = +d - +dayStart
    return dayIdx * bandPx + (msInto / bandMs) * bandPx
  }
}

function buildScale<T>(
  nodes: TimelineNode<T>[],
  zoom: TimelineZoom,
  focusedDay?: Date | null,
  timeRange?: { from: string | Date; to: string | Date },
) {
  const cfg = ZOOMS[zoom]
  const { start, end } = computeVisibleWindow(nodes, zoom, focusedDay, timeRange)

  let rangeStart = cfg.frame.floor(start)
  let rangeEnd = cfg.frame.ceil(end)
  rangeStart = cfg.base.offset(rangeStart, -cfg.padStart)
  rangeEnd = cfg.base.offset(rangeEnd, cfg.padEnd)
  if (rangeEnd <= rangeStart) rangeEnd = cfg.base.offset(rangeStart, 1)

  // Align scale to the exclusive tick end so every day band is exactly basePx.
  const tickEnd = cfg.base.offset(rangeEnd, 1)

  const majorStarts = new Set(
    cfg.major.range(cfg.major.floor(rangeStart), rangeEnd).map(d => +d),
  )

  if (zoom === 'day') {
    const baseUnits = Math.max(1, cfg.base.count(rangeStart, tickEnd))
    const primarySize = baseUnits * cfg.basePx
    const scale = scaleTime().domain([rangeStart, tickEnd]).range([0, primarySize])

    const ticks: TimelineAxisTick[] = timeMinute
      .range(rangeStart, tickEnd, 15)
      .map(d => {
        const isHour = d.getMinutes() === 0
        return {
          pos: scale(d),
          primaryLabel: isHour ? hourLabel24(d) : undefined,
          variant: isHour ? 'label' : 'dash',
          major: isHour && majorStarts.has(+cfg.major.floor(d)) && +cfg.major.floor(d) === +d,
        }
      })

    const majors: TimelineMajorBand[] = cfg.major
      .range(cfg.major.floor(rangeStart), rangeEnd)
      .map(m => {
        const segStart = +m < +rangeStart ? rangeStart : m
        const next = cfg.major.offset(m, 1)
        const segEnd = +next > +rangeEnd ? rangeEnd : next
        const pos = scale(segStart)
        return { pos, size: scale(segEnd) - pos, label: cfg.majorLabel(m) }
      })

    const items = mapScaledItems(nodes, scale)
    const now = Date.now()
    const nowPos =
      now >= +rangeStart && now < +tickEnd ? scale(new Date(now)) : null

    return { primarySize, ticks, majors, nowPos, items, scale }
  }

  // Week / month — integer day bands for uniform sidebar rows.
  const dayDates = cfg.base.range(rangeStart, tickEnd, cfg.tickEvery)
  const primarySize = Math.max(dayDates.length, 1) * cfg.basePx
  const scale = linearDayScale(rangeStart, cfg.basePx, cfg.base)

  const ticks: TimelineAxisTick[] = dayDates.map((d, i) => ({
    pos: i * cfg.basePx,
    at: d,
    primaryLabel: cfg.minorLabel(d),
    accentLabel:
      zoom === 'month' ? monthAbbrevLabel(d) : weekdayAbbrevLabel(d),
    variant: 'label' as const,
    major: majorStarts.has(+cfg.major.floor(d)) && +cfg.major.floor(d) === +d,
  }))

  const majors: TimelineMajorBand[] = cfg.major
    .range(cfg.major.floor(rangeStart), rangeEnd)
    .map(m => {
      const segStart = +m < +rangeStart ? rangeStart : m
      const next = cfg.major.offset(m, 1)
      const segEnd = +next > +rangeEnd ? rangeEnd : next
      const startIdx = cfg.base.count(rangeStart, cfg.base.floor(segStart))
      const endIdx = cfg.base.count(rangeStart, cfg.base.floor(segEnd))
      return {
        pos: startIdx * cfg.basePx,
        size: Math.max((endIdx - startIdx) * cfg.basePx, cfg.basePx),
        label: cfg.majorLabel(m),
      }
    })

  const items = mapScaledItems(nodes, scale)
  const now = Date.now()
  const nowPos =
    now >= +rangeStart && now < +tickEnd ? scale(new Date(now)) : null

  return { primarySize, ticks, majors, nowPos, items, scale }
}

function mapScaledItems<T>(
  nodes: TimelineNode<T>[],
  scale: (d: Date) => number,
): ScaledItem<T>[] {
  return [...nodes]
    .sort((a, b) => +toDate(a.at) - +toDate(b.at))
    .map(node => {
      const primary = scale(toDate(node.at))
      let primarySpan = MIN_RANGE_PX
      if (node.endAt != null) {
        const end = scale(toDate(node.endAt))
        primarySpan = Math.max(end - primary, MIN_RANGE_PX)
      }
      return { node, primary, primarySpan }
    })
}

/** Pixel height of one day/week/month band on the time axis. */
export function bandPxForZoom(zoom: TimelineZoom): number {
  return ZOOMS[zoom].basePx
}

/** Greedy column packing for vertical layout (time on Y, columns on X). */
export function layoutVerticalTimeline<T>(
  nodes: TimelineNode<T>[],
  zoom: TimelineZoom,
  heights: Map<string, number>,
  opts: {
    nodeWidth: number
    columnGap: number
    crossPad: number
    estNodeHeight: number
  },
  focusedDay?: Date | null,
  timeRange?: { from: string | Date; to: string | Date },
): TimelineLayout<T> {
  const scoped =
    focusedDay && zoom === 'day' ? filterNodesForDay(nodes, focusedDay) : nodes
  const { primarySize, ticks, majors, nowPos, items } = buildScale(
    scoped,
    zoom,
    focusedDay,
    timeRange,
  )
  const columnPitch = opts.nodeWidth + opts.columnGap

  const columnBottoms: number[] = []
  const placed: PlacedTimelineNode<T>[] = []
  let maxCross = opts.crossPad

  for (const { node, primary, primarySpan: timeSpan } of items) {
    const isRange = node.endAt != null
    const measured = heights.get(node.id) ?? opts.estNodeHeight
    const primarySpan = isRange ? timeSpan : measured

    let col = columnBottoms.findIndex(bottom => bottom <= primary - opts.columnGap)
    if (col === -1) {
      col = columnBottoms.length
      columnBottoms.push(primary + primarySpan)
    } else {
      columnBottoms[col] = primary + primarySpan
    }
    const cross = opts.crossPad + col * columnPitch
    placed.push({ node, primary, cross, primarySpan })
    maxCross = Math.max(maxCross, cross + opts.nodeWidth)
  }

  return {
    primarySize: primarySize + 20,
    crossSize: maxCross + opts.crossPad,
    ticks,
    majors,
    nowPos,
    placed,
  }
}

export const TIMELINE_SLICE_HEIGHT = 400
/** Minimum pixel height for range (dwell) nodes on the axis. */
export const MIN_RANGE_PX = 36
