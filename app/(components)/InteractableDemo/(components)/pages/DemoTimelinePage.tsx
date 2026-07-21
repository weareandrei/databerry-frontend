'use client'

/**
 * Demo project Timeline page — mirror of
 * `/hub/project/[id]/timeline`. Renders the real `<TimelineView>` +
 * session cards (avatars, source, duration) fed by hand-crafted demo
 * sessions so visitors see the same vertical + horizontal packing as
 * the live dashboard.
 */

import { useCallback, useMemo } from 'react'
import { ChartLineUp } from '@phosphor-icons/react'
import {
  TimelineView,
  type TimelineZoom,
} from '@/components/TimelineView'
import {
  PROJECT_SESSION_CARD_HEIGHT,
  PROJECT_SESSION_CARD_WIDTH,
  renderProjectSessionNode,
} from '@/app/hub/project/(components)/session-timeline/ProjectSessionNodeCard'
import { isInDateRange } from '@/app/hub/project/(components)/session-timeline/projectSessions'
import type { DateMode } from '@/types/dates'
import { useDemoContext, type DemoProject } from '../context/DemoContext'
import { DemoProjectPageHeader } from '../DemoProjectPageHeader'
import { DemoMobileTopBar } from '../DemoMobileTopBar'
import { demoProjectLabel } from '../demoProjectUtils'
import { buildDemoSessionNodes } from '../demoPeopleData'

const ZOOM_TO_MODE: Record<TimelineZoom, DateMode> = {
  day: 'daily',
  week: 'weekly',
  month: 'monthly',
}

const MODE_TO_ZOOM: Record<DateMode, TimelineZoom> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
}

interface DemoTimelinePageProps {
  project: DemoProject
}

export function DemoTimelinePage({ project }: DemoTimelinePageProps) {
  const {
    globalDate,
    setGlobalDateMode,
    goToPage,
    renameProject,
    deleteProject,
  } = useDemoContext()

  const zoom = MODE_TO_ZOOM[globalDate.mode]

  const handleZoomChange = useCallback(
    (next: TimelineZoom) => {
      setGlobalDateMode(ZOOM_TO_MODE[next])
    },
    [setGlobalDateMode],
  )

  const nodes = useMemo(() => {
    const all = buildDemoSessionNodes(project.id)
    return all.filter(
      n =>
        isInDateRange(n.at, globalDate.from, globalDate.to) ||
        (n.endAt != null && isInDateRange(n.endAt, globalDate.from, globalDate.to)),
    )
  }, [project.id, globalDate.from, globalDate.to])

  return (
    <>
      <DemoMobileTopBar
        variant="project"
        projectName={demoProjectLabel(project)}
        projectWebsiteUrl={project.websiteUrl}
        projectLogoSrc={project.logoSrc}
      />
      <DemoProjectPageHeader
        project={project}
        pageLabel="Timeline"
        pageIcon={ChartLineUp}
        showCreateViewButton={false}
        onBack={() => goToPage('home')}
        onCreateView={() => {}}
        onEditProject={() => {
          const next = window.prompt('Rename project', project.name)?.trim()
          if (next) renameProject(project.id, next)
        }}
        onDeleteProject={() => {
          if (
            window.confirm(
              `Delete "${project.name}"? This removes its folders + views.`,
            )
          ) {
            deleteProject(project.id)
          }
        }}
      />
      <div className="flex flex-1 min-h-0 flex-col bg-white px-3 pb-4 pt-2 md:px-6">
        {nodes.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-foreground">No sessions in this period</p>
            <p className="mt-1 max-w-sm text-xs text-subtle">
              Try widening the date range — demo sessions sit between Apr 2 and Apr 8, 2026.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col">
            <TimelineView
              nodes={nodes}
              nodeWidth={PROJECT_SESSION_CARD_WIDTH}
              estNodeHeight={PROJECT_SESSION_CARD_HEIGHT}
              viewportSize="fill"
              zoom={zoom}
              onZoomChange={handleZoomChange}
              showZoomControl={false}
              timeRange={{ from: globalDate.from, to: globalDate.to }}
              renderNode={renderProjectSessionNode}
            />
          </div>
        )}
      </div>
    </>
  )
}
