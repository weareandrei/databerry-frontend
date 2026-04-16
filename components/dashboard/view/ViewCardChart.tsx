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
import { ArrowsClockwise, Warning } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import type { View } from '@/types/view'
import { formatCents } from '@/utils/formatters'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
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
  onUntrack: (id: string) => void
  points: ChartPoint[]
  loading: boolean
  error: string | null
  total: number | null
  historical?: boolean
}

export function ViewCardChart({
  view,
  onUntrack,
  points,
  loading,
  error,
  total,
  historical = false,
}: ViewCardChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const title = VIEW_TITLES[view.type] ?? view.name

  return (
    <ViewWrapper className="col-span-2 row-span-2">
      <ViewHeader
        name={title}
        connectionType={view.connectionType}
        connectionLabel="Stripe"
        onUntrack={onUntrack}
        viewId={view.id}
      />

      <div className="px-4 mt-2 shrink-0">
        {loading ? (
          <div className="flex items-center gap-1.5">
            <ArrowsClockwise size={12} className="animate-spin text-muted-foreground" weight="bold" />
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-1">
            <Warning size={12} className="text-amber-500" weight="bold" />
            <span className="text-xs text-muted-foreground">{error}</span>
          </div>
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
        {!loading && !error && historical && (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              {total == null
                ? 'No data recorded for this date.'
                : 'Chart unavailable for historical dates.'}
            </p>
          </div>
        )}
        {!loading && !error && !historical && points.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              margin={{ top: 4, right: 0, left: -16, bottom: 0 }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (v === 0 ? '$0' : `$${(v / 100).toFixed(0)}`)}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
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
  )
}
