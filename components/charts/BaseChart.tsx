'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { cn } from '@/lib/utils'
import { mergeChartOptions } from './chartTheme'
import type { BaseChartProps } from './types'

export function BaseChart({
  option,
  className,
  crossAxisPointer = false,
  onEvents,
}: BaseChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = echarts.init(el, undefined, { renderer: 'svg' })
    chartRef.current = chart

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(el)

    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption(mergeChartOptions(option, { crossAxisPointer }), { notMerge: true })
  }, [option, crossAxisPointer])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onEvents) return

    const entries = Object.entries(onEvents)
    for (const [event, handler] of entries) {
      chart.on(event, handler as (...args: unknown[]) => void)
    }
    return () => {
      for (const [event, handler] of entries) {
        chart.off(event, handler as (...args: unknown[]) => void)
      }
    }
  }, [onEvents])

  return (
    <div ref={containerRef} className={cn('h-full w-full min-h-0 min-w-0', className)} />
  )
}

export type { ECharts, EChartsOption }
