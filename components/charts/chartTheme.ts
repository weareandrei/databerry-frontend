import type { EChartsOption } from 'echarts'

export const CHART_COLORS = [
  '#FF5D78',
  '#FF7B5D',
  '#FC5327',
  '#FFA446',
  '#3D8BFD',
  '#A56AF2',
] as const

export const CHART_THEME = {
  primary: CHART_COLORS[0],
  barGradientBottom: CHART_COLORS[1],
  stroke: '#ECECF0',
  muted: '#838385',
  foreground: '#1B1B1B',
  fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
} as const

export const FUNNEL_LAYER_COLORS = ['#FF4852', '#FC5327', '#FFA446'] as const

/** Hover emphasis for `MixedChart` — dims everything except the hovered segment. */
export const MIXED_CHART_EMPHASIS = {
  focus: 'self' as const,
  itemStyle: {
    shadowBlur: 10,
    shadowColor: 'rgba(0,0,0,0.25)',
  },
}

export const MIXED_CHART_BLUR = {
  itemStyle: { opacity: 0.35 },
}

/** Gap between category slots on the overview chart. ECharts default is ~20%;
 *  sparse week/month buckets get a wider gap so bars don't look oversized. */
export function overviewBarCategoryGap(categoryCount: number): string {
  if (categoryCount <= 12) return '55%'
  if (categoryCount <= 20) return '45%'
  return '20%'
}

/** Crosshair snap labels on X/Y axes — brand pink, not ECharts' default blue-grey. */
export const AXIS_POINTER_LABEL = {
  backgroundColor: CHART_THEME.primary,
  color: '#ffffff',
  borderWidth: 0,
  borderRadius: 4,
  padding: [3, 5] as [number, number],
  fontSize: 11,
  fontWeight: 500,
}

export function brandBarGradient() {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: CHART_THEME.primary },
      { offset: 1, color: CHART_THEME.barGradientBottom },
    ],
  }
}

interface MergeOptions {
  crossAxisPointer?: boolean
}

/** Light defaults — caller option wins on conflicts. */
export function mergeChartOptions(
  option: EChartsOption,
  { crossAxisPointer = false }: MergeOptions = {},
): EChartsOption {
  const grid = {
    top: 12,
    right: 12,
    bottom: 4,
    left: 4,
    containLabel: true,
    ...(option.grid as object | undefined),
  }

  const tooltip = {
    confine: true,
    trigger: 'axis' as const,
    ...(crossAxisPointer
      ? {
          axisPointer: {
            type: 'cross' as const,
            snap: true,
            label: AXIS_POINTER_LABEL,
            lineStyle: { color: CHART_THEME.stroke, type: 'dashed' as const },
            crossStyle: { color: CHART_THEME.stroke, type: 'dashed' as const },
          },
        }
      : {}),
    ...(option.tooltip as object | undefined),
  }

  const defaultCategoryX = {
    type: 'category' as const,
    axisTick: { alignWithLabel: true },
    axisLine: { lineStyle: { color: CHART_THEME.stroke } },
    axisLabel: { color: CHART_THEME.muted, fontSize: 11, hideOverlap: true },
  }

  const defaultValueY = {
    type: 'value' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: CHART_THEME.stroke, type: 'dashed' as const } },
    axisLabel: { color: CHART_THEME.muted, fontSize: 11 },
  }

  const mergeYAxisItem = (axis: object) => ({
    ...defaultValueY,
    ...axis,
    axisLabel: {
      ...defaultValueY.axisLabel,
      ...((axis as { axisLabel?: object }).axisLabel ?? {}),
    },
    splitLine: {
      ...defaultValueY.splitLine,
      ...((axis as { splitLine?: object }).splitLine ?? {}),
      lineStyle: {
        ...defaultValueY.splitLine.lineStyle,
        ...((axis as { splitLine?: { lineStyle?: object } }).splitLine?.lineStyle ?? {}),
      },
    },
  })

  const xAxis = Array.isArray(option.xAxis)
    ? option.xAxis
    : { ...defaultCategoryX, ...(option.xAxis as object | undefined) }

  const yAxis = Array.isArray(option.yAxis)
    ? option.yAxis.map(axis => mergeYAxisItem(axis as object))
    : mergeYAxisItem((option.yAxis as object | undefined) ?? {})

  return {
    animation: false,
    color: [...CHART_COLORS],
    textStyle: {
      fontFamily: CHART_THEME.fontFamily,
      color: CHART_THEME.foreground,
    },
    ...option,
    grid,
    tooltip,
    xAxis,
    yAxis,
  }
}
