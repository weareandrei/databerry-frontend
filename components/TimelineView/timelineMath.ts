import { scaleTime } from 'd3-scale'
import { timeHour, timeDay, timeMonth, type CountableTimeInterval } from 'd3-time'
import { timeFormat } from 'd3-time-format'
import type {
  PlacedTimelineNode,
  TimelineAxisTick,
  TimelineLayout,
  TimelineMajorBand,
  TimelineNode,
  TimelineZoom,
} from './types'

const hourLabel = (d: Date) =>
  `${timeFormat('%-I')(d)}${timeFormat('%p')(d).toLowerCase()}`

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
    basePx: 36,
    tickEvery: 2,
    major: timeDay,
    frame: timeDay,
    padStart: 0,
    padEnd: 0,
    minorLabel: hourLabel,
    majorLabel: timeFormat('%A, %B %-d'),
  },
  week: {
    base: timeDay,
    basePx: 120,
    tickEvery: 1,
    major: timeMonth,
    frame: timeDay,
    padStart: 1,
    padEnd: 2,
    minorLabel: timeFormat('%a %-d'),
    majorLabel: timeFormat('%B %Y'),
  },
  month: {
    base: timeDay,
    basePx: 44,
    tickEvery: 1,
    major: timeMonth,
    frame: timeMonth,
    padStart: 0,
    padEnd: 0,
    minorLabel: timeFormat('%-d'),
    majorLabel: timeFormat('%B %Y'),
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
): { start: Date; end: Date } {
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

interface ScaledItem<T> {
  node: TimelineNode<T>
  primary: number
  primarySpan: number
}

function buildScale<T>(nodes: TimelineNode<T>[], zoom: TimelineZoom) {
  const cfg = ZOOMS[zoom]
  const { start, end } = computeVisibleWindow(nodes, zoom)

  let rangeStart = cfg.frame.floor(start)
  let rangeEnd = cfg.frame.ceil(end)
  rangeStart = cfg.base.offset(rangeStart, -cfg.padStart)
  rangeEnd = cfg.base.offset(rangeEnd, cfg.padEnd)
  if (rangeEnd <= rangeStart) rangeEnd = cfg.base.offset(rangeStart, 1)

  const baseUnits = Math.max(1, cfg.base.count(rangeStart, rangeEnd))
  const primarySize = baseUnits * cfg.basePx
  const scale = scaleTime().domain([rangeStart, rangeEnd]).range([0, primarySize])

  const tickDates = cfg.base.range(rangeStart, cfg.base.offset(rangeEnd, 1), cfg.tickEvery)
  const majorStarts = new Set(
    cfg.major.range(cfg.major.floor(rangeStart), rangeEnd).map(d => +d),
  )
  const ticks: TimelineAxisTick[] = tickDates.map(d => ({
    pos: scale(d),
    label: cfg.minorLabel(d),
    major: majorStarts.has(+cfg.major.floor(d)) && +cfg.major.floor(d) === +d,
  }))

  const majors: TimelineMajorBand[] = cfg.major
    .range(cfg.major.floor(rangeStart), rangeEnd)
    .map(m => {
      const segStart = +m < +rangeStart ? rangeStart : m
      const next = cfg.major.offset(m, 1)
      const segEnd = +next > +rangeEnd ? rangeEnd : next
      const pos = scale(segStart)
      return { pos, size: scale(segEnd) - pos, label: cfg.majorLabel(m) }
    })

  const items: ScaledItem<T>[] = [...nodes]
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

  const now = Date.now()
  const nowPos =
    now >= +rangeStart && now <= +rangeEnd ? scale(new Date(now)) : null

  return { primarySize, ticks, majors, nowPos, items, scale }
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
): TimelineLayout<T> {
  const { primarySize, ticks, majors, nowPos, items } = buildScale(nodes, zoom)
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
