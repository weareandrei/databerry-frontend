'use client'

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { BaseChart } from './BaseChart'
import { brandBarGradient, CHART_THEME } from './chartTheme'
import type { SimpleChartProps } from './types'

function resolveYMax(
  data: Array<number | null>,
  yAxisMax?: number | ((dataMax: number) => number),
): number | undefined {
  const numeric = data.filter((v): v is number => v != null && Number.isFinite(v))
  const dataMax = numeric.length ? Math.max(...numeric) : 0
  if (yAxisMax == null) return undefined
  return typeof yAxisMax === 'function' ? yAxisMax(dataMax) : yAxisMax
}

export function SimpleChart({
  type,
  categories,
  data,
  name,
  color,
  className,
  yAxisTickFormatter,
  yAxisMax,
  fillArea = false,
  onEvents,
}: SimpleChartProps) {
  const lineColor = color ?? CHART_THEME.primary

  const option = useMemo((): EChartsOption => {
    const max = resolveYMax(data, yAxisMax)
    const yAxis =
      max != null || yAxisTickFormatter
        ? {
            min: 0,
            width: type === 'bar' ? 44 : undefined,
            ...(max != null ? { max, interval: max / 4 } : {}),
            ...(yAxisTickFormatter
              ? {
                  axisLabel: {
                    align: 'right' as const,
                    margin: 6,
                    formatter: (v: number) => yAxisTickFormatter(v),
                  },
                }
              : {}),
          }
        : undefined

    if (type === 'bar') {
      return {
        grid: {
          top: 6,
          left: 0,
          right: 0,
          bottom: 14,
          containLabel: true,
        },
        xAxis: { data: categories },
        yAxis,
        series: [
          {
            type: 'bar',
            name,
            data,
            itemStyle: {
              color: color ?? brandBarGradient(),
              borderRadius: [4, 4, 0, 0],
            },
            emphasis: {
              itemStyle: {
                color: color ?? brandBarGradient(),
                opacity: 1,
              },
            },
            blur: {
              itemStyle: { opacity: 0.45 },
            },
          },
        ],
      }
    }

    return {
      xAxis: { data: categories, boundaryGap: false },
      yAxis,
      series: [
        {
          type: 'line',
          name,
          data,
          smooth: true,
          showSymbol: true,
          symbolSize: 8,
          lineStyle: { width: 2, color: lineColor },
          itemStyle: {
            color: '#fff',
            borderColor: lineColor,
            borderWidth: 2,
          },
          ...(fillArea
            ? {
                areaStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: `${lineColor}40` },
                      { offset: 1, color: `${lineColor}00` },
                    ],
                  },
                },
              }
            : {}),
          connectNulls: true,
        },
      ],
    }
  }, [categories, color, data, fillArea, lineColor, name, type, yAxisMax, yAxisTickFormatter])

  return (
    <BaseChart option={option} className={className} onEvents={onEvents} />
  )
}
