'use client'

import { OverviewChart } from '@/app/hub/(components)/widgets/overview/OverviewChart'
import type { OverviewChartResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface MiniMixedChartProps {
  data: OverviewChartResponse
  className?: string
}

/** Home dashboard mini project overview — same chart chrome as the full overview. */
export function MiniMixedChart({ data, className }: MiniMixedChartProps) {
  if (data.buckets.length === 0) {
    return (
      <div
        className={cn(
          'flex h-[180px] w-full items-center justify-center rounded-lg bg-surface/60 text-xs text-subtle',
          className,
        )}
      >
        No data for this period
      </div>
    )
  }

  return (
    <div className={cn('h-[180px] w-full min-h-0 min-w-0', className)}>
      <OverviewChart
        data={data}
        primaryMetric="visitors"
        secondaryMetric="revenue"
      />
    </div>
  )
}
