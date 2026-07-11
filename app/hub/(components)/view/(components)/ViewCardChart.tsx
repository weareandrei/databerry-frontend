'use client'

import { useState } from 'react'
import { SimpleChart } from '@/components/charts'
import {
  FALLBACK_INTEGRATION_BAR,
  INTEGRATION_BAR_COLORS,
} from '@/components/charts/integrationColors'
import type { ChartPoint } from '@/components/charts/types'
import { SkeletonBlock } from './ViewSkeleton'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import type { View } from '@/types/view'
import { formatChartValue, formatChartAxisTick, isMoneyViewType } from '@/utils/formatters'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { ConnectionMissingError } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'

export type { ChartPoint }

const VIEW_TITLES: Record<string, string> = {
  stripe_gross_today: "Today's Gross Volume",
  stripe_gross_week: 'This Week Gross Volume',
}

interface ViewCardChartProps {
  view: View
  onUntrack?: (id: string) => void
  points: ChartPoint[]
  loading: boolean
  error: ViewResourceError | null
  total: number | null
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  onConnectionAssigned?: (updated: View) => void
  chromeless?: boolean
  dense?: boolean
}

export function ViewCardChart({
  view,
  onUntrack,
  points,
  loading,
  error,
  total,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
  chromeless = false,
  dense = false,
}: ViewCardChartProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing
  const title = VIEW_TITLES[view.type] ?? view.name
  const barColor = INTEGRATION_BAR_COLORS[view.connectionType] ?? FALLBACK_INTEGRATION_BAR
  const connectionLabel =
    CONNECTION_DISPLAY_NAMES[view.connectionType] ?? view.connectionType

  const categories = points.map(p => p.label)
  const values = points.map(p => p.value)

  return (
    <>
      <ViewWrapper
        className={`col-span-2 ${dense ? 'row-span-3' : 'row-span-2'}`}
        variant={chromeless ? 'borderless' : 'default'}
      >
        <ViewHeader
          name={title}
          connectionType={view.connectionType}
          connectionLabel={connectionLabel}
          isDisconnected={isDisconnected}
          isConnectionMissing={isConnectionMissing}
          onReconnect={() => setReassignOpen(true)}
          onUntrack={onUntrack}
          viewId={view.id}
          projectName={projectName}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onPin={onPin}
          isPinned={isPinned}
          dense={dense}
          view={view}
          onUpdated={onConnectionAssigned}
        />

        <div data-no-dnd="true" className="flex flex-1 min-h-0 flex-col px-4">
          <div className="mt-2 shrink-0">
            {loading ? (
              <SkeletonBlock className="h-7 w-24" />
            ) : needsReattach ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setReassignOpen(true)
                }}
                className="self-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                aria-label="Attach a connection to this view"
              >
                <FetchErrorBadge message="Connection missing — click to reattach" />
              </button>
            ) : error ? (
              <FetchErrorBadge message="Couldn't load value" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums leading-none">
                {total != null ? formatChartValue(total, view.type) : '—'}
              </p>
            )}
          </div>

          <div className="mt-2 min-h-0 flex-1 pb-4">
            {loading && <SkeletonBlock className="h-full w-full" />}
            {!loading && error && (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Could not load chart data
              </div>
            )}
            {!loading && !error && points.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No data in this date range.
                </p>
              </div>
            )}
            {!loading && !error && points.length > 0 && (
              <SimpleChart
                type="bar"
                categories={categories}
                data={values}
                color={barColor.base}
                yAxisTickFormatter={v => formatChartAxisTick(v, view.type)}
                yAxisMax={dataMax => {
                  if (!dataMax || dataMax <= 0) {
                    return isMoneyViewType(view.type) ? 400 : 4
                  }
                  const padded = dataMax * 1.15
                  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)))
                  return Math.ceil(padded / magnitude) * magnitude
                }}
              />
            )}
          </div>
        </div>
      </ViewWrapper>

      <ReassignConnectionDialog
        view={view}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onAssigned={onConnectionAssigned}
      />
    </>
  )
}
