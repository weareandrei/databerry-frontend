'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { EChartsOption, MarkLineComponentOption } from 'echarts'
import { MixedChart } from '@/components/charts'
import { CHART_THEME, AXIS_POINTER_LABEL, overviewBarCategoryGap } from '@/components/charts/chartTheme'
import type { ChartDataPoint, ChartSeries } from '@/components/charts/types'
import type { OverviewBucket, OverviewChartResponse } from '@/lib/api'
import { assignChartColors, sourceStyle } from '@/constants/trafficSources'
import type { OverviewPrimaryMetric, OverviewSecondaryMetric } from '@/types/view'

interface OverviewChartProps {
  data: OverviewChartResponse
  primaryMetric: OverviewPrimaryMetric
  secondaryMetric: OverviewSecondaryMetric
  nowLabel?: string | null
  swapped?: boolean
  externalHoveredSourceKey?: string | null
  /** Panel source keys toggled off — their segments are omitted from stacked bars. */
  hiddenSourceKeys?: ReadonlySet<string>
  primaryDisplay?: { label: string; isCurrency: boolean } | null
  secondaryDisplay?: { label: string; isCurrency: boolean } | null
}

interface SourceKeyMeta {
  key: string
  color: string
  label: string
  outlined?: boolean
  logo?: string
  mergedFrom?: string[]
}

function buildSourceKeys(buckets: OverviewBucket[]): {
  sourceKeys: SourceKeyMeta[]
  mergedToOther: string[]
} {
  const labelByKey = new Map<string, { label: string; outlined?: boolean; logo?: string }>()
  const totalByKey = new Map<string, number>()

  for (const b of buckets) {
    for (const s of b.bySource) {
      if (!labelByKey.has(s.source)) {
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
  const mergedSet = new Set(palette.mergedToOther)

  const sourceKeys = palette.order.map(key => {
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
    if (key === 'other' && mergedSet.size > 0) {
      sk.mergedFrom = palette.mergedToOther
    }
    return sk
  })

  return { sourceKeys, mergedToOther: palette.mergedToOther }
}

function panelKeyToChartKey(
  panelKey: string,
  mergedToOther: string[],
  chartSourceKeys: SourceKeyMeta[],
): string | null {
  if (mergedToOther.includes(panelKey) || panelKey === 'unset') return 'other'
  if (chartSourceKeys.some(sk => sk.key === panelKey)) return panelKey
  return null
}

function segmentValue(
  bucket: OverviewBucket,
  chartSourceKey: string,
  mergedToOther: string[],
  hiddenSourceKeys: ReadonlySet<string>,
): number {
  if (chartSourceKey === 'other') {
    let sum = 0
    for (const s of bucket.bySource) {
      if (hiddenSourceKeys.has(s.source)) continue
      if (s.source === 'other' || s.source === 'unset') {
        sum += s.value
        continue
      }
      if (mergedToOther.includes(s.source)) sum += s.value
    }
    return sum
  }

  if (hiddenSourceKeys.has(chartSourceKey)) return 0
  const match = bucket.bySource.find(x => x.source === chartSourceKey)
  return match?.value ?? 0
}

function topmostSourceKey(
  bucket: OverviewBucket,
  sourceKeys: SourceKeyMeta[],
  mergedToOther: string[],
  hiddenSourceKeys: ReadonlySet<string>,
): string | null {
  for (let i = sourceKeys.length - 1; i >= 0; i--) {
    const sk = sourceKeys[i]!
    if (segmentValue(bucket, sk.key, mergedToOther, hiddenSourceKeys) > 0) return sk.key
  }
  return null
}

function computeYMax(
  buckets: OverviewBucket[],
  sourceKeys: SourceKeyMeta[],
  mergedToOther: string[],
  hiddenSourceKeys: ReadonlySet<string>,
  useStackedBars: boolean,
): number {
  let max = 0
  for (const b of buckets) {
    const rowMax = useStackedBars
      ? sourceKeys.reduce(
          (sum, sk) =>
            sum + segmentValue(b, sk.key, mergedToOther, hiddenSourceKeys),
          0,
        )
      : Math.max(b.total, b.bySource.reduce((acc, s) => acc + s.value, 0))
    if (rowMax > max) max = rowMax
  }
  if (max <= 0) return 4
  return Math.max(4, Math.ceil(max / 4) * 4)
}

function primaryLabel(m: OverviewPrimaryMetric): string {
  switch (m) {
    case 'visitors':
      return 'Visitors'
    case 'pageviews':
      return 'Pageviews'
    case 'conversions':
      return 'Conversions'
    case 'revenue':
      return 'Revenue'
  }
}

function formatPrimary(v: number, m: OverviewPrimaryMetric): string {
  if (m === 'revenue') return formatDollars(v)
  return v.toLocaleString()
}

function formatDollars(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDollarsShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${Math.round(v)}`
}

function formatSecondsShort(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0s'
  if (v < 60) return `${Math.round(v)}s`
  if (v < 3600) return `${Math.floor(v / 60)}m`
  return `${Math.floor(v / 3600)}h`
}

function yAxisFormatter(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

function secondaryLabel(m: Exclude<OverviewSecondaryMetric, null>): string {
  switch (m) {
    case 'conversion_rate':
      return 'Conversion rate'
    case 'bounce_rate':
      return 'Bounce rate'
    case 'avg_session_sec':
      return 'Avg. session'
    case 'revenue':
      return 'Revenue'
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
      return formatDollars(v)
  }
}

function sourceSwatchHtml(meta: SourceKeyMeta, size = 10): string {
  if (meta.logo) {
    return `<img src="${meta.logo}" alt="" width="${size}" height="${size}" style="border-radius:2px;flex-shrink:0" />`
  }
  const border = meta.outlined ? 'border:1px solid #d1d5db;' : ''
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:2px;background:${meta.color};flex-shrink:0;${border}"></span>`
}

function formatBarTooltipHtml(opts: {
  bucket: OverviewBucket
  sourceKeys: SourceKeyMeta[]
  primaryMetric: OverviewPrimaryMetric
  secondaryMetric: OverviewSecondaryMetric
  primaryDisplay: { label: string; isCurrency: boolean } | null
  secondaryDisplay: { label: string; isCurrency: boolean } | null
}): string {
  const {
    bucket,
    sourceKeys,
    primaryMetric,
    secondaryMetric,
    primaryDisplay,
    secondaryDisplay,
  } = opts

  const total = primaryDisplay
    ? bucket.total
    : bucket.bySource.reduce((acc, s) => acc + s.value, 0)
  const secondary = bucket.secondary
  const hasSecondary =
    secondary != null && (secondaryDisplay != null || secondaryMetric != null)
  const primaryLbl = primaryDisplay?.label ?? primaryLabel(primaryMetric)
  const secondaryLbl =
    secondaryDisplay?.label ?? (secondaryMetric ? secondaryLabel(secondaryMetric) : '')

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

  const primaryValue = primaryDisplay
    ? primaryDisplay.isCurrency
      ? formatDollars(total)
      : total.toLocaleString()
    : formatPrimary(total, primaryMetric)

  const secondaryValue =
    secondary != null
      ? secondaryDisplay
        ? secondaryDisplay.isCurrency
          ? formatDollars(secondary)
          : secondary.toLocaleString()
        : secondaryMetric
          ? formatSecondaryValue(secondary, secondaryMetric)
          : secondary.toLocaleString()
      : ''

  const sourcesHtml = sourcesSorted.length
    ? `<ul style="margin:0;padding:8px 12px;list-style:none;display:flex;flex-direction:column;gap:4px">
        ${sourcesSorted
          .map(s => {
            const meta =
              sourceKeys.find(sk => sk.key === s.source) ?? {
                key: s.source,
                label: s.label ?? s.source,
                color: sourceStyle(s.source).color,
                outlined: sourceStyle(s.source).outlined,
                logo: sourceStyle(s.source).logo,
              }
            return `<li style="display:flex;align-items:center;gap:8px">
              ${sourceSwatchHtml(meta, 10)}
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6b7280">${meta.label}</span>
              <span style="font-variant-numeric:tabular-nums;color:#1B1B1B">${s.value.toLocaleString()}</span>
            </li>`
          })
          .join('')}
      </ul>`
    : ''

  const revPerVisitorHtml =
    showRevPerVisitor && secondary != null && total > 0
      ? `<div style="display:flex;justify-content:space-between;padding:8px 12px;border-top:1px solid #ECECF0">
          <span style="color:#838385">Revenue / visitor</span>
          <span style="font-weight:600;font-variant-numeric:tabular-nums;color:#1B1B1B">$${(secondary / total).toFixed(2)}</span>
        </div>`
      : ''

  const secondaryRow =
    hasSecondary && secondary != null
      ? `<div style="display:flex;justify-content:space-between;gap:24px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:8px;height:8px;border-radius:2px;background:#FF5D78;flex-shrink:0"></span>
            <span style="font-weight:500;color:#1B1B1B">${secondaryLbl}</span>
          </div>
          <span style="font-weight:600;font-variant-numeric:tabular-nums;color:#1B1B1B">${secondaryValue}</span>
        </div>`
      : ''

  return `<div style="min-width:220px;font-size:12px;color:#1B1B1B;border:1px solid #ECECF0;border-radius:8px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden">
    <div style="padding:8px 12px;border-bottom:1px solid #ECECF0">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#838385">${bucket.label}</p>
    </div>
    <div style="padding:8px 12px;border-bottom:1px solid #ECECF0;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;justify-content:space-between;gap:24px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:8px;height:8px;border-radius:2px;background:linear-gradient(to bottom,var(--color-chart-bar-top,#FF5D78),var(--color-chart-bar-bottom,#FF7B5D));flex-shrink:0"></span>
          <span style="font-weight:500;color:#1B1B1B">${primaryLbl}</span>
        </div>
        <span style="font-weight:600;font-variant-numeric:tabular-nums;color:#1B1B1B">${primaryValue}</span>
      </div>
      ${secondaryRow}
    </div>
    ${sourcesHtml}
    ${revPerVisitorHtml}
  </div>`
}

export function OverviewChart({
  data,
  primaryMetric,
  secondaryMetric,
  nowLabel,
  swapped = false,
  externalHoveredSourceKey = null,
  hiddenSourceKeys = new Set<string>(),
  primaryDisplay = null,
  secondaryDisplay = null,
}: OverviewChartProps) {
  const { sourceKeys, mergedToOther } = useMemo(
    () => buildSourceKeys(data.buckets),
    [data.buckets],
  )

  const hasSourceBreakdown = useMemo(
    () => data.buckets.some(b => b.bySource.some(s => s.value > 0)),
    [data.buckets],
  )

  const useStackedBars =
    !swapped && !primaryDisplay && sourceKeys.length > 0 && hasSourceBreakdown

  const yMax = useMemo(
    () =>
      computeYMax(
        data.buckets,
        sourceKeys,
        mergedToOther,
        hiddenSourceKeys,
        useStackedBars,
      ),
    [data.buckets, hiddenSourceKeys, mergedToOther, sourceKeys, useStackedBars],
  )
  const hasOverlay = swapped ? true : Boolean(secondaryMetric && !data.secondaryUnavailable)

  const highlightedChartKey = useMemo(() => {
    if (!externalHoveredSourceKey || !useStackedBars) return null
    return panelKeyToChartKey(externalHoveredSourceKey, mergedToOther, sourceKeys)
  }, [externalHoveredSourceKey, mergedToOther, sourceKeys, useStackedBars])

  const [chartHoveredSegment, setChartHoveredSegment] = useState<{
    sourceKey: string
    dataIndex: number
  } | null>(null)

  const barSourceKeyBySeriesIndexRef = useRef<Map<number, string>>(new Map())

  const chartEvents = useMemo(
    () => ({
      mouseover: (params: unknown) => {
        const p = params as {
          componentType?: string
          seriesType?: string
          seriesIndex?: number
          dataIndex?: number
        }
        if (p.componentType !== 'series' || p.seriesType !== 'bar') return
        if (p.seriesIndex == null || p.dataIndex == null) return
        const sourceKey = barSourceKeyBySeriesIndexRef.current.get(p.seriesIndex)
        if (!sourceKey) return
        setChartHoveredSegment({ sourceKey, dataIndex: p.dataIndex })
      },
      mouseout: (params: unknown) => {
        const p = params as { componentType?: string; seriesType?: string }
        if (p.componentType === 'series' && p.seriesType === 'bar') {
          setChartHoveredSegment(null)
        }
      },
      globalout: () => setChartHoveredSegment(null),
    }),
    [],
  )

  const categories = useMemo(() => data.buckets.map(b => b.label), [data.buckets])
  const barData = useMemo(
    () => data.buckets.map(b => (swapped ? b.secondary : b.total)),
    [data.buckets, swapped],
  )
  const lineData = useMemo(
    () => data.buckets.map(b => (swapped ? b.total : b.secondary)),
    [data.buckets, swapped],
  )

  const leftTickFormatter = useCallback(
    (v: number) => {
      if (swapped) {
        if (secondaryDisplay) {
          return secondaryDisplay.isCurrency ? formatDollarsShort(v) : yAxisFormatter(v)
        }
        if (secondaryMetric === 'conversion_rate' || secondaryMetric === 'bounce_rate') {
          return `${Math.round(v * 100)}%`
        }
        if (secondaryMetric === 'revenue') return formatDollarsShort(v)
        if (secondaryMetric === 'avg_session_sec') return formatSecondsShort(v)
        return yAxisFormatter(v)
      }
      if (primaryDisplay) {
        return primaryDisplay.isCurrency ? formatDollarsShort(v) : yAxisFormatter(v)
      }
      return primaryMetric === 'revenue' ? formatDollarsShort(v) : yAxisFormatter(v)
    },
    [primaryDisplay, primaryMetric, secondaryDisplay, secondaryMetric, swapped],
  )

  const rightTickFormatter = useCallback(
    (v: number) => {
      if (swapped) {
        if (primaryDisplay) {
          return primaryDisplay.isCurrency ? formatDollarsShort(v) : yAxisFormatter(v)
        }
        return primaryMetric === 'revenue' ? formatDollarsShort(v) : yAxisFormatter(v)
      }
      if (secondaryDisplay) {
        return secondaryDisplay.isCurrency ? formatDollarsShort(v) : yAxisFormatter(v)
      }
      if (secondaryMetric === 'conversion_rate' || secondaryMetric === 'bounce_rate') {
        return `${Math.round(v * 100)}%`
      }
      if (secondaryMetric === 'revenue') return formatDollarsShort(v)
      if (secondaryMetric === 'avg_session_sec') return formatSecondsShort(v)
      return yAxisFormatter(v)
    },
    [primaryDisplay, primaryMetric, secondaryDisplay, secondaryMetric, swapped],
  )

  const tooltipFormatter = useCallback(
    (params: unknown) => {
      const items = Array.isArray(params) ? params : [params]
      const first = items[0] as { dataIndex?: number } | undefined
      const dataIndex = first?.dataIndex
      if (dataIndex == null || dataIndex < 0 || dataIndex >= data.buckets.length) {
        return ''
      }
      return formatBarTooltipHtml({
        bucket: data.buckets[dataIndex]!,
        sourceKeys,
        primaryMetric,
        secondaryMetric,
        primaryDisplay,
        secondaryDisplay,
      })
    },
    [
      data.buckets,
      primaryDisplay,
      primaryMetric,
      secondaryDisplay,
      secondaryMetric,
      sourceKeys,
    ],
  )

  const nowMarkLine = useMemo((): MarkLineComponentOption | undefined => {
    if (!nowLabel) return undefined
    return {
      symbol: 'none',
      silent: true,
      data: [
        {
          xAxis: nowLabel,
          label: {
            show: true,
            formatter: 'Now',
            position: 'insideEndTop' as const,
            color: CHART_THEME.primary,
            fontSize: 10,
            fontWeight: 700,
            distance: 6,
          },
          lineStyle: { color: CHART_THEME.primary, width: 2 },
        },
      ],
    }
  }, [nowLabel])

  const extraOption = useMemo((): EChartsOption => {
    const yAxes: EChartsOption['yAxis'] = [
      {
        type: 'value',
        min: 0,
        max: yMax,
        interval: yMax / 4,
        width: 36,
        axisLabel: { margin: 6, formatter: (v: number) => leftTickFormatter(v) },
      },
    ]

    if (hasOverlay) {
      yAxes.push({
        type: 'value',
        position: 'right',
        splitLine: { show: false },
        axisLabel: { formatter: (v: number) => rightTickFormatter(v) },
      })
    }

    return {
      legend: { show: false },
      grid: {
        top: 8,
        right: hasOverlay ? 4 : 0,
        left: 0,
        bottom: 28,
        containLabel: true,
      },
      tooltip: {
        show: true,
        trigger: 'axis',
        triggerOn: 'mousemove',
        confine: true,
        padding: 0,
        borderWidth: 0,
        backgroundColor: 'transparent',
        extraCssText: 'box-shadow:none;',
        axisPointer: {
          type: 'cross',
          snap: true,
          label: AXIS_POINTER_LABEL,
          lineStyle: { color: CHART_THEME.stroke, type: 'dashed' },
          crossStyle: { color: CHART_THEME.stroke, type: 'dashed' },
        },
        formatter: tooltipFormatter,
      },
      xAxis: {
        boundaryGap: true,
        axisLabel: { hideOverlap: true, margin: 12 },
      },
      yAxis: yAxes,
    }
  }, [
    hasOverlay,
    leftTickFormatter,
    rightTickFormatter,
    tooltipFormatter,
    yMax,
  ])

  const series = useMemo((): ChartSeries[] => {
    const barCategoryGap = overviewBarCategoryGap(categories.length)
    const lineSeries: ChartSeries | null = hasOverlay
      ? {
          type: 'line',
          data: lineData,
          yAxisIndex: swapped ? 0 : 1,
          color: CHART_THEME.primary,
          area: true,
        }
      : null

    if (useStackedBars) {
      const stacked: ChartSeries[] = []
      const keyBySeriesIndex = new Map<number, string>()
      let barSeriesIndex = 0

      for (const sk of sourceKeys) {
        const seriesData = data.buckets.map((bucket, dataIndex) => {
          const value = segmentValue(bucket, sk.key, mergedToOther, hiddenSourceKeys)
          const isTop =
            topmostSourceKey(bucket, sourceKeys, mergedToOther, hiddenSourceKeys) ===
            sk.key

          const panelHighlight = highlightedChartKey === sk.key
          const segmentHighlight =
            chartHoveredSegment?.sourceKey === sk.key &&
            chartHoveredSegment.dataIndex === dataIndex
          const isHighlighted = panelHighlight || segmentHighlight
          const isDimmed =
            highlightedChartKey != null && highlightedChartKey !== sk.key

          const point: ChartDataPoint = {
            value,
            itemStyle: {
              color: sk.color,
              borderRadius: isTop && value > 0 ? [4, 4, 0, 0] : 0,
              opacity: isDimmed ? 0.32 : 1,
              ...(isHighlighted
                ? {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0,0,0,0.2)',
                  }
                : {}),
              ...(sk.outlined && sk.color === '#ffffff'
                ? { borderColor: '#ECECF0', borderWidth: 1 }
                : {}),
            },
          }
          return point
        })

        const hasVisibleData = seriesData.some(d => {
          const v = typeof d === 'object' && d && 'value' in d ? d.value : d
          return (v ?? 0) > 0
        })
        if (!hasVisibleData) continue

        keyBySeriesIndex.set(barSeriesIndex, sk.key)
        barSeriesIndex += 1

        stacked.push({
          type: 'bar',
          name: sk.label,
          stack: 'sources',
          color: sk.color,
          yAxisIndex: 0,
          data: seriesData,
          suppressEmphasis: true,
          barCategoryGap,
        })
      }

      if (stacked.length > 0 && nowMarkLine) {
        stacked[0] = { ...stacked[0]!, markLine: nowMarkLine }
      }

      barSourceKeyBySeriesIndexRef.current = keyBySeriesIndex

      return lineSeries ? [...stacked, lineSeries] : stacked
    }

    const singleBar: ChartSeries = {
      type: 'bar',
      data: barData,
      yAxisIndex: swapped ? 1 : 0,
      markLine: nowMarkLine,
      barCategoryGap,
    }

    return lineSeries ? [singleBar, lineSeries] : [singleBar]
  }, [
    barData,
    categories.length,
    data.buckets,
    hasOverlay,
    hiddenSourceKeys,
    highlightedChartKey,
    chartHoveredSegment,
    lineData,
    mergedToOther,
    nowMarkLine,
    sourceKeys,
    swapped,
    useStackedBars,
  ])

  return (
    <div className="relative h-full w-full">
      <MixedChart
        categories={categories}
        series={series}
        extraOption={extraOption}
        onEvents={useStackedBars ? chartEvents : undefined}
      />
    </div>
  )
}
