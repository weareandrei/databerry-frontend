'use client'

/**
 * `/hub/project/[id]/timeline` — project-wide session timeline. Shows
 * when people used the platform in the selected date range, with
 * avatar, traffic source, and session duration where available.
 */

import { useParams } from 'next/navigation'
import { ChartLineUp } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { ProjectPageShell } from '@/app/hub/project/(components)/ProjectPageShell'
import { ProjectSessionsTimeline } from '@/app/hub/project/(components)/session-timeline/ProjectSessionsTimeline'

export default function ProjectTimelinePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { projects: projectsCtx } = useDashboard()
  const project = projectsCtx.projects.find(p => p.id === projectId)

  if (!project) return null

  return (
    <ProjectPageShell
      project={project}
      pageLabel="Timeline"
      pageIcon={ChartLineUp}
      showCreateViewButton={false}
      showDateSelect
    >
      <div className="flex flex-1 min-h-0 flex-col bg-white px-3 pb-4 pt-2 md:px-6">
        <ProjectSessionsTimeline projectId={projectId} />
      </div>
    </ProjectPageShell>
  )
}
