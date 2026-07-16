'use client'

/**
 * Demo counterpart of hub `DashboardHeader`. Same left/right composition
 * and prop flags — project select / breadcrumbs on the left, date
 * controls + action buttons on the right — wired to DemoContext instead
 * of the live dashboard APIs.
 */

import { Plus } from '@phosphor-icons/react'
import { ProjectMenu } from '@/app/hub/project/(components)/ProjectMenu'
import { DemoGlobalDateChange, DemoGlobalDateModeDropdown } from './DemoGlobalDateControls'
import { DemoProjectSelect } from './DemoProjectSelect'

export interface DemoDashboardHeaderProps {
  breadcrumbs?: React.ReactNode
  showProjectSelectDropdown?: boolean
  showCreateViewButton?: boolean
  onCreateView?: () => void
  showCreateConnectionButton?: boolean
  onCreateConnection?: () => void
  showCreateProjectButton?: boolean
  onCreateProject?: () => void
  showProjectMenu?: boolean
  onEditProject?: () => void
  onDeleteProject?: () => void
  showDateSelect?: boolean
}

const actionButtonClass =
  'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 lg:h-10 lg:px-4 lg:text-sm'

export function DemoDashboardHeader({
  breadcrumbs,
  showProjectSelectDropdown = false,
  showCreateViewButton = false,
  onCreateView,
  showCreateConnectionButton = false,
  onCreateConnection,
  showCreateProjectButton = false,
  onCreateProject,
  showProjectMenu = false,
  onEditProject,
  onDeleteProject,
  showDateSelect = true,
}: DemoDashboardHeaderProps) {
  const hasLeft = !!breadcrumbs || showProjectSelectDropdown
  const hasActions =
    (showCreateViewButton && onCreateView)
    || (showCreateConnectionButton && onCreateConnection)
    || (showCreateProjectButton && onCreateProject)
    || (showProjectMenu && onEditProject && onDeleteProject)

  return (
    <header className="hidden lg:flex min-h-16 shrink-0 items-center gap-3 border-b border-stroke bg-white px-6 py-3">
      {hasLeft && (
        <div className="flex min-w-0 items-center gap-3">
          {breadcrumbs}
          {showProjectSelectDropdown && (
            <div className="w-[min(280px,30vw)] shrink-0">
              <DemoProjectSelect />
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {showDateSelect && (
        <div className="flex shrink-0 items-center gap-3">
          <DemoGlobalDateChange />
          <DemoGlobalDateModeDropdown />
        </div>
      )}

      {hasActions && (
        <>
          <span className="h-6 w-px shrink-0 bg-stroke" aria-hidden="true" />

          <div className="flex shrink-0 items-center gap-3">
            {showCreateViewButton && onCreateView && (
              <button type="button" onClick={onCreateView} className={actionButtonClass}>
                <Plus size={14} weight="bold" />
                Create view
              </button>
            )}

            {showCreateConnectionButton && onCreateConnection && (
              <button type="button" onClick={onCreateConnection} className={actionButtonClass}>
                <Plus size={14} weight="bold" />
                Create connection
              </button>
            )}

            {showCreateProjectButton && onCreateProject && (
              <button type="button" onClick={onCreateProject} className={actionButtonClass}>
                <Plus size={14} weight="bold" />
                New project
              </button>
            )}

            {showProjectMenu && onEditProject && onDeleteProject && (
              <ProjectMenu
                onRefreshAll={() => {}}
                onEdit={onEditProject}
                onDelete={onDeleteProject}
              />
            )}
          </div>
        </>
      )}
    </header>
  )
}
