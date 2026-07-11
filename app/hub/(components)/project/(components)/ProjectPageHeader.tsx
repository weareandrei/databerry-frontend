'use client'

/**
 * Desktop header for project overview / folder pages — breadcrumb
 * trail on the left; date controls, Create view, and project menu on
 * the right. Only the back arrow is interactive on the left; project
 * name and page label are decorative.
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft, CaretRight, Plus } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { GlobalDateChange } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateChange'
import { GlobalDateModeDropdown } from '@/app/hub/home/(components)/GlobalDateChanger/(components)/GlobalDateModeDropdown'
import { broadcastViewRefresh } from '@/lib/viewRefreshBus'
import { ProjectMenu } from './ProjectMenu'
import { projectDisplayLabel } from './projectViewUtils'
import type { Project } from '@/types/project'

export interface ProjectPageHeaderProps {
  project: Project
  pageLabel: string
  pageIcon: Icon
  onCreateView: () => void
  onEditProject: () => void
  onDeleteProject: () => void
}

export function ProjectPageHeader({
  project,
  pageLabel,
  pageIcon: PageIcon,
  onCreateView,
  onEditProject,
  onDeleteProject,
}: ProjectPageHeaderProps) {
  const router = useRouter()

  return (
    <header className="hidden md:flex shrink-0 items-center gap-3 border-b border-stroke bg-white px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/hub/home')}
          className="shrink-0 text-subtle transition-colors hover:text-muted-foreground cursor-pointer"
          aria-label="All projects"
        >
          <ArrowLeft size={16} weight="regular" />
        </button>

        <span className="h-4 w-px shrink-0 bg-stroke" aria-hidden="true" />

        <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
          <ProjectIcon websiteUrl={project.websiteUrl} size={20} pill={false} />
          <span className="truncate text-sm font-bold text-foreground">
            {projectDisplayLabel(project)}
          </span>
        </div>

        <CaretRight size={10} weight="bold" className="shrink-0 text-subtle" aria-hidden="true" />

        <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
          <PageIcon size={16} weight="bold" className="shrink-0 text-foreground" />
          <span className="truncate text-sm font-bold text-foreground">{pageLabel}</span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-3">
        <GlobalDateChange />
        <GlobalDateModeDropdown />
      </div>

      <span className="h-6 w-px shrink-0 bg-stroke" aria-hidden="true" />

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onCreateView}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 lg:h-10 lg:px-4 lg:text-sm"
        >
          <Plus size={14} weight="bold" />
          Create view
        </button>

        <ProjectMenu
          onRefreshAll={() => {
            broadcastViewRefresh()
            toast.success('Refreshing views…')
          }}
          onEdit={onEditProject}
          onDelete={onDeleteProject}
        />
      </div>
    </header>
  )
}

export function ProjectPageHeaderSkeleton() {
  return (
    <header
      className="hidden md:flex shrink-0 items-center gap-3 border-b border-stroke bg-white px-6 py-3 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <div className="size-4 rounded bg-black/[0.05]" />
        <div className="h-4 w-px bg-stroke" />
        <div className="h-5 w-5 rounded-sm bg-black/[0.05]" />
        <div className="h-4 w-24 rounded bg-black/[0.05]" />
        <div className="h-3 w-3 rounded bg-black/[0.05]" />
        <div className="h-4 w-4 rounded bg-black/[0.05]" />
        <div className="h-4 w-20 rounded bg-black/[0.05]" />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="h-8 w-40 rounded-lg bg-black/[0.05] lg:h-10 lg:w-44" />
        <div className="h-8 w-[148px] rounded-lg bg-black/[0.05] lg:h-10 lg:w-[168px]" />
      </div>
      <div className="h-6 w-px bg-stroke" />
      <div className="flex items-center gap-3">
        <div className="h-8 w-28 rounded-lg bg-black/[0.05] lg:h-10 lg:w-32" />
        <div className="size-8 rounded-lg bg-black/[0.05] lg:size-10" />
      </div>
    </header>
  )
}
