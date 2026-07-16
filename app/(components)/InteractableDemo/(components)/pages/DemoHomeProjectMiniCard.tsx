'use client'

/**
 * Demo twin of hub `HomeProjectMiniCard`. Same chrome (WidgetHeader,
 * metrics row, 180px MiniMixedChart) — data comes from DemoContext
 * instead of Redux / live overview API.
 */

import { useMemo } from 'react'
import { ArrowsClockwise, DotsThreeVertical } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { WidgetHeader } from '@/app/hub/(components)/widgets/(components)/WidgetHeader'
import { MiniMixedChart } from '@/components/charts/MiniMixedChart'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { demoProjectLabel } from '../demoProjectUtils'
import { MOCK_OVERVIEW_CHARTS } from '../demoMocks'
import { buildOverviewChart, useDemoContext } from '../context/DemoContext'
import type { DemoProject } from '../context/DemoContext'

function formatVisitors(value: number): string {
  return value.toLocaleString()
}

function formatRevenue(value: number | null | undefined): string {
  if (value == null) return '$0'
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

interface DemoHomeProjectMiniCardProps {
  project: DemoProject
  onOpenProject: () => void
}

export function DemoHomeProjectMiniCard({
  project,
  onOpenProject,
}: DemoHomeProjectMiniCardProps) {
  const { globalDate, timeSeries, showNotice } = useDemoContext()

  const chart = useMemo(() => {
    if (timeSeries.length === 0) return MOCK_OVERVIEW_CHARTS[project.id] ?? null
    return buildOverviewChart(
      project.id,
      globalDate,
      timeSeries,
      'visitors',
      'revenue',
    )
  }, [project.id, globalDate, timeSeries])

  const visitorsTotal = chart?.totalPrimary ?? 0
  const revenueTotal = chart?.totalSecondary ?? 0

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
        icon={
          <ProjectIcon
            websiteUrl={project.websiteUrl}
            logoSrc={project.logoSrc}
            size={36}
            pill={false}
          />
        }
        header={
          <button
            type="button"
            onClick={onOpenProject}
            className="block min-w-0 cursor-pointer truncate text-left text-sm font-semibold text-foreground"
          >
            {demoProjectLabel(project)}
          </button>
        }
        subHeader="Last synced 2h ago"
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
                onClick={() =>
                  showNotice("This feature isn't available in the demo.")
                }
                className="gap-2 text-sm"
              >
                <ArrowsClockwise size={13} weight="bold" />
                Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <p className="text-foreground">
          <span className="font-semibold">{formatVisitors(visitorsTotal)}</span>{' '}
          <span className="text-subtle">visitors</span>
        </p>
        <p className="text-foreground">
          <span className="font-semibold">{formatRevenue(revenueTotal)}</span>{' '}
          <span className="text-subtle">revenue</span>
        </p>
      </div>

      {chart ? (
        <MiniMixedChart data={chart} />
      ) : (
        <div className="h-[180px] w-full animate-pulse rounded-lg bg-black/[0.04]" aria-hidden />
      )}
    </article>
  )
}
