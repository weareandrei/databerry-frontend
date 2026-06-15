'use client'

/**
 * `[project]/overview` — the project's main canvas at its root,
 * rendered via the shared `<ProjectOverviewScreen>` (three stacked
 * white cards: folders / overview composite / every other view).
 * The sibling `folders/[folderId]` route renders the SAME screen
 * scoped to a folder, so entering a folder is identical wherever it
 * was opened from.
 */

import { useParams } from 'next/navigation'
import { ProjectOverviewScreen } from '../(components)/ProjectOverviewScreen'
import { useDashboard } from '@/contexts/DashboardContext'

export default function ProjectOverviewPage() {
  const params = useParams()
  const { projects: projectsCtx } = useDashboard()
  const project = projectsCtx.projects.find(p => p.id === (params.projectId as string))
  // The layout already gates on project resolution.
  if (!project) return null
  return <ProjectOverviewScreen project={project} />
}
