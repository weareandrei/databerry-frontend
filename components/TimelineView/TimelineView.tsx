'use client'

/**
 * Generic vertical time-scaled timeline. Axis + layout use d3; the scroll
 * canvas is virtualized with @tanstack/react-virtual in fixed-height slices
 * so long histories stay responsive.
 */

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { layoutVerticalTimeline, MIN_RANGE_PX, TIMELINE_SLICE_HEIGHT } from './timelineMath'
import { TimelineZoomControl } from './(components)/TimelineZoomControl'
import type { TimelineViewProps } from './types'

const DEFAULT_NODE_WIDTH = 260
const DEFAULT_AXIS_SIZE = 68
const EST_NODE_HEIGHT = 56
const COLUMN_GAP = 10
const CROSS_PAD = 12

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
  style,
  nodeWidth = DEFAULT_NODE_WIDTH,
  axisSize = DEFAULT_AXIS_SIZE,
}: TimelineViewProps<T>) {
  const [zoomUncontrolled, setZoomUncontrolled] = useState(defaultZoom)
  const zoom = zoomProp ?? zoomUncontrolled
  const setZoom = (z: typeof zoom) => {
    onZoomChange?.(z)
    if (zoomProp == null) setZoomUncontrolled(z)
  }

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const measureRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [heights, setHeights] = useState<Map<string, number>>(new Map())

  useLayoutEffect(() => setExpandedId(null), [nodes, zoom])

  const layout = useMemo(
    () =>
      layoutVerticalTimeline(nodes, zoom, heights, {
        nodeWidth,
        columnGap: COLUMN_GAP,
        crossPad: CROSS_PAD,
        estNodeHeight: EST_NODE_HEIGHT,
      }),
    [nodes, zoom, heights, nodeWidth],
  )

  // Measure point nodes (and compact dwell headers); range span comes from the scale.
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    for (const { node, primarySpan } of layout.placed) {
      if (node.endAt != null) {
        next.set(node.id, Math.min(primarySpan, EST_NODE_HEIGHT))
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
  }, [layout.placed, nodes, expandedId])

  const sliceCount = Math.max(1, Math.ceil(layout.primarySize / TIMELINE_SLICE_HEIGHT))

  const virtualizer = useVirtualizer({
    count: sliceCount,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => TIMELINE_SLICE_HEIGHT,
    overscan: 1,
  })

  // Scroll to newest activity when layout stabilises.
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [layout.primarySize, layout.crossSize, zoom, sliceCount])

  if (!isVertical) {
    return (
      <div className={cn('rounded-xl border border-stroke bg-surface p-6 text-sm text-subtle', className)}>
        Horizontal timeline is not implemented yet. Pass <code>isVertical</code> (default).
      </div>
    )
  }

  const contentWidth = axisSize + (showSidebar ? 120 : 0) + layout.crossSize

  return (
    <div className={cn('space-y-3', className)} style={style}>
      {(showZoomControl || headerLeft || headerRight) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {showZoomControl && <TimelineZoomControl zoom={zoom} onChange={setZoom} />}
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
              expanded: expandedId === node.id,
              onToggle: () => {},
              primarySpan: EST_NODE_HEIGHT,
            })}
          </div>
        ))}
      </div>

      <div
        ref={viewportRef}
        className={cn(
          'relative overflow-auto rounded-xl border border-stroke bg-surface',
          'h-[52vh] min-h-[360px] 2xl:h-[calc(100vh_-_300px)]',
          viewportClassName,
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
            const sliceMajors = layout.majors.filter(
              m => m.pos + m.size > sliceTop && m.pos < sliceBottom,
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
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0"
                style={{
                  transform: `translateY(${vSlice.start}px)`,
                  width: contentWidth,
                  height: TIMELINE_SLICE_HEIGHT,
                }}
              >
                {/* Sticky axis band for this slice */}
                <div
                  className="sticky left-0 z-20 float-left bg-surface"
                  style={{ width: axisSize, height: TIMELINE_SLICE_HEIGHT }}
                >
                  {sliceMajors.map((m, i) => (
                    <div
                      key={i}
                      className="absolute right-0 left-0 flex items-start overflow-hidden border-b border-stroke/60 px-1.5 pt-1 text-[10px] font-semibold leading-tight text-muted-foreground"
                      style={{
                        top: m.pos - sliceTop,
                        height: m.size,
                      }}
                    >
                      <span className="line-clamp-2">{m.label}</span>
                    </div>
                  ))}
                  {sliceTicks.map((t, i) => (
                    <div
                      key={i}
                      className={cn(
                        'absolute right-0 flex w-full items-center justify-end pr-1.5 text-[10px] tabular-nums',
                        t.major ? 'font-semibold text-muted-foreground' : 'text-subtle',
                      )}
                      style={{
                        top: t.pos - sliceTop,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>

                <div
                  className="relative"
                  style={{
                    marginLeft: axisSize + (showSidebar ? 120 : 0),
                    width: layout.crossSize,
                    height: TIMELINE_SLICE_HEIGHT,
                  }}
                >
                  {sliceTicks.map((t, i) => (
                    <div
                      key={i}
                      aria-hidden
                      className={cn(
                        'absolute right-0 left-0 h-px',
                        t.major ? 'bg-stroke' : 'bg-stroke/40',
                      )}
                      style={{ top: t.pos - sliceTop }}
                    />
                  ))}

                  {showNow && (
                    <div
                      aria-hidden
                      className="absolute right-0 left-0 z-0 h-px bg-primary"
                      style={{ top: layout.nowPos! - sliceTop }}
                    >
                      <span className="absolute -top-[3px] -left-[3px] h-[7px] w-[7px] rounded-full bg-primary" />
                    </div>
                  )}

                  {sliceNodes.map(({ node, primary, cross, primarySpan }) => {
                    const isRange = node.endAt != null
                    const isExpanded = expandedId === node.id
                    return (
                    <div
                      key={node.id}
                      className="absolute"
                      style={{
                        top: primary - sliceTop,
                        left: cross,
                        width: nodeWidth,
                        height: isRange && !isExpanded ? primarySpan : undefined,
                        minHeight: isRange ? MIN_RANGE_PX : undefined,
                        zIndex: isExpanded ? 30 : 10,
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
  )
}
