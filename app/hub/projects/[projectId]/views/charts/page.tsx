'use client'

/**
 * `[project]/views/charts` — every chart-shaped view in the project,
 * auto-positioned (no drag, no folders — those are Overview-only).
 */

import { useParams } from 'next/navigation'
import { ProjectFilteredViews } from '../../(components)/ProjectFilteredViews'
import { useDashboard } from '@/contexts/DashboardContext'
import type { View } from '@/types/view'

// Chart-shaped view types: the standalone "Chart" tiles plus the
// project-overview chart half (its sources sibling is a panel, not
// a chart, so it stays out).
// Only user-created "Chart" views — NOT the default `project_overview`
// chart (that's the headline composite on the overview page, not
// something the user added to their Charts list).
const isChartView = (v: View) => v.type === 'custom_chart'

export default function ProjectChartsPage() {
  const params = useParams()
  const { projects: projectsCtx } = useDashboard()
  const project = projectsCtx.projects.find(p => p.id === (params.projectId as string))
  if (!project) return null

  return (
    <ProjectFilteredViews
      project={project}
      title="Charts"
      filter={isChartView}
      emptyText="No chart views in this project yet. Create one with the Create view button."
    />
  )
}
