'use client'

import { Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { GlobalDateChange } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateChange'
import { GlobalDateModeDropdown } from '@/app/hub/home/(components)/GlobalDateChanger/(components)/GlobalDateModeDropdown'
import { ProjectMenu } from '@/app/hub/project/(components)/ProjectMenu'
import { broadcastViewRefresh } from '@/lib/viewRefreshBus'
import { ProjectSelect } from './(components)/ProjectSelect'

export interface DashboardHeaderProps {
  breadcrumbs?: React.ReactNode
  showProjectSelectDropdown?: boolean
  showCreateViewButton?: boolean
  onCreateView?: () => void
  showCreateConnectionButton?: boolean
  onCreateConnection?: () => void
  showCreateProjectButton?: boolean
  onCreateProject?: () => void
  showNewChatButton?: boolean
  onNewChat?: () => void
  showProjectMenu?: boolean
  onEditProject?: () => void
  onDeleteProject?: () => void
  showDateSelect?: boolean
}

const actionButtonClass =
  'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 lg:h-10 lg:px-4 lg:text-sm'

export function DashboardHeader({
  breadcrumbs,
  showProjectSelectDropdown = false,
  showCreateViewButton = false,
  onCreateView,
  showCreateConnectionButton = false,
  onCreateConnection,
  showCreateProjectButton = false,
  onCreateProject,
  showNewChatButton = false,
  onNewChat,
  showProjectMenu = false,
  onEditProject,
  onDeleteProject,
  showDateSelect = true,
}: DashboardHeaderProps) {
  const hasLeft = !!breadcrumbs || showProjectSelectDropdown
  const hasActions =
    (showCreateViewButton && onCreateView)
    || (showCreateConnectionButton && onCreateConnection)
    || (showCreateProjectButton && onCreateProject)
    || (showNewChatButton && onNewChat)
    || (showProjectMenu && onEditProject && onDeleteProject)

  return (
    <header className="hidden lg:flex min-h-16 shrink-0 items-center gap-3 border-b border-stroke bg-white px-6 py-3">
      {hasLeft && (
        <div className="flex min-w-0 items-center gap-3">
          {breadcrumbs}
          {showProjectSelectDropdown && (
            <div className="w-[min(280px,30vw)] shrink-0">
              <ProjectSelect />
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {showDateSelect && (
        <div className="flex shrink-0 items-center gap-3">
          <GlobalDateChange />
          <GlobalDateModeDropdown />
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

            {showNewChatButton && onNewChat && (
              <button type="button" onClick={onNewChat} className={actionButtonClass}>
                <Plus size={14} weight="bold" />
                New chat
              </button>
            )}

            {showProjectMenu && onEditProject && onDeleteProject && (
              <ProjectMenu
                onRefreshAll={() => {
                  broadcastViewRefresh()
                  toast.success('Refreshing views…')
                }}
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

export function DashboardHeaderSkeleton({ showActions = false }: { showActions?: boolean }) {
  return (
    <header
      className="hidden lg:flex min-h-16 shrink-0 items-center gap-3 border-b border-stroke bg-white px-6 py-3 animate-pulse"
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
      {showActions && (
        <>
          <div className="h-6 w-px bg-stroke" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-28 rounded-lg bg-black/[0.05] lg:h-10 lg:w-32" />
            <div className="size-8 rounded-lg bg-black/[0.05] lg:size-10" />
          </div>
        </>
      )}
    </header>
  )
}
