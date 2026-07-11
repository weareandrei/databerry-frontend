'use client'

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { BaseChart } from './BaseChart'
import {
  brandBarGradient,
  CHART_THEME,
  MIXED_CHART_BLUR,
  MIXED_CHART_EMPHASIS,
} from './chartTheme'
import type { ChartSeries, MixedChartProps } from './types'

function lineAreaStyle(color: string) {
  return {
    color: {
      type: 'linear' as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: `${color}33` },
        { offset: 1, color: `${color}00` },
      ],
    },
  }
}

export function MixedChart({
  categories,
  series,
  className,
  extraOption,
  onEvents,
}: MixedChartProps) {
  const option = useMemo((): EChartsOption => {
    const yAxisCount = Math.max(1, ...series.map(s => (s.yAxisIndex ?? 0) + 1))
    const defaultYAxis = Array.from({ length: yAxisCount }, () => ({
      type: 'value' as const,
    }))

    const builtSeries = series.map(s => {
      if (s.type === 'bar') {
        const emphasis = s.suppressEmphasis
          ? { disabled: true as const }
          : MIXED_CHART_EMPHASIS
        const blur = s.suppressEmphasis
          ? { disabled: true as const }
          : MIXED_CHART_BLUR

        return {
          type: 'bar' as const,
          name: s.name,
          data: s.data,
          yAxisIndex: s.yAxisIndex ?? 0,
          stack: s.stack,
          itemStyle: {
            color: s.color ?? brandBarGradient(),
            borderRadius: s.stack ? 0 : [4, 4, 0, 0],
          },
          ...(s.markLine ? { markLine: s.markLine } : {}),
          ...(s.barCategoryGap != null ? { barCategoryGap: s.barCategoryGap } : {}),
          emphasis,
          blur,
        }
      }

      const lineColor = s.color ?? CHART_THEME.primary
      return {
        type: 'line' as const,
        name: s.name,
        data: s.data,
        yAxisIndex: s.yAxisIndex ?? 0,
        smooth: true,
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { width: 2, color: lineColor },
        itemStyle: {
          color: '#fff',
          borderColor: lineColor,
          borderWidth: 2,
        },
        ...(s.area ? { areaStyle: lineAreaStyle(lineColor) } : {}),
        connectNulls: true,
        emphasis: MIXED_CHART_EMPHASIS,
        blur: MIXED_CHART_BLUR,
      }
    })

    return {
      ...extraOption,
      legend: {
        show: series.some(s => s.name),
        data: series.map(s => s.name).filter((n): n is string => Boolean(n)),
        ...(extraOption?.legend as object | undefined),
      },
      xAxis: {
        data: categories,
        ...(extraOption?.xAxis as object | undefined),
      },
      yAxis: extraOption?.yAxis ?? defaultYAxis,
      series: builtSeries,
    }
  }, [categories, extraOption, series])

  return (
    <BaseChart
      option={option}
      className={className}
      crossAxisPointer
      onEvents={onEvents}
    />
  )
}
