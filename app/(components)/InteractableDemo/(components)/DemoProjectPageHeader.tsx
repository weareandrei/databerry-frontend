'use client'

import { ArrowLeft, CaretRight, Plus } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { ProjectMenu } from '@/app/hub/project/(components)/ProjectMenu'
import { demoProjectLabel } from './demoProjectUtils'
import { DemoGlobalDateChange, DemoGlobalDateModeDropdown } from './DemoGlobalDateControls'
import type { DemoProject } from './context/DemoContext'

interface DemoProjectPageHeaderProps {
  project: DemoProject
  pageLabel: string
  pageIcon: Icon
  onBack: () => void
  onCreateView: () => void
  onEditProject: () => void
  onDeleteProject: () => void
  /** Hide the Create view button (e.g. Timeline page). Default true. */
  showCreateViewButton?: boolean
}

export function DemoProjectPageHeader({
  project,
  pageLabel,
  pageIcon: PageIcon,
  onBack,
  onCreateView,
  onEditProject,
  onDeleteProject,
  showCreateViewButton = true,
}: DemoProjectPageHeaderProps) {
  return (
    <header className="hidden lg:flex shrink-0 items-center gap-3 border-b border-stroke bg-white px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-subtle transition-colors hover:text-muted-foreground cursor-pointer"
          aria-label="All projects"
        >
          <ArrowLeft size={16} weight="regular" />
        </button>

        <span className="h-4 w-px shrink-0 bg-stroke" aria-hidden="true" />

        <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
          <ProjectIcon
            websiteUrl={project.websiteUrl}
            logoSrc={project.logoSrc}
            size={20}
            pill={false}
          />
          <span className="truncate text-sm font-semibold text-foreground">
            {demoProjectLabel(project)}
          </span>
        </div>

        <CaretRight size={10} weight="bold" className="shrink-0 text-subtle" aria-hidden="true" />

        <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
          <PageIcon size={16} weight="bold" className="shrink-0 text-foreground" />
          <span className="truncate text-sm font-semibold text-foreground">{pageLabel}</span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-3">
        <DemoGlobalDateChange />
        <DemoGlobalDateModeDropdown />
      </div>

      <span className="h-6 w-px shrink-0 bg-stroke" aria-hidden="true" />

      <div className="flex shrink-0 items-center gap-3">
        {showCreateViewButton && (
          <button
            type="button"
            onClick={onCreateView}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 lg:h-10 lg:px-4 lg:text-sm"
          >
            <Plus size={14} weight="bold" />
            Create view
          </button>
        )}

        <ProjectMenu
          onRefreshAll={() => {}}
          onEdit={onEditProject}
          onDelete={onDeleteProject}
        />
      </div>
    </header>
  )
}
