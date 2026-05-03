'use client'

import Image from 'next/image'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Bar,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { OverviewBucket, OverviewChartResponse } from '@/lib/api'
import { sourceStyle } from '@/constants/trafficSources'
import type { OverviewPrimaryMetric, OverviewSecondaryMetric } from '@/types/view'

interface OverviewChartProps {
  data: OverviewChartResponse
  primaryMetric: OverviewPrimaryMetric
  secondaryMetric: OverviewSecondaryMetric
  /**
   * Label of the bucket that contains "right now", or null when the current
   * range doesn't cover the present. Must match one of the bucket labels
   * produced by the backend's buildBuckets (Recharts matches on equality
   * for categorical axes). Unknown labels silently no-op.
   */
  nowLabel?: string | null
}

const SECONDARY_COLOR = '#F46719' // brand orange — overlay line
const SEGMENT_GAP_Y = 3 // vertical gap (px) between stacked segments
const SEGMENT_RADIUS = 3 // corner radius (px) for each rounded rectangle
const TOOLTIP_WIDTH_ESTIMATE = 240 // used for edge-clamping; the actual card may be wider but this is a safe minimum.

// --- Source key metadata attached to each stacked Bar --------------------------
interface SourceKeyMeta {
  key: string
  color: string
  label: string
  outlined?: boolean
  logo?: string
}

// --- Hover state ---------------------------------------------------------------
// `bar` = cursor is somewhere in a bucket's column but not over a specific
// coloured segment (whitespace above the stack, spacing between segments, etc.).
// `segment` = cursor is over one specific coloured segment. Segment mode is set
// by the segment's own mouse handlers; bar mode is set by recharts' chart-level
// onMouseMove (`activeTooltipIndex`) as a fallback.
type HoverState =
  | null
  | { kind: 'bar'; bucketIndex: number; mouseX: number; mouseY: number }
  | { kind: 'segment'; bucketIndex: number; sourceKey: string; mouseX: number; mouseY: number }

// Flatten buckets into rows consumable by recharts stacked bars.
// Each bucket becomes one data row: { label, secondary, src_<key>: value, ... }
function buildRows(
  buckets: OverviewBucket[],
): { rows: Array<Record<string, string | number | null>>; sourceKeys: SourceKeyMeta[] } {
  const keySet = new Map<string, SourceKeyMeta>()
  for (const b of buckets) {
    for (const s of b.bySource) {
      if (!keySet.has(s.source)) {
        const style = sourceStyle(s.source, s.label)
        keySet.set(s.source, {
          key: s.source,
          color: style.color,
          label: style.label,
          outlined: style.outlined,
          logo: style.logo,
        })
      }
    }
  }
  const sourceKeys = Array.from(keySet.values())

  const rows = buckets.map(b => {
    const row: Record<string, string | number | null> = {
      label: b.label,
      secondary: b.secondary,
    }
    for (const sk of sourceKeys) {
      const match = b.bySource.find(x => x.source === sk.key)
      row[`src_${sk.key}`] = match ? match.value : 0
    }
    return row
  })

  return { rows, sourceKeys }
}

function computeYMax(
  rows: Array<Record<string, string | number | null>>,
  sourceKeys: SourceKeyMeta[],
): number {
  let max = 0
  for (const row of rows) {
    let total = 0
    for (const sk of sourceKeys) {
      const v = row[`src_${sk.key}`]
      if (typeof v === 'number') total += v
    }
    if (total > max) max = total
  }
  if (max <= 0) return 4
  return Math.max(4, Math.ceil(max / 4) * 4)
}

// --- Metric label + value formatting ------------------------------------------
function primaryLabel(m: OverviewPrimaryMetric): string {
  switch (m) {
    case 'visitors':    return 'Visitors'
    case 'pageviews':   return 'Pageviews'
    case 'conversions': return 'Conversions'
    case 'revenue':     return 'Revenue'
  }
}

// Revenue values arrive already-in-dollars from the backend
// (project-overview.service.ts converts Stripe's cents → dollars before
// stuffing them into `byBucketTotal` / `bySecondary`). Dividing again here
// produced the `$0.21` bug where tooltip and y-axis disagreed by 100×.
function formatPrimary(v: number, m: OverviewPrimaryMetric): string {
  if (m === 'revenue') return formatDollars(v)
  return v.toLocaleString()
}

function formatDollars(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Short-form dollars for axis ticks: "$30", "$1.5k". */
function formatDollarsShort(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${Math.round(v)}`
}

function secondaryLabel(m: Exclude<OverviewSecondaryMetric, null>): string {
  switch (m) {
    case 'conversion_rate': return 'Conversion rate'
    case 'bounce_rate':     return 'Bounce rate'
    case 'avg_session_sec': return 'Avg. session'
    case 'revenue':         return 'Revenue'
  }
}

function formatSecondaryValue(v: number, m: Exclude<OverviewSecondaryMetric, null>): string {
  switch (m) {
    case 'conversion_rate':
    case 'bounce_rate':
      return `${(v * 100).toFixed(1)}%`
    case 'avg_session_sec': {
      const min = Math.floor(v / 60)
      const sec = Math.round(v % 60)
      return `${min}m ${sec}s`
    }
    case 'revenue':
      // Same rationale as formatPrimary — already in dollars.
      return formatDollars(v)
  }
}

// --- Source swatch (logo-or-colour-dot, shared between both tooltip modes) ----
function SourceSwatch({ meta, size = 12 }: { meta: SourceKeyMeta; size?: number }) {
  if (meta.logo) {
    return (
      <Image
        src={meta.logo}
        alt={meta.label}
        width={size}
        height={size}
        className="rounded-sm shrink-0"
      />
    )
  }
  return (
    <span
      className="inline-block rounded-sm shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: meta.color,
        border: meta.outlined ? '1px solid #d1d5db' : undefined,
      }}
    />
  )
}

// --- Bar-mode tooltip: everything we know about the bucket --------------------
interface BarTooltipProps {
  bucket: OverviewBucket
  sourceKeys: SourceKeyMeta[]
  primaryMetric: OverviewPrimaryMetric
  secondaryMetric: OverviewSecondaryMetric
}

function BarTooltipCard({ bucket, sourceKeys, primaryMetric, secondaryMetric }: BarTooltipProps) {
  const total = bucket.bySource.reduce((acc, s) => acc + s.value, 0)
  const secondary = bucket.secondary
  const hasSecondary = secondary != null && secondaryMetric != null

  // Derived: revenue-per-visitor is the only cross-metric ratio that makes sense
  // with current data (primary=visitors + secondary=revenue). More can be added
  // here as new metric combinations are introduced.
  const showRevPerVisitor =
    primaryMetric === 'visitors' &&
    secondaryMetric === 'revenue' &&
    hasSecondary &&
    total > 0

  const sourcesSorted = bucket.bySource
    .filter(s => s.value > 0)
    .slice()
    .sort((a, b) => b.value - a.value)

  return (
    <div className="rounded-lg border border-stroke bg-white shadow-card overflow-hidden min-w-[220px] text-xs">
      {/* Date header */}
      <div className="px-3 py-2 border-b border-stroke">
        <p className="text-[11px] uppercase tracking-wide text-grey-light">{bucket.label}</p>
      </div>

      {/* Primary + secondary metric summary */}
      <div className="px-3 py-2 border-b border-stroke space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-grey-darkest shrink-0" />
            <span className="text-grey-darkest font-medium">{primaryLabel(primaryMetric)}</span>
          </div>
          <span className="tabular-nums font-semibold text-grey-darkest">
            {formatPrimary(total, primaryMetric)}
          </span>
        </div>
        {hasSecondary && (
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: SECONDARY_COLOR }}
              />
              <span className="text-grey-darkest font-medium">{secondaryLabel(secondaryMetric)}</span>
            </div>
            <span className="tabular-nums font-semibold text-grey-darkest">
              {formatSecondaryValue(secondary, secondaryMetric)}
            </span>
          </div>
        )}
      </div>

      {/* Sources breakdown */}
      {sourcesSorted.length > 0 && (
        <ul className="px-3 py-2 space-y-1">
          {sourcesSorted.map(s => {
            const meta =
              sourceKeys.find(sk => sk.key === s.source) ?? {
                key: s.source,
                label: s.label ?? s.source,
                color: sourceStyle(s.source).color,
                outlined: sourceStyle(s.source).outlined,
                logo: sourceStyle(s.source).logo,
              }
            return (
              <li key={s.source} className="flex items-center gap-2">
                <SourceSwatch meta={meta} size={10} />
                <span className="text-grey-dark flex-1 truncate">{meta.label}</span>
                <span className="tabular-nums text-grey-darkest">
                  {s.value.toLocaleString()}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Derived metric footer */}
      {showRevPerVisitor && secondary != null && (
        <div className="px-3 py-2 border-t border-stroke flex items-center justify-between">
          <span className="text-grey-light">Revenue / visitor</span>
          <span className="tabular-nums font-semibold text-grey-darkest">
            ${(secondary / total / 100).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}

// --- Segment-mode tooltip: just the one source for that bucket ----------------
interface SegmentTooltipProps {
  bucket: OverviewBucket
  sourceKey: string
  sourceKeys: SourceKeyMeta[]
}

function SegmentTooltipCard({ bucket, sourceKey, sourceKeys }: SegmentTooltipProps) {
  const source = bucket.bySource.find(s => s.source === sourceKey)
  if (!source) return null
  const meta =
    sourceKeys.find(sk => sk.key === sourceKey) ?? {
      key: sourceKey,
      label: source.label ?? sourceKey,
      color: sourceStyle(sourceKey).color,
      outlined: sourceStyle(sourceKey).outlined,
      logo: sourceStyle(sourceKey).logo,
    }
  const total = bucket.bySource.reduce((a, s) => a + s.value, 0)
  const share = total > 0 ? source.value / total : 0

  return (
    <div className="rounded-lg border border-stroke bg-white shadow-card overflow-hidden min-w-[200px] text-xs">
      <div className="px-3 py-2 border-b border-stroke">
        <p className="text-[11px] uppercase tracking-wide text-grey-light">{bucket.label}</p>
      </div>
      <div className="px-3 py-2 flex items-center gap-2">
        <SourceSwatch meta={meta} size={14} />
        <span className="text-grey-darkest font-medium flex-1 truncate">{meta.label}</span>
        <span className="tabular-nums font-semibold text-grey-darkest">
          {source.value.toLocaleString()}
        </span>
      </div>
      {share > 0 && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-grey-light">
            {(share * 100).toFixed(1)}% of this period
          </p>
        </div>
      )}
    </div>
  )
}

// --- Main chart component ------------------------------------------------------
// Recharts' `onMouseMove` payload has wider types than we use — we only read
// `activeTooltipIndex` and narrow it to `number` at runtime.
interface RechartsMouseState {
  activeTooltipIndex?: number | string | null
  activeLabel?: string | number | null
  chartX?: number
  chartY?: number
}

export function OverviewChart({
  data,
  primaryMetric,
  secondaryMetric,
  nowLabel,
}: OverviewChartProps) {
  const { rows, sourceKeys } = useMemo(() => buildRows(data.buckets), [data.buckets])
  const yMax = useMemo(() => computeYMax(rows, sourceKeys), [rows, sourceKeys])
  const hasSecondaryLine = secondaryMetric && !data.secondaryUnavailable
  const yAxisFormatter = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<HoverState>(null)

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  // Chart-level mouse move is the single source of truth for hover state.
  //
  // We intentionally do NOT attach onMouseMove/onMouseLeave to the segment
  // rects: every `setHover` call triggers a re-render, which tears down the
  // segment's React event listeners mid-interaction. When that happens the
  // `mouseLeave` event never fires and the tooltip gets stuck in segment
  // mode until the cursor leaves the chart entirely.
  //
  // Instead, on every chart-level mousemove we probe the z-stack under the
  // cursor with `elementsFromPoint` and read the `data-source-key` attribute
  // off whichever segment (if any) is there. This survives re-renders
  // because it's re-computed every event.
  //
  // Recharts 3.x can pass `activeTooltipIndex` as a string (its `TooltipIndex`
  // type is `string | null`), so we coerce before using it.
  const handleChartMouseMove = useCallback(
    (state: RechartsMouseState, event?: React.MouseEvent<SVGElement>) => {
      const rawIdx = state.activeTooltipIndex
      if (rawIdx == null) return
      const bucketIndex = typeof rawIdx === 'number' ? rawIdx : Number(rawIdx)
      if (
        !Number.isFinite(bucketIndex) ||
        bucketIndex < 0 ||
        bucketIndex >= data.buckets.length
      ) {
        return
      }

      const { x, y } = event
        ? toLocal(event.clientX, event.clientY)
        : { x: state.chartX ?? 0, y: state.chartY ?? 0 }

      // Probe which segment (if any) is directly under the cursor.
      let sourceKey: string | null = null
      if (event) {
        const stack = document.elementsFromPoint(event.clientX, event.clientY)
        for (const el of stack) {
          if (
            el instanceof Element &&
            el.getAttribute('data-overview-segment') === 'true'
          ) {
            sourceKey = el.getAttribute('data-source-key')
            break
          }
        }
      }

      if (sourceKey) {
        setHover({ kind: 'segment', bucketIndex, sourceKey, mouseX: x, mouseY: y })
      } else {
        setHover({ kind: 'bar', bucketIndex, mouseX: x, mouseY: y })
      }
    },
    [toLocal, data.buckets.length],
  )

  const handleChartMouseLeave = useCallback(() => {
    setHover(null)
  }, [])

  // Compute tooltip position with simple edge-clamping.
  const tooltipPos = useMemo(() => {
    if (!hover) return null
    const containerW = containerRef.current?.clientWidth ?? 0
    const containerH = containerRef.current?.clientHeight ?? 0
    const offset = 14
    // Prefer above + right of the cursor; flip when close to edges.
    const rightOverflow = hover.mouseX + offset + TOOLTIP_WIDTH_ESTIMATE > containerW
    const left = rightOverflow
      ? Math.max(8, hover.mouseX - offset - TOOLTIP_WIDTH_ESTIMATE)
      : hover.mouseX + offset
    // Top: position above cursor; if that overflows the top, fall back below.
    const preferredTop = hover.mouseY - offset - 8
    const top = preferredTop < 8 ? hover.mouseY + offset : preferredTop
    // Don't let it fall off the bottom either.
    const safeTop = containerH > 0 ? Math.min(top, containerH - 80) : top
    return { left, top: safeTop }
  }, [hover])

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 6, right: hasSecondaryLine ? 8 : 0, left: -12, bottom: 0 }}
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            // Thin baseline that matches the dashed gridlines above. The
            // pre-existing `axisLine={false}` left the chart visually
            // hanging — bars looked like they were floating above the
            // labels with no anchor.
            axisLine={{ stroke: '#E1E1E1', strokeWidth: 1 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              primaryMetric === 'revenue' ? formatDollarsShort(v) : yAxisFormatter(v)
            }
            domain={[0, yMax]}
            ticks={[0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax]}
          />
          {hasSecondaryLine && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: SECONDARY_COLOR }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (secondaryMetric === 'conversion_rate' || secondaryMetric === 'bounce_rate') {
                  return `${Math.round(v * 100)}%`
                }
                if (secondaryMetric === 'revenue') return formatDollarsShort(v)
                return yAxisFormatter(v)
              }}
            />
          )}

          {/* Three quartile gridlines at 25% / 50% / 75% of yMax */}
          <ReferenceLine yAxisId="left" y={yMax / 4} stroke="#E1E1E1" strokeDasharray="4 4" />
          <ReferenceLine yAxisId="left" y={yMax / 2} stroke="#E1E1E1" strokeDasharray="4 4" />
          <ReferenceLine yAxisId="left" y={(yMax * 3) / 4} stroke="#E1E1E1" strokeDasharray="4 4" />

          {/* Vertical "now" indicator — brand-orange, centred on whichever
              bucket contains the viewer's current time. Because the x-axis
              is categorical, Recharts matches `x` against the bucket's
              `label`; an unmatched label is a silent no-op.
              Label sits `insideTop` (inside the plot area, just below the
              top edge) rather than `top`; the chart's 6px top margin isn't
              tall enough to accommodate an external label without clipping. */}
          {nowLabel && (
            <ReferenceLine
              yAxisId="left"
              x={nowLabel}
              stroke={SECONDARY_COLOR}
              strokeWidth={2}
              ifOverflow="visible"
              label={{
                value: 'Now',
                position: 'insideTop',
                fill: SECONDARY_COLOR,
                fontSize: 10,
                fontWeight: 700,
                offset: 6,
              }}
            />
          )}

          {/* Recharts tooltip kept only for its `cursor` prop — it draws the
              translucent column highlight behind the active bar for free. The
              actual tooltip content is our own overlay below. */}
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            content={() => null}
            wrapperStyle={{ display: 'none' }}
          />

          {sourceKeys.map(sk => (
            <Bar
              key={sk.key}
              yAxisId="left"
              dataKey={`src_${sk.key}`}
              name={sk.label}
              stackId="s"
              fill={sk.color}
              stroke={sk.outlined ? '#E1E1E1' : undefined}
              strokeWidth={sk.outlined ? 1 : 0}
              maxBarSize={28}
              isAnimationActive={false}
              shape={(props: unknown) => {
                const p = props as {
                  x: number
                  y: number
                  width: number
                  height: number
                  fill: string
                  stroke?: string
                  strokeWidth?: number
                  index?: number
                }
                if (!p.width || p.height <= 0.5) {
                  return <rect x={0} y={0} width={0} height={0} fill="none" />
                }
                const bucketIndex = p.index ?? -1
                const h = Math.max(1, p.height - SEGMENT_GAP_Y)

                // Datafast-style dim/highlight:
                //  - bar mode:      segments in the hovered bucket stay lit;
                //                   everything else dims.
                //  - segment mode:  only the exact segment stays lit; everything
                //                   else (including other segments in the same
                //                   bucket) dims. The active segment also gets
                //                   a soft drop-shadow so it visibly lifts off.
                const isHighlighted =
                  hover != null &&
                  (hover.kind === 'bar'
                    ? hover.bucketIndex === bucketIndex
                    : hover.bucketIndex === bucketIndex && hover.sourceKey === sk.key)
                const isDimmed = hover != null && !isHighlighted
                const isActiveSegment =
                  hover?.kind === 'segment' &&
                  hover.bucketIndex === bucketIndex &&
                  hover.sourceKey === sk.key

                // Segment glow uses a lightened version of the segment's own
                // fill so the "lift" feels like the bar itself is brighter,
                // not a generic black drop-shadow. `color-mix` is widely
                // supported in evergreen browsers (Chrome/Safari/Firefox 2023+).
                const glow = `color-mix(in srgb, ${p.fill} 55%, white)`
                return (
                  <rect
                    x={p.x}
                    y={p.y + SEGMENT_GAP_Y / 2}
                    width={p.width}
                    height={h}
                    rx={SEGMENT_RADIUS}
                    ry={SEGMENT_RADIUS}
                    fill={p.fill}
                    stroke={p.stroke ?? 'transparent'}
                    strokeWidth={p.strokeWidth ?? 0}
                    // Data attributes read by the chart-level mousemove
                    // handler via `elementsFromPoint`. No per-rect JS
                    // listeners — they don't survive the re-renders that
                    // follow every setHover call.
                    data-overview-segment="true"
                    data-source-key={sk.key}
                    style={{
                      cursor: 'pointer',
                      opacity: isDimmed ? 0.32 : 1,
                      filter: isActiveSegment
                        ? `drop-shadow(0 0 8px ${glow}) drop-shadow(0 0 2px ${glow})`
                        : undefined,
                      // No CSS transitions — instant in/out matches the
                      // tooltip's behaviour.
                    }}
                  />
                )
              }}
            />
          ))}

          {hasSecondaryLine && (
            <Line
              yAxisId="right"
              dataKey="secondary"
              stroke={SECONDARY_COLOR}
              strokeWidth={2}
              dot={false}
              type="monotone"
              isAnimationActive={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Custom tooltip overlay — rendered without any entry/exit animation so
          it tracks the cursor instantly. Mode swaps (bar ↔ segment) are a
          content swap inside the same container; position updates every frame
          via the mousemove handlers above. */}
      {hover && tooltipPos && (
        <div
          className="pointer-events-none absolute z-20"
          style={{ left: tooltipPos.left, top: tooltipPos.top }}
        >
          {hover.kind === 'segment' ? (
            <SegmentTooltipCard
              bucket={data.buckets[hover.bucketIndex]}
              sourceKey={hover.sourceKey}
              sourceKeys={sourceKeys}
            />
          ) : (
            <BarTooltipCard
              bucket={data.buckets[hover.bucketIndex]}
              sourceKeys={sourceKeys}
              primaryMetric={primaryMetric}
              secondaryMetric={secondaryMetric}
            />
          )}
        </div>
      )}
    </div>
  )
}
