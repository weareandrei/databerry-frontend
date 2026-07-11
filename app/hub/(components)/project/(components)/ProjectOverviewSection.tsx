'use client'

import { OverviewComposite } from './ProjectBodyViews'
import { PROJECT_VIEW_SURFACE_WRAP } from './projectViewUtils'
import type { DateMode } from '@/types/dates'
import type { View } from '@/types/view'

interface ProjectOverviewSectionProps {
  showOverviewBlock: boolean
  loading: boolean
  chartView: View | undefined
  sourcesView: View | undefined
  dateFrom: string
  dateTo: string
  mode: DateMode
  onUntrack: (viewId: string) => void
  onPin: (viewId: string) => void
}

export function ProjectOverviewSection({
  showOverviewBlock,
  loading,
  chartView,
  sourcesView,
  dateFrom,
  dateTo,
  mode,
  onUntrack,
  onPin,
}: ProjectOverviewSectionProps) {
  if (!showOverviewBlock) return null

  return (
    <div className={PROJECT_VIEW_SURFACE_WRAP}>
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(240px,320px)]">
          <div className="min-h-[420px] animate-pulse rounded-2xl bg-black/[0.05]" />
          <div className="min-h-[420px] animate-pulse rounded-2xl bg-black/[0.05]" />
        </div>
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
            handlePin={onPin}
          />
        )
      )}
    </div>
  )
}
