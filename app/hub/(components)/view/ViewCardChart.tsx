'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import type { View } from '@/types/view'
import { formatCents } from '@/utils/formatters'
import { ConnectionMissingError } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'

const VIEW_TITLES: Record<string, string> = {
  stripe_gross_today: "Today's Gross Volume",
  stripe_gross_week: 'This Week Gross Volume',
}

const STRIPE_BLUE = '#635BFF'
const STRIPE_BLUE_HOVER = '#4F46E5'

export interface ChartPoint {
  label: string
  value: number
}

interface TooltipPayloadEntry { value: number }
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold">{formatCents(payload[0].value)}</p>
    </div>
  )
}

interface ViewCardChartProps {
  view: View
  onUntrack?: (id: string) => void
  points: ChartPoint[]
  loading: boolean
  /**
   * Generic chart-fetch error string, or a `ConnectionMissingError` when
   * the underlying connection row is gone (HTTP 410). The latter swaps the
   * "Fetch failed" badge for a click-to-reattach badge and lets the
   * dropdown's Reconnect item open `ReassignConnectionDialog`.
   */
  error: ViewResourceError | null
  total: number | null
  /**
   * @deprecated Accepted for backward-compatibility with callers (ProjectView
   * threads `isRange` here, the folder page threads its own historical flag),
   * but no longer drives any branching: the chart-data endpoint serves any
   * date range, and the empty-state message keys off `points.length === 0`
   * regardless of "historical-ness".
   */
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  /**
   * Same role as on `ViewCard` — fires when the user picks a fresh
   * connection from the reassignment dialog. Lets the parent swap the
   * view in local state so the chart re-fetches with the new
   * connection. Optional; without it the dialog still works but the
   * parent won't know to update.
   */
  onConnectionAssigned?: (updated: View) => void
}

export function ViewCardChart({
  view,
  onUntrack,
  points,
  loading,
  error,
  total,
  // `historical` accepted via props but intentionally not destructured —
  // the new gating keys off `points.length`, not the historical flag.
  // See the prop docstring for context.
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
}: ViewCardChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  // Mirror `ViewCard`'s reattach plumbing: track strict orphans
  // (`!view.connectionId`) and dangling FKs (the 410 from the chart-data
  // endpoint) the same way, so both states open `ReassignConnectionDialog`.
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing
  const title = VIEW_TITLES[view.type] ?? view.name

  return (
    <>
    <ViewWrapper className="col-span-2 row-span-2">
      <ViewHeader
        name={title}
        connectionType={view.connectionType}
        connectionLabel="Stripe"
        isDisconnected={isDisconnected}
        isConnectionMissing={isConnectionMissing}
        onReconnect={() => setReassignOpen(true)}
        onUntrack={onUntrack}
        viewId={view.id}
        projectName={projectName}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onPin={onPin}
        isPinned={isPinned}
      />

      <div className="px-4 mt-2 shrink-0">
        {loading ? (
          <div className="flex items-center gap-1.5">
            <ArrowsClockwise size={12} className="animate-spin text-muted-foreground" weight="bold" />
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : needsReattach ? (
          // Same two-flavour treatment as `ViewCard`: strict orphan
          // (`view.connectionId == null`) or dangling FK (410 from
          // chart-data endpoint). Both open the reassignment dialog.
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setReassignOpen(true)
            }}
            className="self-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Attach a connection to this view"
          >
            <FetchErrorBadge message="Connection missing — click to reattach" />
          </button>
        ) : error ? (
          <FetchErrorBadge message="Couldn't load value" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums leading-none">
            {total != null ? formatCents(total) : '—'}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 px-1 pb-3 mt-2">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <ArrowsClockwise size={20} className="animate-spin text-muted-foreground" weight="bold" />
          </div>
        )}
        {!loading && error && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Could not load chart data
          </div>
        )}
        {/*
          Empty-state vs. populated chart. We DON'T gate on `historical`
          here — the chart-data endpoint serves any date range correctly
          (`bucketByHour` for single days, `bucketByDayLabels` for ranges),
          and `useStripeChart` fetches even when the dashboard is showing
          a past period. The only thing that justifies the empty-state
          message is "no points to plot", which happens iff (a) no charges
          fell in the range or (b) the caller deliberately disabled the
          fetch (folder page on historical dates).
        */}
        {!loading && !error && points.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              No charges in this date range.
            </p>
          </div>
        )}
        {!loading && !error && points.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              // Top margin gives bars headroom so a single tall day doesn't
              // touch the card's top edge (which read as "the chart is
              // overflowing"). Bottom margin lets the x-axis labels sit
              // cleanly under the baseline. Left margin negative-offsets
              // the y-axis tick gutter to claw back chart real estate.
              margin={{ top: 12, right: 6, left: -14, bottom: 4 }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                // Same baseline treatment as `OverviewChart` — a thin
                // 1-px line to anchor the bars instead of letting them
                // float above the labels.
                axisLine={{ stroke: '#E1E1E1', strokeWidth: 1 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (v === 0 ? '$0' : `$${(v / 100).toFixed(0)}`)}
                // 15% headroom above the tallest bar. Without it,
                // recharts auto-domain produces a max equal to the data
                // max, so a $790 bar in a 7-day window reaches the
                // exact top edge — visually reads as "overflow" even
                // though it isn't. The `Math.ceil(... / 4) * 4` keeps
                // the tick labels at round-numbered intervals.
                domain={[0, (dataMax: number) => {
                  if (!dataMax || dataMax <= 0) return 1
                  const padded = dataMax * 1.15
                  // Round up to a nice multiple so y-axis ticks stay tidy.
                  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)))
                  return Math.ceil(padded / magnitude) * magnitude
                }]}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                // Reduced from 44 → 36. With 7-day windows, 44px bars
                // make a single-day-of-data view (typical for early
                // accounts) feel "lopsided" because the one bar is
                // wider than the surrounding empty whitespace looks
                // intentional. 36 is a more proportionate ceiling.
                maxBarSize={36}
                onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
              >
                {points.map((_, index) => (
                  <Cell
                    key={index}
                    fill={activeIndex === index ? STRIPE_BLUE_HOVER : STRIPE_BLUE}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ViewWrapper>

    {/*
      Mounted unconditionally so the dropdown's Reconnect item works even
      when the chart looks healthy. Renders nothing while `open` is false.
    */}
    <ReassignConnectionDialog
      view={view}
      open={reassignOpen}
      onOpenChange={setReassignOpen}
      onAssigned={onConnectionAssigned}
    />
    </>
  )
}
