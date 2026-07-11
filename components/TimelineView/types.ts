import type { CSSProperties, ReactNode } from 'react'

export type TimelineZoom = 'day' | 'week' | 'month'

/**
 * Minimal node contract for the generic timeline. Domain wrappers map
 * their API models (e.g. `PersonEvent`) into this shape.
 */
export interface TimelineNode<T = unknown> {
  id: string
  /** Start of a point event, or enter time for a range node. */
  at: string | Date | number
  /** When set, the node spans [at, endAt] on the time axis (dwell bar). */
  endAt?: string | Date | number
  data: T
}

export interface TimelineRenderNodeProps<T> {
  node: TimelineNode<T>
  expanded: boolean
  onToggle: () => void
  /** Pixel height on the time axis (range span or measured card). */
  primarySpan: number
}

/**
 * Generic time-scaled timeline shell.
 *
 * Composition pattern:
 * - **TimelineView** owns axis math (d3), scroll, zoom window, layout,
 *   and virtualization — the parts that are hard to get right.
 * - **renderNode** is the single extension point for card chrome.
 * - **Data fetching** uses `useTimelineNodes` in a domain wrapper
 *   (e.g. `PersonEventsTimeline`) when you need loading/empty/filter
 *   logic around the fetch. Pass resolved `nodes` into TimelineView.
 *   For trivial cases (no pre-render filtering), you may pass `fetchNodes`
 *   via `TimelineViewWithData` instead.
 * - For heavier domain UIs, add a thin wrapper rather than growing
 *   this API with many component props.
 */
export interface TimelineViewProps<T = unknown> {
  nodes: TimelineNode<T>[]
  renderNode: (props: TimelineRenderNodeProps<T>) => ReactNode

  /** Vertical time axis (top → bottom). Horizontal reserved for later. */
  isVertical?: boolean
  /** Optional left lane labels (not used by person events). */
  showSidebar?: boolean
  renderSidebar?: (lane: { id: string; label: ReactNode }) => ReactNode

  zoom?: TimelineZoom
  defaultZoom?: TimelineZoom
  onZoomChange?: (zoom: TimelineZoom) => void
  showZoomControl?: boolean

  headerLeft?: ReactNode
  headerRight?: ReactNode

  className?: string
  viewportClassName?: string
  style?: CSSProperties

  /** Fixed card width used for column packing (px). */
  nodeWidth?: number
  /** Sticky axis width when `isVertical` (px). */
  axisSize?: number
}

/** Props for the fetch-enabled wrapper around `TimelineView`. */
export interface TimelineViewWithDataProps<T> extends Omit<TimelineViewProps<T>, 'nodes'> {
  fetchNodes: (ctx: { signal: AbortSignal }) => Promise<TimelineNode<T>[]>
  /** Refetch when this identity changes (e.g. resource id). */
  fetchKey?: unknown
  enabled?: boolean
  renderLoading?: () => ReactNode
  renderEmpty?: () => ReactNode
}

export interface PlacedTimelineNode<T> {
  node: TimelineNode<T>
  /** Time position on the primary axis (px) — top edge. */
  primary: number
  /** Cross-axis position after overlap packing (px). */
  cross: number
  /** Height on the time axis (px) — dwell span or card height. */
  primarySpan: number
}

export interface TimelineAxisTick {
  pos: number
  label: string
  major: boolean
}

export interface TimelineMajorBand {
  pos: number
  size: number
  label: string
}

export interface TimelineLayout<T> {
  primarySize: number
  crossSize: number
  ticks: TimelineAxisTick[]
  majors: TimelineMajorBand[]
  nowPos: number | null
  placed: PlacedTimelineNode<T>[]
}
