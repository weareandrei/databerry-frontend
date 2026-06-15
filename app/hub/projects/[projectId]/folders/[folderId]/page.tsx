'use client'

/**
 * `[project]/folders/[folderId]` — a folder's contents, rendered with
 * the SAME `<ProjectOverviewScreen>` as the project root (folders card
 * scoped to subfolders + back/breadcrumb, then the folder's views).
 * Folder navigation is route-driven, so opening a folder from the
 * body grid or the sidebar lands here identically, and the sidebar
 * marks this folder active.
 *
 * Guard: a stale / cross-project / deleted folder id bounces back to
 * the project overview rather than rendering an empty mystery view.
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProjectOverviewScreen } from '../../(components)/ProjectOverviewScreen'
import { useDashboard } from '@/contexts/DashboardContext'

export default function ProjectFolderPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const folderId = params.folderId as string
  const router = useRouter()
  const { projects: projectsCtx, folders: foldersCtx } = useDashboard()

  const project = projectsCtx.projects.find(p => p.id === projectId)
  const folder = foldersCtx.folders.find(f => f.id === folderId)
  const invalid = !foldersCtx.loading && (!folder || folder.projectId !== projectId)

  useEffect(() => {
    if (invalid) router.replace(`/hub/projects/${projectId}/overview`)
  }, [invalid, router, projectId])

  if (!project) return null
  return <ProjectOverviewScreen project={project} folderId={folderId} />
}
