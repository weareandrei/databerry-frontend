'use client'

/**
 * Generic vertical time-scaled timeline. Axis + layout use d3; the scroll
 * canvas is virtualized with @tanstack/react-virtual in fixed-height slices
 * so long histories stay responsive.
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { timeFormat } from 'd3-time-format'
import type { DateMode } from '@/types/dates'
import { DateModeControls } from '@/components/DateModeControls'
import { cn } from '@/lib/utils'
import {
  bandPxForZoom,
  layoutVerticalTimeline,
  MIN_RANGE_PX,
  TIMELINE_SLICE_HEIGHT,
} from './timelineMath'
import { TimelineAxisMark } from './(components)/TimelineAxisMark'
import { TimelineNowMark } from './(components)/TimelineNowMark'
import type { TimelineViewProps, TimelineViewportSize, TimelineZoom } from './types'

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

const DEFAULT_NODE_WIDTH = 260
const DEFAULT_AXIS_SIZE = 88
const EST_NODE_HEIGHT = 56
const COLUMN_GAP = 10
const CROSS_PAD = 12

const VIEWPORT_SIZE_CLASS: Record<TimelineViewportSize, string> = {
  default: 'h-[52vh] min-h-[360px] 2xl:h-[calc(100vh_-_300px)]',
  compact: 'h-[42vh] min-h-[280px]',
  fill: 'h-full min-h-0',
}

export function TimelineView<T>({
  nodes,
  renderNode,
  isVertical = true,
  showSidebar = false,
  showZoomControl = true,
  zoom: zoomProp,
  defaultZoom = 'week',
  onZoomChange,
  headerLeft,
  headerRight,
  className,
  viewportClassName,
  viewportSize = 'default',
  style,
  nodeWidth = DEFAULT_NODE_WIDTH,
  axisSize = DEFAULT_AXIS_SIZE,
  estNodeHeight: estNodeHeightProp,
  timeRange,
}: TimelineViewProps<T>) {
  const [zoomUncontrolled, setZoomUncontrolled] = useState(defaultZoom)
  const zoom = zoomProp ?? zoomUncontrolled
  const setZoom = (z: typeof zoom) => {
    onZoomChange?.(z)
    if (zoomProp == null) setZoomUncontrolled(z)
  }

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [focusedDay, setFocusedDay] = useState<Date | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const measureRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [heights, setHeights] = useState<Map<string, number>>(new Map())

  useLayoutEffect(() => {
    setExpandedId(null)
    setFocusedDay(null)
  }, [nodes])

  useLayoutEffect(() => setExpandedId(null), [zoom, focusedDay])

  const handleDayClick = useCallback((day: Date) => {
    const d = new Date(day)
    d.setHours(0, 0, 0, 0)
    setFocusedDay(d)
    setZoom('day')
  }, [setZoom])

  const handleModeChange = useCallback((mode: DateMode) => {
    setFocusedDay(null)
    setZoom(MODE_TO_ZOOM[mode])
  }, [setZoom])

  const estNodeHeight = estNodeHeightProp ?? EST_NODE_HEIGHT

  const layout = useMemo(
    () =>
      layoutVerticalTimeline(nodes, zoom, heights, {
        nodeWidth,
        columnGap: COLUMN_GAP,
        crossPad: CROSS_PAD,
        estNodeHeight,
      }, focusedDay, timeRange),
    [nodes, zoom, heights, nodeWidth, focusedDay, timeRange, estNodeHeight],
  )

  const periodLabel = useMemo(() => {
    if (focusedDay && zoom === 'day') {
      return timeFormat('%A, %B %-d')(focusedDay)
    }
    if (layout.majors.length === 0) return ''
    return layout.majors[layout.majors.length - 1].label
  }, [focusedDay, zoom, layout.majors])

  const dayCellHeights = useMemo(() => {
    const dayTicks = layout.ticks.filter(t => t.variant === 'label' && t.at)
    const bandPx = bandPxForZoom(zoom)
    const heights = new Map<number, number>()
    for (const tick of dayTicks) {
      heights.set(tick.pos, bandPx)
    }
    return heights
  }, [layout.ticks, zoom])

  // Measure collapsed node chrome only — expand must not reflow the timeline.
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    for (const { node, primarySpan } of layout.placed) {
      if (node.endAt != null) {
        next.set(node.id, Math.min(primarySpan, estNodeHeight))
        continue
      }
      const el = measureRefs.current.get(node.id)
      if (el) next.set(node.id, el.offsetHeight)
    }
    if (next.size > 0) {
      setHeights(prev => {
        if (prev.size === next.size && [...next].every(([k, v]) => prev.get(k) === v)) {
          return prev
        }
        return next
      })
    }
  }, [layout.placed, nodes, estNodeHeight])

  const sliceCount = Math.max(1, Math.ceil(layout.primarySize / TIMELINE_SLICE_HEIGHT))

  const virtualizer = useVirtualizer({
    count: sliceCount,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => TIMELINE_SLICE_HEIGHT,
    overscan: 1,
  })

  const userScrolledRef = useRef(false)

  // Reset "user scrolled" when the dataset or zoom context changes.
  useLayoutEffect(() => {
    userScrolledRef.current = false
  }, [nodes, zoom, focusedDay, timeRange?.from, timeRange?.to])

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onScroll = () => {
      userScrolledRef.current = true
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Jump to newest activity only when nodes/zoom/focused day change — not
  // when height remeasurement refines layout (that was fighting user scroll).
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el || userScrolledRef.current) return
    el.scrollTop = focusedDay ? 0 : el.scrollHeight
  }, [nodes, zoom, focusedDay, timeRange?.from, timeRange?.to])

  if (!isVertical) {
    return (
      <div className={cn('rounded-xl border border-stroke bg-surface p-6 text-sm text-subtle', className)}>
        Horizontal timeline is not implemented yet. Pass <code>isVertical</code> (default).
      </div>
    )
  }

  const contentWidth = axisSize + (showSidebar ? 120 : 0) + layout.crossSize
  const isFill = viewportSize === 'fill'

  return (
    <div
      className={cn(isFill ? 'flex min-h-0 flex-1 flex-col' : 'space-y-3', className)}
      style={style}
    >
      {(showZoomControl || headerLeft || headerRight) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {showZoomControl && (
              <DateModeControls
                value={ZOOM_TO_MODE[zoom]}
                onChange={handleModeChange}
              />
            )}
            {headerLeft}
          </div>
          {headerRight}
        </div>
      )}

      {/* Hidden measure pass — keeps packing accurate without painting all slices. */}
      <div
        aria-hidden
        className="pointer-events-none invisible fixed top-0 left-[-10000px] w-max"
      >
        {nodes
          .filter(node => node.endAt == null)
          .map(node => (
          <div
            key={node.id}
            ref={el => {
              if (el) measureRefs.current.set(node.id, el)
              else measureRefs.current.delete(node.id)
            }}
            style={{ width: nodeWidth }}
          >
            {renderNode({
              node,
              expanded: false,
              onToggle: () => {},
              primarySpan: EST_NODE_HEIGHT,
            })}
          </div>
        ))}
      </div>

      <div className={cn('relative', isFill && 'flex min-h-0 flex-1 flex-col')}>
        {periodLabel ? (
          <div className="pointer-events-none absolute top-3 right-3 z-30">
            <span className="text-lg font-semibold text-primary">{periodLabel}</span>
          </div>
        ) : null}
        <div
          ref={viewportRef}
          className={cn(
            'relative overflow-auto rounded-xl border border-stroke bg-white',
            isFill
              ? 'min-h-0 flex-1'
              : (viewportClassName ?? VIEWPORT_SIZE_CLASS[viewportSize]),
          )}
        >
        <div
          className="relative"
          style={{
            height: virtualizer.getTotalSize(),
            width: contentWidth,
            minWidth: '100%',
          }}
        >
          {virtualizer.getVirtualItems().map(vSlice => {
            const sliceTop = vSlice.index * TIMELINE_SLICE_HEIGHT
            const sliceBottom = sliceTop + TIMELINE_SLICE_HEIGHT

            const sliceTicks = layout.ticks.filter(
              t => t.pos >= sliceTop - 2 && t.pos < sliceBottom + 2,
            )
            const sliceNodes = layout.placed.filter(
              p =>
                p.primary + p.primarySpan > sliceTop - COLUMN_GAP &&
                p.primary < sliceBottom + COLUMN_GAP,
            )

            const showNow =
              layout.nowPos != null &&
              layout.nowPos >= sliceTop &&
              layout.nowPos < sliceBottom

            return (
              <div
                key={vSlice.key}
                data-index={vSlice.index}
                className="absolute top-0 left-0 flex"
                style={{
                  transform: `translateY(${vSlice.start}px)`,
                  width: contentWidth,
                  height: TIMELINE_SLICE_HEIGHT,
                }}
              >
                {showNow && (
                  <TimelineNowMark
                    top={layout.nowPos! - sliceTop}
                    axisSize={axisSize}
                  />
                )}

                {/* Sticky time axis — flex sibling (not float) so node columns
                    never collapse into the date rail. z-40 keeps the rail above
                    scrolling / expanded cards. */}
                <div
                  className="sticky left-0 z-40 shrink-0 border-r border-stroke/40 bg-white"
                  style={{ width: axisSize, height: TIMELINE_SLICE_HEIGHT }}
                >
                  {sliceTicks.map((t, i) => {
                    const isDayCell =
                      zoom !== 'day' && t.variant === 'label' && t.at != null
                    const cellHeight = isDayCell ? dayCellHeights.get(t.pos) : undefined

                    return (
                    <div
                      key={`${t.pos}-${i}`}
                      className={cn(
                        'absolute inset-x-0 overflow-hidden',
                        !isDayCell && 'flex items-center justify-center',
                      )}
                      style={{
                        top: t.pos - sliceTop,
                        height: isDayCell ? cellHeight : undefined,
                        transform:
                          !isDayCell && t.variant === 'label'
                            ? 'translateY(-50%)'
                            : undefined,
                      }}
                    >
                      <TimelineAxisMark
                        tick={t}
                        fullCell={isDayCell}
                        onDayClick={
                          zoom !== 'day' && t.at ? handleDayClick : undefined
                        }
                      />
                    </div>
                    )
                  })}
                </div>

                {showSidebar ? (
                  <div
                    className="sticky shrink-0 border-r border-stroke/40 bg-white"
                    style={{ width: 120, height: TIMELINE_SLICE_HEIGHT }}
                  />
                ) : null}

                <div
                  className="relative shrink-0 overflow-visible"
                  style={{
                    width: layout.crossSize,
                    height: TIMELINE_SLICE_HEIGHT,
                  }}
                >
                  {sliceTicks
                    .filter(t => t.variant === 'label')
                    .map((t, i) => (
                    <div
                      key={i}
                      aria-hidden
                      className="absolute right-0 left-0 h-px bg-stroke/25"
                      style={{ top: t.pos - sliceTop }}
                    />
                  ))}

                  {sliceNodes.map(({ node, primary, cross, primarySpan }) => {
                    const isRange = node.endAt != null
                    const isExpanded = expandedId === node.id
                    return (
                    <div
                      key={node.id}
                      className="absolute overflow-visible"
                      style={{
                        top: primary - sliceTop,
                        left: cross,
                        width: nodeWidth,
                        height: primarySpan,
                        minHeight: isRange ? MIN_RANGE_PX : undefined,
                        zIndex: isExpanded ? 20 : 10,
                      }}
                    >
                      {renderNode({
                        node,
                        expanded: expandedId === node.id,
                        onToggle: () =>
                          setExpandedId(cur => (cur === node.id ? null : node.id)),
                        primarySpan,
                      })}
                    </div>
                  )})}
                </div>
              </div>
            )
          })}
        </div>
        </div>
      </div>
    </div>
  )
}
