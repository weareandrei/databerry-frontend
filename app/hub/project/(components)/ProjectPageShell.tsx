'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Icon } from '@phosphor-icons/react'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar/MobileTopBar'
import { DashboardHeader } from '@/app/hub/(components)/navigation/DashboardHeader'
import { EditProjectDialog } from './EditProjectDialog'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import { ProjectPageBreadcrumbs } from './ProjectPageBreadcrumbs'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useDashboard } from '@/contexts/DashboardContext'
import type { Project } from '@/types/project'

interface ProjectPageShellProps {
  project: Project
  pageLabel: string
  pageIcon: Icon
  /** Current folder from the route — `null` = project root. */
  folderId?: string | null
  showCreateViewButton?: boolean
  showCreateConnectionButton?: boolean
  onCreateConnection?: () => void
  showDateSelect?: boolean
  showProjectMenu?: boolean
  children: ReactNode
}

export function ProjectPageShell({
  project,
  pageLabel,
  pageIcon,
  folderId = null,
  showCreateViewButton = true,
  showCreateConnectionButton = false,
  onCreateConnection,
  showDateSelect = true,
  showProjectMenu = true,
  children,
}: ProjectPageShellProps) {
  const router = useRouter()
  const { projects: projectsCtx, widgets: widgetsCtx } = useDashboard()
  const { enforceViewLimit } = usePlanLimits()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const openCreateView = () => {
    const projectViewCount = widgetsCtx.widgets.filter(v => v.projectId === project.id).length
    if (!enforceViewLimit(projectViewCount)) return
    widgetsCtx.openModal(folderId, project.id)
  }

  return (
    <div className="flex h-[calc(100dvh-60px)] flex-col bg-white lg:h-screen">
      <MobileTopBar
        variant="project"
        projectName={project.name}
        projectId={project.id}
        projectWebsiteUrl={project.websiteUrl}
      />
      <DashboardHeader
        breadcrumbs={
          <ProjectPageBreadcrumbs
            project={project}
            pageLabel={pageLabel}
            pageIcon={pageIcon}
          />
        }
        showCreateViewButton={showCreateViewButton}
        onCreateView={showCreateViewButton ? openCreateView : undefined}
        showCreateConnectionButton={showCreateConnectionButton}
        onCreateConnection={onCreateConnection}
        showDateSelect={showDateSelect}
        showProjectMenu={showProjectMenu}
        onEditProject={showProjectMenu ? () => setEditOpen(true) : undefined}
        onDeleteProject={showProjectMenu ? () => setDeleteOpen(true) : undefined}
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
