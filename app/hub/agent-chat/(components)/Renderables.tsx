'use client'

/**
 * Renderable cards displayed under the assistant's text bubble — the
 * visual companion to the prose reply. Three shapes:
 *
 *   1. `stat`     — single big number with a label + optional date
 *                   sublabel. For point-in-time metrics (MRR, today's
 *                   pageviews, total event count).
 *   2. `chart`    — mini line chart. For time-series (revenue trend,
 *                   daily event counts).
 *   3. `top_list` — ranked rows (label + value). For "top customers"
 *                   and similar leaderboards.
 *
 * The shapes are picked SERVER-SIDE by `backend/src/chat/renderables.ts`
 * based on the tool that ran. This file just takes what arrives and
 * paints it. Adding a new renderable type =
 *   (1) add a branch in `backend/.../renderables.ts`
 *   (2) extend `Renderable` in `types.ts`
 *   (3) add a card here.
 *
 * Sizing: cards fill the same `max-w-3xl` column the message bubbles
 * use, so they don't blow past the active-state input width.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  ChartRenderable,
  Renderable,
  StatRenderable,
  TopListRenderable,
} from './types'

export function Renderables({ items }: { items: Renderable[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-2">
      {items.map((r, i) => (
        <RenderableCard key={i} item={r} />
      ))}
    </div>
  )
}

function RenderableCard({ item }: { item: Renderable }) {
  switch (item.kind) {
    case 'stat':
      return <StatCard r={item} />
    case 'chart':
      return <ChartCard r={item} />
    case 'top_list':
      return <TopListCard r={item} />
  }
}

// ── Stat ──────────────────────────────────────────────────────────

function StatCard({ r }: { r: StatRenderable }) {
  return (
    <div className="rounded-xl border border-stroke bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-grey-light font-medium">
        {r.label}
      </p>
      <p
        // Large display number — `font-bricolage` mirrors the empty
        // state's title for visual consistency across the surface.
        className="mt-1 text-2xl font-semibold text-grey-darkest leading-none"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        {r.value}
      </p>
      {r.sublabel && (
        <p className="mt-1.5 text-[11px] text-grey-light">{r.sublabel}</p>
      )}
    </div>
  )
}

// ── Chart ─────────────────────────────────────────────────────────

function ChartCard({ r }: { r: ChartRenderable }) {
  // Single-point or empty series: fall back to a stat-style display
  // (a chart with one point looks like a misrendered scribble in
  // Recharts). Backend usually catches this, but a frontend safety
  // net is cheap.
  if (r.series.length < 2) {
    const only = r.series[0]
    return (
      <div className="rounded-xl border border-stroke bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] uppercase tracking-wider text-grey-light font-medium">
          {r.title}
        </p>
        <p
          className="mt-1 text-2xl font-semibold text-grey-darkest leading-none"
          style={{ fontFamily: 'var(--font-bricolage)' }}
        >
          {only ? formatChartValue(only.value, r.unit) : '—'}
        </p>
        {r.sublabel && (
          <p className="mt-1.5 text-[11px] text-grey-light">{r.sublabel}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stroke bg-white px-4 pt-3 pb-2 shadow-sm">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[11px] uppercase tracking-wider text-grey-light font-medium">
          {r.title}
        </p>
        {r.sublabel && (
          <p className="text-[10px] text-grey-light shrink-0">{r.sublabel}</p>
        )}
      </div>
      {/* Fixed height — keeps the layout calm regardless of how many
          points are in the series. `ResponsiveContainer` widthhandles
          the horizontal scaling. */}
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={r.series}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="chatRenderableFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F46719" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#F46719" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#E5E7EB"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              // Show first + last + a couple in between so dense
              // series (30+ points) don't crowd the axis.
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={v => formatAxisTick(Number(v), r.unit)}
            />
            <Tooltip
              cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-md border border-stroke bg-white px-2 py-1 text-[11px] shadow-sm">
                    <div className="text-grey-light">{label}</div>
                    <div className="font-semibold text-grey-darkest">
                      {formatChartValue(Number(payload[0]!.value), r.unit)}
                    </div>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#F46719"
              strokeWidth={2}
              fill="url(#chatRenderableFill)"
              dot={false}
              activeDot={{ r: 3, stroke: '#F46719', fill: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Top list ──────────────────────────────────────────────────────

function TopListCard({ r }: { r: TopListRenderable }) {
  return (
    <div className="rounded-xl border border-stroke bg-white shadow-sm overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
        <p className="text-[11px] uppercase tracking-wider text-grey-light font-medium">
          {r.title}
        </p>
        {r.sublabel && (
          <p className="text-[10px] text-grey-light shrink-0">{r.sublabel}</p>
        )}
      </div>
      <ol className="divide-y divide-stroke">
        {r.rows.map((row, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 px-4 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-main text-[10px] font-semibold text-grey-dark shrink-0 tabular-nums">
                {i + 1}
              </span>
              <span className="text-sm text-grey-darkest truncate">
                {row.label}
              </span>
            </div>
            <span className="text-sm font-semibold text-grey-darkest tabular-nums shrink-0">
              {row.value}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Formatting helpers ───────────────────────────────────────────
//
// Currency series arrive ALREADY in dollars (the backend's
// `renderables.ts` divides Stripe cents by 100 before sending) so we
// don't double-divide here. Count series are integers; rate series
// are 0-1 decimals.

function formatChartValue(
  value: number,
  unit: ChartRenderable['unit'],
): string {
  if (unit === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }
  if (unit === 'rate') return `${(value * 100).toFixed(1)}%`
  return value.toLocaleString('en-US')
}

function formatAxisTick(
  value: number,
  unit: ChartRenderable['unit'],
): string {
  // Compact axis labels — full prices ("$12,345.67") would push the
  // chart's left padding way out and squash the plot area. Keep them
  // short ($12.3K) and let the tooltip carry the precision.
  if (unit === 'currency') {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${Math.round(value)}`
  }
  if (unit === 'rate') return `${Math.round(value * 100)}%`
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(Math.round(value))
}
