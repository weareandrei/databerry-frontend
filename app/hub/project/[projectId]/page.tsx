'use client'

/**
 * `/hub/project/[id]` — project root: folders, overview composite,
 * people, and view tiles.
 */

import { Gauge } from '@phosphor-icons/react'
import { useParams } from 'next/navigation'
import { ProjectPageBody } from '@/app/hub/(components)/project/ProjectPageBody'
import { ProjectPageShell } from '@/app/hub/(components)/project/ProjectPageShell'
import { useDashboard } from '@/contexts/DashboardContext'

export default function ProjectOverviewPage() {
  const params = useParams()
  const { projects: projectsCtx } = useDashboard()
  const project = projectsCtx.projects.find(p => p.id === (params.projectId as string))
  if (!project) return null

  return (
    <ProjectPageShell project={project} pageLabel="Overview" pageIcon={Gauge} folderId={null}>
      <ProjectPageBody project={project} folderId={null} />
    </ProjectPageShell>
  )
}
