'use client'

/**
 * Horizontal funnel chart — reusable across hub, demo, and landing.
 * Uses ECharts `funnel` series; step labels and counts are rendered
 * by ECharts with our shared theme defaults from `BaseChart`.
 */

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { BaseChart } from './BaseChart'
import { CHART_THEME, FUNNEL_LAYER_COLORS } from './chartTheme'
import { cn } from '@/lib/utils'
import type { FunnelStep } from './types'

export interface FunnelChartProps {
  steps: FunnelStep[]
  className?: string
  /** Taller minimum useful height in compact/demo embeds. */
  dense?: boolean
  onEvents?: Record<string, (params: unknown) => void>
}

export function FunnelChart({
  steps,
  className,
  dense = false,
  onEvents,
}: FunnelChartProps) {
  const option = useMemo((): EChartsOption => {
    const sorted = [...steps].sort((a, b) => b.value - a.value)

    return {
      grid: {
        top: dense ? 28 : 20,
        bottom: dense ? 28 : 20,
        left: 8,
        right: 8,
        containLabel: true,
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: unknown) => {
          const p = params as { name?: string; value?: number; dataIndex?: number }
          const step = steps[p.dataIndex ?? 0]
          if (!step) return ''
          const pct =
            step.conversionFromStart != null
              ? `${(step.conversionFromStart * 100).toFixed(step.conversionFromStart < 0.1 ? 1 : 0)}%`
              : null
          const lines = [`<strong>${p.name ?? step.name}</strong>`, `${(p.value ?? step.value).toLocaleString()} users`]
          if (pct) lines.push(`${pct} from start`)
          return lines.join('<br/>')
        },
      },
      series: [
        {
          type: 'funnel',
          orient: 'horizontal',
          left: '4%',
          right: '4%',
          top: '12%',
          bottom: '12%',
          minSize: '8%',
          maxSize: '100%',
          sort: 'none',
          gap: 4,
          label: {
            show: true,
            position: 'inside',
            color: '#fff',
            fontSize: 11,
            formatter: (params: unknown) => {
              const p = params as { name?: string; value?: number }
              return `${p.name ?? ''}\n${(p.value ?? 0).toLocaleString()}`
            },
          },
          labelLine: { show: false },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
          },
          emphasis: {
            label: { fontSize: 12 },
          },
          data: sorted.map((step, index) => ({
            name: step.name,
            value: step.value,
            itemStyle: {
              color: FUNNEL_LAYER_COLORS[index % FUNNEL_LAYER_COLORS.length],
            },
          })),
        },
      ],
      // Keep typography aligned even inside funnel labels.
      textStyle: { fontFamily: CHART_THEME.fontFamily },
    }
  }, [dense, steps])

  if (steps.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full w-full min-h-0 min-w-0 items-center justify-center text-xs text-subtle',
          className,
        )}
      >
        No funnel data
      </div>
    )
  }

  return (
    <BaseChart option={option} className={className} onEvents={onEvents} />
  )
}
