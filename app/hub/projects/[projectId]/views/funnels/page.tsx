'use client'

/**
 * `[project]/views/funnels` — the project's funnel views,
 * auto-positioned (no drag, no folders — those are Overview-only).
 */

import { useParams } from 'next/navigation'
import { ProjectFilteredViews } from '../../(components)/ProjectFilteredViews'
import { useDashboard } from '@/contexts/DashboardContext'
import type { View } from '@/types/view'

const isFunnelView = (v: View) => v.type.includes('funnel')

export default function ProjectFunnelsPage() {
  const params = useParams()
  const { projects: projectsCtx } = useDashboard()
  const project = projectsCtx.projects.find(p => p.id === (params.projectId as string))
  if (!project) return null

  return (
    <ProjectFilteredViews
      project={project}
      title="Funnels"
      filter={isFunnelView}
      emptyText="No funnel views in this project yet. Create one with the Create view button on the Overview page."
    />
  )
}
