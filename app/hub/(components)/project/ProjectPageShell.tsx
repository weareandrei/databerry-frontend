'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Icon } from '@phosphor-icons/react'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar/MobileTopBar'
import { EditProjectDialog } from '@/app/hub/(components)/project/(components)/EditProjectDialog'
import { DeleteProjectDialog } from '@/app/hub/(components)/project/(components)/DeleteProjectDialog'
import { ProjectPageHeader } from '@/app/hub/(components)/project/(components)/ProjectPageHeader'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useDashboard } from '@/contexts/DashboardContext'
import type { Project } from '@/types/project'

interface ProjectPageShellProps {
  project: Project
  pageLabel: string
  pageIcon: Icon
  /** Current folder from the route — `null` = project root. */
  folderId?: string | null
  children: ReactNode
}

export function ProjectPageShell({
  project,
  pageLabel,
  pageIcon,
  folderId = null,
  children,
}: ProjectPageShellProps) {
  const router = useRouter()
  const { projects: projectsCtx, views: viewsCtx } = useDashboard()
  const { enforceViewLimit } = usePlanLimits()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const openCreateView = () => {
    const projectViewCount = viewsCtx.views.filter(v => v.projectId === project.id).length
    if (!enforceViewLimit(projectViewCount)) return
    viewsCtx.openModal(folderId, project.id)
  }

  return (
    <div className="flex h-[calc(100dvh-60px)] flex-col md:h-screen">
      <MobileTopBar
        variant="project"
        projectName={project.name}
        projectWebsiteUrl={project.websiteUrl}
        onBack={() => router.push('/hub/home')}
      />
      <ProjectPageHeader
        project={project}
        pageLabel={pageLabel}
        pageIcon={pageIcon}
        onCreateView={openCreateView}
        onEditProject={() => setEditOpen(true)}
        onDeleteProject={() => setDeleteOpen(true)}
      />
      {children}

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={patch => projectsCtx.editProject(project.id, patch)}
      />
      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={async () => {
          await projectsCtx.deleteProject(project.id)
          router.replace('/hub/home')
        }}
      />
    </div>
  )
}
