'use client'

/**
 * `[project]/folder/[folderId]` — folder contents: subfolder grid and
 * view tiles. Same building blocks as the project root; overview +
 * people are omitted at folder depth.
 *
 * Guard: stale / cross-project / deleted folder ids bounce to project root.
 */

import { useEffect } from 'react'
import { FolderSimple } from '@phosphor-icons/react'
import { useParams, useRouter } from 'next/navigation'
import { ProjectPageBody } from '@/app/hub/project/(components)/ProjectPageBody'
import { ProjectPageShell } from '@/app/hub/project/(components)/ProjectPageShell'
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
    if (invalid) router.replace(`/hub/project/${projectId}`)
  }, [invalid, router, projectId])

  if (!project || invalid || !folder) return null

  return (
    <ProjectPageShell
      project={project}
      pageLabel={folder.name}
      pageIcon={FolderSimple}
      folderId={folderId}
    >
      <ProjectPageBody project={project} folderId={folderId} />
    </ProjectPageShell>
  )
}
