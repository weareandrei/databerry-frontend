'use client'

import { OverviewComposite } from '@/app/hub/(components)/views/WidgetsView'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'
import { OverviewChartWidgetConnected } from '@/app/hub/(components)/widgets/overview/OverviewChartWidgetConnected'
import {
  PROJECT_OVERVIEW_CHART_PANE,
  PROJECT_OVERVIEW_LAYOUT_GRID,
} from './projectViewUtils'
import type { DateMode } from '@/types/dates'
import type { Widget } from '@/types/widget'

interface ProjectOverviewWidgetProps {
  showOverviewBlock: boolean
  loading: boolean
  chartView: Widget | undefined
  sourcesView: Widget | undefined
  dateFrom: string
  dateTo: string
  mode: DateMode
  onUntrack: (viewId: string) => void
  variant?: 'composite' | 'chart-only'
}

/** Project-level overview surface — not a grid view tile. */
export function ProjectOverviewWidget({
  showOverviewBlock,
  loading,
  chartView,
  sourcesView,
  dateFrom,
  dateTo,
  mode,
  onUntrack,
  variant = 'composite',
}: ProjectOverviewWidgetProps) {
  if (!showOverviewBlock) return null

  const chartOnly = variant === 'chart-only'

  return (
    <ViewWrapper>
      {loading ? (
        chartOnly ? (
          <div className="min-h-[420px] animate-pulse rounded-2xl bg-black/[0.05]" />
        ) : (
          <div className={PROJECT_OVERVIEW_LAYOUT_GRID}>
            <div className="min-h-[420px] animate-pulse rounded-2xl bg-black/[0.05]" />
            <div className="min-h-[420px] animate-pulse rounded-2xl bg-black/[0.05]" />
          </div>
        )
      ) : chartOnly ? (
        chartView && (
          <div className={PROJECT_OVERVIEW_CHART_PANE}>
            <OverviewChartWidgetConnected
              view={chartView}
              dateFrom={dateFrom}
              dateTo={dateTo}
              mode={mode}
              onUntrack={() => onUntrack(chartView.id)}
              fillHeight={false}
            />
          </div>
        )
      ) : (
        chartView &&
        sourcesView && (
          <OverviewComposite
            chartView={chartView}
            sourcesView={sourcesView}
            dateFrom={dateFrom}
            dateTo={dateTo}
            mode={mode}
            handleUntrack={onUntrack}
          />
        )
      )}
    </ViewWrapper>
  )
}
