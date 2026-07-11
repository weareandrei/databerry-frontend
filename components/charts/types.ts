import type { EChartsOption, MarkLineComponentOption } from 'echarts'

export interface ChartPoint {
  label: string
  value: number
}

export interface FunnelStep {
  name: string
  value: number
  conversionFromStart?: number
}

export type ChartDataPoint =
  | number
  | null
  | {
      value: number | null
      itemStyle?: {
        color?: string
        borderRadius?: number | number[]
        borderColor?: string
        borderWidth?: number
        opacity?: number
        shadowBlur?: number
        shadowColor?: string
      }
    }

export interface ChartSeries {
  type: 'bar' | 'line'
  name?: string
  data: ChartDataPoint[]
  yAxisIndex?: number
  color?: string
  /** Stack group id — bars with the same id stack together. */
  stack?: string
  /** Fill area under a line series (overview overlay). */
  area?: boolean
  markLine?: MarkLineComponentOption
  /** Skip ECharts axis-hover emphasis — caller drives per-segment highlight. */
  suppressEmphasis?: boolean
  /** ECharts `barCategoryGap` — space between category slots (e.g. `'40%'`). */
  barCategoryGap?: string | number
}

export interface BaseChartProps {
  option: EChartsOption
  className?: string
  /** Crosshair pointer on hover. Default false. */
  crossAxisPointer?: boolean
  onEvents?: Record<string, (params: unknown) => void>
}

export interface SimpleChartProps {
  type: 'bar' | 'line'
  categories: string[]
  data: Array<number | null>
  name?: string
  color?: string
  className?: string
  yAxisTickFormatter?: (value: number) => string
  yAxisMax?: number | ((dataMax: number) => number)
  /** Gradient fill under a line series. */
  fillArea?: boolean
  onEvents?: Record<string, (params: unknown) => void>
}

export interface MixedChartProps {
  categories: string[]
  series: ChartSeries[]
  className?: string
  extraOption?: EChartsOption
  onEvents?: Record<string, (params: unknown) => void>
}
