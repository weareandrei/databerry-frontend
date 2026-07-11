'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
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
import { assignChartColors, sourceStyle } from '@/constants/trafficSources'
import type { OverviewPrimaryMetric, OverviewSecondaryMetric } from '@/types/view'
import {
  computeOverviewBarWidth,
  estimateOverviewPlotWidth,
} from '@/utils/overviewChartBarWidth'

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
  /**
   * When true, the visual encoding of the two metrics is swapped:
   *   - bars now plot the SECONDARY metric (single non-stacked bar per
   *     bucket, brand-orange, using the right Y-axis)
   *   - the line + gradient now plot the PRIMARY total (per-bucket sum
   *     across sources, using the left Y-axis)
   * Use case: the chart-type swap button in `ViewCardOverviewChart`.
   */
  swapped?: boolean
  /**
   * External source-hover signal — when set, every stacked bar
   * segment whose source key matches stays lit, every other
   * segment dims. Cross-component highlight driven by the sources
   * panel: user hovers a row in the sources list on the right,
   * all corresponding segments in the chart on the left highlight
   * simultaneously.
   *
   * Precedence: the chart's INTERNAL hover (cursor over a bar or
   * specific segment) wins over this when both are active. The
   * internal mouse interaction is the more specific intent;
   * external hover is the fallback that only matters when the
   * user isn't directly touching the chart.
   *
   * `null` means "no external hover" — the chart behaves as if
   * this prop didn't exist.
   */
  externalHoveredSourceKey?: string | null
  /**
   * Per-axis presentation overrides used when the corresponding
   * axis is driven by a connection-sourced metric (Stripe Gross
   * Volume, PostHog event count, …) rather than one of the
   * predefined options. The chart can't infer the right label or
   * value formatter from `primaryMetric` / `secondaryMetric` in
   * that case — those still hold the legacy predefined value as
   * a fallback for when the connection override is cleared.
   *
   * - `label` replaces the predefined label in tooltips + the
   *   summary card primary/secondary lines.
   * - `isCurrency` flips Y-axis tick formatting and tooltip
   *   value formatting from count → dollars.
   *
   * Both default to `null`, in which case the chart behaves
   * exactly as before (predefined metric path).
   */
  primaryDisplay?: { label: string; isCurrency: boolean } | null
  secondaryDisplay?: { label: string; isCurrency: boolean } | null
}

const CHART_PRIMARY = 'var(--color-chart-bar-top)'
const CHART_BAR_GRADIENT_BOTTOM = 'var(--color-chart-bar-bottom)'
const AXIS_TICK_COLOR = '#838385'  // muted text — keeps numeric labels neutral, not black
// Stacked segments now sit flush against each other (no gap) and only the
// TOP of the topmost non-zero segment in each bucket is rounded — the rest
// share square edges with their neighbours, and the bottom segment butts
// up against the X-axis line.
// TOP of the topmost bar segment — also scaled dynamically via
// `computeOverviewBarWidth` for single-bar mode.
const TOP_SEGMENT_RADIUS = 4
const TOOLTIP_WIDTH_ESTIMATE = 240 // used for edge-clamping; the actual card may be wider but this is a safe minimum.

// --- Source key metadata attached to each stacked Bar --------------------------
interface SourceKeyMeta {
  key: string
  color: string
  label: string
  outlined?: boolean
  logo?: string
  /**
   * When this key is `'other'` AND the palette overflowed (5+ non-
   * reserved sources), this lists the keys whose values got folded
   * into `'other'`. The segment tooltip expands this list back into
   * per-source rows so the user can see which long-tail domains are
   * inside the "other" bar. Undefined for every key that isn't the
   * merged-other slot.
   */
  mergedFrom?: string[]
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
//
// Colour assignment + stack order are driven by `assignChartColors`:
//   - Reserved keys (reddit / direct / other) get fixed colours.
//   - Everything else is ranked by total value across all buckets and
//     assigned the red→orange→yellow gradient from the bottom up.
// `sourceKeys` is returned in BOTTOM-TO-TOP render order — recharts
// stacks `<Bar>` children in declaration order, so the consumer can
// iterate `sourceKeys` and the first one ends up as the bottom
// segment of every column.
function buildRows(
  buckets: OverviewBucket[],
): { rows: Array<Record<string, string | number | null>>; sourceKeys: SourceKeyMeta[] } {
  const labelByKey = new Map<string, { label: string; outlined?: boolean; logo?: string }>()
  const totalByKey = new Map<string, number>()

  for (const b of buckets) {
    for (const s of b.bySource) {
      if (!labelByKey.has(s.source)) {
        // We only consult `sourceStyle` for non-colour metadata now
        // (label / outlined / logo). The colour comes from the
        // ranked palette below.
        const style = sourceStyle(s.source, s.label, s.color)
        labelByKey.set(s.source, {
          label: style.label,
          outlined: style.outlined,
          logo: style.logo,
        })
      }
      totalByKey.set(s.source, (totalByKey.get(s.source) ?? 0) + s.value)
    }
  }

  const palette = assignChartColors(
    Array.from(totalByKey, ([key, totalValue]) => ({ key, totalValue })),
  )
  // Fast lookup — same array used per-row to add overflow values
  // into "other". Set vs Array because the per-row loop checks
  // membership N×M times for M buckets.
  const mergedSet = new Set(palette.mergedToOther)

  // Iterate in the palette's bottom-to-top order so recharts stacks
  // segments in the same order (palette.order[0] is the bottom).
  // When the palette synthesised an `'other'` slot for overflow (no
  // original "other" in data), `labelByKey` won't have an entry —
  // we fall back to the conventional label/logo for that case.
  const sourceKeys: SourceKeyMeta[] = palette.order.map(key => {
    const meta = labelByKey.get(key) ?? {
      label: sourceStyle(key).label,
      outlined: sourceStyle(key).outlined,
      logo: sourceStyle(key).logo,
    }
    const sk: SourceKeyMeta = {
      key,
      color: palette.colorByKey[key]!,
      label: meta.label,
      outlined: meta.outlined,
      logo: meta.logo,
    }
    // Stamp the merged-source list onto the "other" key so the
    // segment tooltip can expand it.
    if (key === 'other' && mergedSet.size > 0) {
      sk.mergedFrom = palette.mergedToOther
    }
    return sk
  })

  const rows = buckets.map(b => {
    const row: Record<string, string | number | null> = {
      label: b.label,
      secondary: b.secondary,
      // Per-bucket primary aggregate (sum across sources). Carried on the
      // row so the chart can plot it as a `<Line>` / `<Area>` when the
      // user toggles the bar/line swap.
      total: b.total,
    }
    // Per-row overflow-into-other sum. The keys in `mergedSet`
    // aren't rendered as their own segments; instead, their values
    // for this bucket flow into `src_other` so the "other" segment
    // grows by exactly the long-tail's contribution.
    let mergedSumForRow = 0
    if (mergedSet.size > 0) {
      for (const s of b.bySource) {
        if (mergedSet.has(s.source)) mergedSumForRow += s.value
      }
    }
    for (const sk of sourceKeys) {
      const match = b.bySource.find(x => x.source === sk.key)
      const baseValue = match ? match.value : 0
      row[`src_${sk.key}`] =
        sk.key === 'other' ? baseValue + mergedSumForRow : baseValue
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
    // Stacked-source height: sum of every per-source segment in this
    // bucket. Drives the axis when the chart is in stacked mode
    // (traffic sources split the bar).
    let stackedSum = 0
    for (const sk of sourceKeys) {
      const v = row[`src_${sk.key}`]
      if (typeof v === 'number') stackedSum += v
    }
    // `total` is the per-bucket primary aggregate, carried on every
    // row. It's what the SINGLE bar is plotted against in single-bar
    // mode — which is exactly the case for connection metrics
    // (Stripe Gross, PostHog event count) that have NO source
    // breakdown, so `sourceKeys` is empty and `stackedSum` stays 0.
    // Without folding `total` in here the axis collapsed to the
    // `max <= 0 → return 4` fallback, capping the left axis at "$4"
    // regardless of the real values. In stacked mode the two are
    // equal (sources sum to the total) so taking the larger is
    // correct either way.
    const totalVal = typeof row.total === 'number' ? row.total : 0
    const rowMax = Math.max(stackedSum, totalVal)
    if (rowMax > max) max = rowMax
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

/** Short-form dollars for axis ticks: "$30", "$1.5k", "$1.2M". */
function formatDollarsShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${Math.round(v)}`
}

/**
 * Short-form session duration for axis ticks. Compact (no trailing
 * seconds in the minutes range) so labels stay narrow enough not to
 * push the chart's plot area: "42s", "5m", "1h".
 */
function formatSecondsShort(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0s'
  if (v < 60) return `${Math.round(v)}s`
  if (v < 3600) return `${Math.floor(v / 60)}m`
  return `${Math.floor(v / 3600)}h`
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
  primaryDisplay: { label: string; isCurrency: boolean } | null
  secondaryDisplay: { label: string; isCurrency: boolean } | null
}

function BarTooltipCard({ bucket, sourceKeys, primaryMetric, secondaryMetric, primaryDisplay, secondaryDisplay }: BarTooltipProps) {
  // When a connection-sourced primary is active, `bucket.bySource`
  // is intentionally empty (see `ViewCardOverviewChartConnected`).
  // The legacy `bySource.reduce` would render 0 in that case, so
  // fall back to `bucket.total` which the wrapper sets to the
  // connection series value. For the predefined path the two
  // numbers agree (total = sum of sources) so this is a no-op.
  const total = primaryDisplay
    ? bucket.total
    : bucket.bySource.reduce((acc, s) => acc + s.value, 0)
  const secondary = bucket.secondary
  const hasSecondary =
    secondary != null && (secondaryDisplay != null || secondaryMetric != null)
  const primaryLbl = primaryDisplay?.label ?? primaryLabel(primaryMetric)
  const secondaryLbl =
    secondaryDisplay?.label ?? (secondaryMetric ? secondaryLabel(secondaryMetric) : '')

  // Derived: revenue-per-visitor is the only cross-metric ratio that makes sense
  // with current data (primary=visitors + secondary=revenue). More can be added
  // here as new metric combinations are introduced.
  //
  // Gated on the PREDEFINED metric path (no connection override on either
  // axis). Once a connection metric is driving either axis the bucket totals
  // no longer carry the visitor/revenue semantics this ratio assumes, and
  // dividing them would print a nonsense number.
  const showRevPerVisitor =
    !primaryDisplay &&
    !secondaryDisplay &&
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
        <p className="text-[11px] uppercase tracking-wide text-subtle">{bucket.label}</p>
      </div>

      {/* Primary + secondary metric summary */}
      <div className="px-3 py-2 border-b border-stroke space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-sm shrink-0"
              style={{
                background: `linear-gradient(to bottom, var(--color-chart-bar-top), var(--color-chart-bar-bottom))`,
              }}
            />
            <span className="text-foreground font-medium">{primaryLbl}</span>
          </div>
          <span className="tabular-nums font-semibold text-foreground">
            {primaryDisplay
              ? (primaryDisplay.isCurrency ? formatDollars(total) : total.toLocaleString())
              : formatPrimary(total, primaryMetric)}
          </span>
        </div>
        {hasSecondary && (
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-sm shrink-0 bg-primary"
              />
              <span className="text-foreground font-medium">{secondaryLbl}</span>
            </div>
            <span className="tabular-nums font-semibold text-foreground">
              {secondaryDisplay
                ? (secondaryDisplay.isCurrency
                  ? formatDollars(secondary)
                  : secondary.toLocaleString())
                : secondaryMetric
                  ? formatSecondaryValue(secondary, secondaryMetric)
                  : secondary.toLocaleString()}
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
                <span className="text-muted-foreground flex-1 truncate">{meta.label}</span>
                <span className="tabular-nums text-foreground">
                  {s.value.toLocaleString()}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Derived metric footer.
          `secondary` is in DOLLARS (see formatPrimary's comment for
          the contract) and `total` is the visitor count, so
          `secondary / total` is dollars-per-visitor directly. The
          previous formula `(secondary / total / 100)` divided by
          an extra 100 — a hangover from an earlier draft when the
          backend still passed cents through. Was silently wrong:
          a project with $246 revenue and 2 visitors showed "$1.23
          / visitor" instead of "$123 / visitor". The bug was
          discovered when the connection-metric overlay landed and
          the numbers stopped being plausible enough to ignore. */}
      {showRevPerVisitor && secondary != null && total > 0 && (
        <div className="px-3 py-2 border-t border-stroke flex items-center justify-between">
          <span className="text-subtle">Revenue / visitor</span>
          <span className="tabular-nums font-semibold text-foreground">
            ${(secondary / total).toFixed(2)}
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
  const meta =
    sourceKeys.find(sk => sk.key === sourceKey) ?? {
      key: sourceKey,
      label:
        bucket.bySource.find(s => s.source === sourceKey)?.label ?? sourceKey,
      color: sourceStyle(sourceKey).color,
      outlined: sourceStyle(sourceKey).outlined,
      logo: sourceStyle(sourceKey).logo,
    }

  // Merged-other path: when this is the "other" segment AND the palette
  // folded long-tail sources into it (5+ non-reserved sources), the
  // segment's visual height = raw `other` value + sum of merged keys.
  // We display the same total here AND list the breakdown underneath so
  // users see what's inside the grey bar.
  const isMergedOther =
    sourceKey === 'other' && meta.mergedFrom != null && meta.mergedFrom.length > 0

  const rawOther = bucket.bySource.find(s => s.source === 'other')
  // Per-bucket components — skip merged keys with zero value here so the
  // breakdown only lists sources that actually contributed to THIS column.
  const mergedComponents = isMergedOther
    ? meta.mergedFrom!
        .map(key => bucket.bySource.find(s => s.source === key))
        .filter((s): s is NonNullable<typeof s> => s != null && s.value > 0)
        .sort((a, b) => b.value - a.value)
    : []

  const displayedValue = isMergedOther
    ? (rawOther?.value ?? 0) +
      mergedComponents.reduce((acc, s) => acc + s.value, 0)
    : (bucket.bySource.find(s => s.source === sourceKey)?.value ?? 0)

  // Non-merged segment with no matching row in this bucket — defensive
  // null render (recharts can fire a segment hover for an empty cell
  // during transitions).
  if (!isMergedOther && displayedValue === 0) {
    const exists = bucket.bySource.find(s => s.source === sourceKey)
    if (!exists) return null
  }

  const total = bucket.bySource.reduce((a, s) => a + s.value, 0)
  const share = total > 0 ? displayedValue / total : 0

  return (
    <div className="rounded-lg border border-stroke bg-white shadow-card overflow-hidden min-w-[200px] text-xs">
      <div className="px-3 py-2 border-b border-stroke">
        <p className="text-[11px] uppercase tracking-wide text-subtle">{bucket.label}</p>
      </div>
      <div className="px-3 py-2 flex items-center gap-2">
        <SourceSwatch meta={meta} size={14} />
        <span className="text-foreground font-medium flex-1 truncate">{meta.label}</span>
        <span className="tabular-nums font-semibold text-foreground">
          {displayedValue.toLocaleString()}
        </span>
      </div>
      {share > 0 && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-subtle">
            {(share * 100).toFixed(1)}% of this period
          </p>
        </div>
      )}

      {/* Merged-other breakdown — listed in descending value order so the
          biggest long-tail source reads first. The raw "other" bucket
          (if it had a value of its own) renders as a row too, labelled
          'Other' to distinguish from the merged sources. */}
      {isMergedOther && (mergedComponents.length > 0 || (rawOther?.value ?? 0) > 0) && (
        <div className="border-t border-stroke px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-subtle mb-1">
            Includes
          </p>
          <ul className="space-y-1">
            {(rawOther?.value ?? 0) > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground flex-1 truncate">Other</span>
                <span className="tabular-nums text-foreground">
                  {rawOther!.value.toLocaleString()}
                </span>
              </li>
            )}
            {mergedComponents.map(s => {
              const componentLabel =
                sourceStyle(s.source, s.label, s.color).label
              return (
                <li key={s.source} className="flex items-center gap-2">
                  <span className="text-muted-foreground flex-1 truncate">{componentLabel}</span>
                  <span className="tabular-nums text-foreground">
                    {s.value.toLocaleString()}
                  </span>
                </li>
              )
            })}
          </ul>
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
  swapped = false,
  externalHoveredSourceKey = null,
  primaryDisplay = null,
  secondaryDisplay = null,
}: OverviewChartProps) {
  const { rows, sourceKeys } = useMemo(() => buildRows(data.buckets), [data.buckets])
  const yMax = useMemo(() => computeYMax(rows, sourceKeys), [rows, sourceKeys])
  // For each bucket, which sourceKey is the visually topmost (non-zero) segment?
  // Used by the bar `shape` callback to round ONLY the top corners of that one
  // segment — every segment below it stays square so the stack reads as a single
  // bar instead of a stack of pill-shaped rectangles.
  const topmostByBucket = useMemo(() => {
    return rows.map(row => {
      for (let i = sourceKeys.length - 1; i >= 0; i--) {
        const v = row[`src_${sourceKeys[i].key}`]
        if (typeof v === 'number' && v > 0) return sourceKeys[i].key
      }
      return null
    })
  }, [rows, sourceKeys])
  // Overlay = the line/gradient series. When swapped it plots the primary
  // total (always available if there's any data), so it's unconditionally
  // visible. When not swapped, it plots the secondary metric — same
  // availability check as before.
  const hasOverlay = swapped ? true : Boolean(secondaryMetric && !data.secondaryUnavailable)
  /**
   * Counts axis (visitors/pageviews/conversions). Compact suffixes so
   * "1500" reads as "1.5k", "2400000" as "2.4M" — keeps axis labels
   * narrow and the bars don't lose horizontal real estate to a wide
   * tick gutter.
   */
  const yAxisFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
    return String(v)
  }

  // Bars always render as a single gradient column per bucket (primary
  // metric top → secondary accent bottom). Source breakdown lives in
  // the paired sources panel + tooltip, not as stacked segments.
  const useStackedBars = false
  const singleBarDataKey = swapped ? 'secondary' : 'total'
  const singleBarAxisId = swapped ? 'right' : 'left'
  // Overlay always lives on the OPPOSITE Y-axis from the bars so the
  // two scales don't fight each other.
  const overlayDataKey = swapped ? 'total' : 'secondary'
  const overlayAxisId = swapped ? 'left' : 'right'

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [hover, setHover] = useState<HoverState>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0
      setContainerWidth(width)
    })
    observer.observe(node)
    setContainerWidth(node.clientWidth)

    return () => observer.disconnect()
  }, [])

  const { maxBarSize, topRadius, barCategoryGap } = useMemo(() => {
    const plotWidth = estimateOverviewPlotWidth(containerWidth, hasOverlay)
    return computeOverviewBarWidth({
      plotWidth,
      barCount: data.buckets.length,
    })
  }, [containerWidth, hasOverlay, data.buckets.length])

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
      {/* `minHeight={1}` / `minWidth={1}` stop recharts from logging
          "width(0) and height(0) of chart should be greater than 0"
          + emitting NaN-bearing `<path d>` values during the brief
          window where the ResponsiveContainer's parent measures 0×0
          (initial layout pass, AnimatePresence cross-fades, etc.).
          1px is enough to satisfy recharts' guard; the actual chart
          still snaps to `100%` once the parent has real dimensions. */}
      <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
        <ComposedChart
          data={rows}
          barCategoryGap={barCategoryGap}
          /* `bottom: 8` reserves a thin band below the X-axis labels
             inside the SVG so they don't read as flush against the
             card edge. Previously `bottom: 0` left the labels
             touching the SVG bottom — combined with the chart's
             outer `p-4` (16 px) it was only ~16 px to the next grid
             row, which read as "no gap" against the dense composite
             layout in `<ProjectView>`. 8 px is small enough not to
             noticeably shrink the plot area while giving the chart
             clear visual termination. */
          margin={{ top: 6, right: hasOverlay ? 8 : 0, left: 0, bottom: 8 }}
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          {/* Gradient backdrop for the secondary-metric area chart.
              Goes top → bottom: bright orange at the line, fading
              through a warmer orange, down to a near-transparent red
              at the chart floor. Declared once at the chart level so
              the SVG ids don't multiply per render. */}
          <defs>
            {/* Area fill under the overlay line — primary fading out. */}
            <linearGradient id="overviewLineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.2} />
              <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
            </linearGradient>
            {/* Bar fill — primary (top) → secondary accent (bottom). */}
            <linearGradient id="overviewBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_PRIMARY} />
              <stop offset="100%" stopColor={CHART_BAR_GRADIENT_BOTTOM} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: AXIS_TICK_COLOR }}
            // Thin baseline that matches the dashed gridlines above. The
            // pre-existing `axisLine={false}` left the chart visually
            // hanging — bars looked like they were floating above the
            // labels with no anchor.
            axisLine={{ stroke: '#ECECF0', strokeWidth: 1 }}
            tickLine={false}
            interval="preserveStartEnd"
            // Pads the leftmost + rightmost bar away from the axis edges
            // so they don't hug the Y-axis line / right edge of the
            // plot area. The Y-axis tick labels (which sit inside the
            // axis area, not in this padding region) stay tight to the
            // chart — see `width={36}` + `tickMargin={2}` on the YAxis.
            padding={{ left: 18, right: 18 }}
          />
          <YAxis
            yAxisId="left"
            // Narrow axis area so tick labels ($120, $80, $0) sit close
            // to the bars instead of floating in a wide gutter. The
            // `tickMargin={2}` keeps a hairline gap between the label
            // text and the plot.
            width={36}
            tickMargin={2}
            tick={{ fontSize: 11, fill: AXIS_TICK_COLOR }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              // Connection override (e.g. Stripe Gross Volume) wins over
              // the predefined metric. `isCurrency` covers Stripe gross /
              // MRR — any future currency-typed connection metric just
              // sets the flag, no new branches needed here.
              if (primaryDisplay) {
                return primaryDisplay.isCurrency ? formatDollarsShort(v) : yAxisFormatter(v)
              }
              return primaryMetric === 'revenue' ? formatDollarsShort(v) : yAxisFormatter(v)
            }}
            domain={[0, yMax]}
            ticks={[0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax]}
          />
          {hasOverlay && (
            <YAxis
              yAxisId="right"
              orientation="right"
              width={36}
              tickMargin={2}
              tick={{ fontSize: 11, fill: AXIS_TICK_COLOR }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                // Connection override (e.g. PostHog event count) wins
                // over the predefined secondary metric — `isCurrency`
                // is false for counter-style overlays, true for
                // dollar-denominated ones like Stripe Gross Volume.
                if (secondaryDisplay) {
                  return secondaryDisplay.isCurrency ? formatDollarsShort(v) : yAxisFormatter(v)
                }
                if (secondaryMetric === 'conversion_rate' || secondaryMetric === 'bounce_rate') {
                  return `${Math.round(v * 100)}%`
                }
                if (secondaryMetric === 'revenue') return formatDollarsShort(v)
                // `avg_session_sec` ticks read as raw seconds without
                // a unit suffix → 120, 240, 360… looks like a count
                // when it's really session length. Format as 30s/5m/1h
                // so the axis self-documents.
                if (secondaryMetric === 'avg_session_sec') return formatSecondsShort(v)
                return yAxisFormatter(v)
              }}
            />
          )}

          {/* Three quartile gridlines at 25% / 50% / 75% of yMax */}
          <ReferenceLine yAxisId="left" y={yMax / 4} stroke="#ECECF0" strokeDasharray="4 4" />
          <ReferenceLine yAxisId="left" y={yMax / 2} stroke="#ECECF0" strokeDasharray="4 4" />
          <ReferenceLine yAxisId="left" y={(yMax * 3) / 4} stroke="#ECECF0" strokeDasharray="4 4" />

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
              stroke={CHART_PRIMARY}
              strokeWidth={2}
              ifOverflow="visible"
              label={{
                value: 'Now',
                position: 'insideTop',
                fill: CHART_PRIMARY,
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

          {/* Gradient AREA backdrop for the secondary line. Declared BEFORE
              the bars so it paints behind them; the matching `<Line>` is
              declared AFTER the bars so the stroke + dot circles sit on
              top. Re-using `dataKey="secondary"` so both the area and the
              line trace the same data. */}
          {hasOverlay && (
            <Area
              yAxisId={overlayAxisId}
              dataKey={overlayDataKey}
              type="monotone"
              stroke="none"
              fill="url(#overviewLineGradient)"
              isAnimationActive={false}
              connectNulls
            />
          )}

          {!useStackedBars && (
            // Single (non-stacked) bar per bucket — filled with the
            // bar gradient so the visual identity is consistent across
            // every non-segmented case (swapped mode, revenue, etc.).
            // Recharts' native `radius` prop handles top-rounded
            // corners; no custom path renderer needed without a stack
            // to manage.
            <Bar
              yAxisId={singleBarAxisId}
              dataKey={singleBarDataKey}
              fill="url(#overviewBarGradient)"
              maxBarSize={maxBarSize}
              isAnimationActive={false}
              radius={[topRadius, topRadius, 0, 0]}
            />
          )}

          {useStackedBars && sourceKeys.map(sk => (
            <Bar
              key={sk.key}
              yAxisId="left"
              dataKey={`src_${sk.key}`}
              name={sk.label}
              stackId="s"
              fill={sk.color}
              stroke={sk.outlined ? '#ECECF0' : undefined}
              strokeWidth={sk.outlined ? 1 : 0}
              maxBarSize={maxBarSize}
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

                // Datafast-style dim/highlight, with three input sources:
                //  - bar mode (internal):      segments in the hovered bucket stay lit;
                //                              everything else dims.
                //  - segment mode (internal):  only the exact segment stays lit;
                //                              everything else dims. The active
                //                              segment also gets a soft drop-shadow
                //                              so it visibly lifts off.
                //  - external source hover:    user is hovering a row in the
                //                              sources panel — every segment with
                //                              that sourceKey stays lit (across
                //                              ALL buckets), others dim. Multiple
                //                              days with the same source highlight
                //                              together for free since each segment
                //                              checks its own sk.key.
                //
                // Precedence: internal wins when both are active (the cursor is
                // physically on the chart, that's the more specific intent).
                // External only matters when `hover` is null.
                const internalMatch =
                  hover != null &&
                  (hover.kind === 'bar'
                    ? hover.bucketIndex === bucketIndex
                    : hover.bucketIndex === bucketIndex && hover.sourceKey === sk.key)
                const externalMatch =
                  hover == null &&
                  externalHoveredSourceKey != null &&
                  externalHoveredSourceKey === sk.key
                const isHighlighted = internalMatch || externalMatch
                const anyHoverActive = hover != null || externalHoveredSourceKey != null
                const isDimmed = anyHoverActive && !isHighlighted
                const isActiveSegment =
                  hover?.kind === 'segment' &&
                  hover.bucketIndex === bucketIndex &&
                  hover.sourceKey === sk.key

                // Segment glow uses a lightened version of the segment's own
                // fill so the "lift" feels like the bar itself is brighter,
                // not a generic black drop-shadow. `color-mix` is widely
                // supported in evergreen browsers (Chrome/Safari/Firefox 2023+).
                const glow = `color-mix(in srgb, ${p.fill} 55%, white)`

                // Only the topmost non-zero segment in this bucket rounds its
                // TOP corners. Every segment below it (and the topmost's
                // bottom edge) stays square so the stack reads as a single
                // bar whose bottom sits flush on the X-axis. Cap radius at
                // half the segment height for the case where the topmost
                // segment is shorter than 2 × radius.
                const isTopmost = topmostByBucket[bucketIndex] === sk.key
                const r = isTopmost ? Math.min(TOP_SEGMENT_RADIUS, p.height / 2) : 0

                const commonProps = {
                  fill: p.fill,
                  stroke: p.stroke ?? 'transparent',
                  strokeWidth: p.strokeWidth ?? 0,
                  // Data attributes read by the chart-level mousemove
                  // handler via `elementsFromPoint`. No per-rect JS
                  // listeners — they don't survive the re-renders that
                  // follow every setHover call.
                  'data-overview-segment': 'true',
                  'data-source-key': sk.key,
                  style: {
                    cursor: 'pointer',
                    opacity: isDimmed ? 0.32 : 1,
                    filter: isActiveSegment
                      ? `drop-shadow(0 0 8px ${glow}) drop-shadow(0 0 2px ${glow})`
                      : undefined,
                  },
                }

                if (r === 0) {
                  return (
                    <rect
                      x={p.x}
                      y={p.y}
                      width={p.width}
                      height={p.height}
                      {...commonProps}
                    />
                  )
                }

                // Rect with rounded top corners only — drawn as a path so
                // the BOTTOM edge stays square (sitting flush against the
                // next segment below or the X-axis line). SVG `<rect rx>`
                // rounds all four corners, which is why we drop down to
                // path geometry here.
                const { x, y, width, height } = p
                const d = `M ${x},${y + r} A ${r},${r} 0 0 1 ${x + r},${y} L ${x + width - r},${y} A ${r},${r} 0 0 1 ${x + width},${y + r} L ${x + width},${y + height} L ${x},${y + height} Z`
                return <path d={d} {...commonProps} />
              }}
            />
          ))}

          {hasOverlay && (
            <Line
              yAxisId={overlayAxisId}
              dataKey={overlayDataKey}
              stroke={CHART_PRIMARY}
              strokeWidth={2}
              type="monotone"
              isAnimationActive={false}
              connectNulls
              dot={{
                r: 4,
                fill: 'white',
                stroke: CHART_PRIMARY,
                strokeWidth: 2.5,
              }}
              activeDot={{
                r: 5,
                fill: 'white',
                stroke: CHART_PRIMARY,
                strokeWidth: 2.5,
              }}
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
              primaryDisplay={primaryDisplay}
              secondaryDisplay={secondaryDisplay}
            />
          )}
        </div>
      )}
    </div>
  )
}
