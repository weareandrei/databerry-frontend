'use client'

import { useRouter } from 'next/navigation'
import { ArrowsClockwise, DotsThreeVertical } from '@phosphor-icons/react'
import { useSelector } from 'react-redux'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { WidgetHeader } from '@/app/hub/(components)/widgets/(components)/WidgetHeader'
import { useOverviewChartData } from '@/app/hub/(components)/widgets/data/useOverviewChartData'
import { projectDisplayLabel } from '@/app/hub/project/(components)/projectViewUtils'
import { MiniMixedChart } from '@/components/charts/MiniMixedChart'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectLastSynced } from '@/hooks/useProjectLastSynced'
import { formatRelativeAgo } from '@/lib/formatRelative'
import type { RootState } from '@/store'
import type { Project } from '@/types/project'
import { cn } from '@/lib/utils'

function formatVisitors(value: number): string {
  return value.toLocaleString()
}

function formatRevenue(value: number | null | undefined): string {
  if (value == null) return '$0'
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function lastSyncedLabel(lastSyncedAt: string | null, isResyncing: boolean): string {
  if (isResyncing) return 'Syncing…'
  if (!lastSyncedAt) return 'Not synced yet'
  return `Last synced ${formatRelativeAgo(lastSyncedAt)}`
}

export function HomeProjectMiniCard({ project }: { project: Project }) {
  const router = useRouter()
  const globalDateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const globalDateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const globalDateMode = useSelector((s: RootState) => s.ui.globalDateMode)
  const { lastSyncedAt, isResyncing, refresh: refreshSync } = useProjectLastSynced(project.id)

  const { chart, loading, refresh: refreshChart } = useOverviewChartData(project.id, {
    dateFrom: globalDateFrom,
    dateTo: globalDateTo,
    mode: globalDateMode,
    primaryMetric: 'visitors',
    secondaryMetric: 'revenue',
  })

  const visitorsTotal = chart?.totalPrimary ?? 0
  const revenueTotal = chart?.totalSecondary ?? 0
  const refreshingChart = loading && chart != null
  const refreshing = refreshingChart || isResyncing

  const handleRefresh = () => {
    refreshChart()
    void refreshSync()
  }

  return (
    <article
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-stroke bg-white p-4 shadow-card',
        'transition-colors hover:border-stroke/80',
      )}
    >
      <WidgetHeader
        showDragGrip={false}
        className="mb-3 px-0 pt-0"
        icon={<ProjectIcon websiteUrl={project.websiteUrl} size={36} pill={false} />}
        header={
          <button
            type="button"
            onClick={() => router.push(`/hub/project/${project.id}`)}
            className="block min-w-0 cursor-pointer truncate text-left text-sm font-semibold text-foreground"
          >
            {projectDisplayLabel(project)}
          </button>
        }
        subHeader={lastSyncedLabel(lastSyncedAt, isResyncing)}
        subHeaderClassName="truncate text-xs text-subtle"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`${project.name} options`}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-subtle transition-colors hover:bg-hover-fill/70 hover:text-muted-foreground"
            >
              <DotsThreeVertical size={16} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2 text-sm"
              >
                <ArrowsClockwise
                  size={13}
                  weight="bold"
                  className={refreshing ? 'animate-spin' : ''}
                />
                Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        {loading ? (
          <>
            <div className="h-4 w-28 animate-pulse rounded bg-black/[0.05]" />
            <div className="h-4 w-24 animate-pulse rounded bg-black/[0.05]" />
          </>
        ) : (
          <>
            <p className="text-foreground">
              <span className="font-semibold">{formatVisitors(visitorsTotal)}</span>{' '}
              <span className="text-subtle">visitors</span>
            </p>
            <p className="text-foreground">
              <span className="font-semibold">{formatRevenue(revenueTotal)}</span>{' '}
              <span className="text-subtle">revenue</span>
            </p>
          </>
        )}
      </div>

      {loading || !chart ? (
        <div className="h-[180px] w-full animate-pulse rounded-lg bg-black/[0.04]" aria-hidden />
      ) : (
        <MiniMixedChart data={chart} />
      )}
    </article>
  )
}

export function HomeProjectMiniCardSkeleton() {
  return (
    <div
      className="flex min-w-0 flex-col rounded-xl border border-stroke bg-white p-4 shadow-card animate-pulse"
      aria-hidden
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="size-9 rounded-lg bg-black/[0.05]" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-4 w-32 rounded bg-black/[0.05]" />
          <div className="h-3 w-24 rounded bg-black/[0.05]" />
        </div>
        <div className="size-8 rounded-lg bg-black/[0.05]" />
      </div>
      <div className="mb-3 flex gap-4">
        <div className="h-4 w-28 rounded bg-black/[0.05]" />
        <div className="h-4 w-24 rounded bg-black/[0.05]" />
      </div>
      <div className="h-[180px] rounded-lg bg-black/[0.04]" />
    </div>
  )
}
