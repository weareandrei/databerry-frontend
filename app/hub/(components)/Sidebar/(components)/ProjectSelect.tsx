'use client'

import { useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { CaretUpDown, Plus } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { useDashboard } from '@/contexts/DashboardContext'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useProjectLastSynced } from '@/hooks/useProjectLastSynced'
import { formatRelativeAgo } from '@/lib/formatRelative'
import { projectDisplayLabel } from '@/app/hub/(components)/project/(components)/projectViewUtils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/project'

const LOGO_WRAPPER_SIZE = 40
const LOGO_ICON_SIZE = 24

function resolveActiveProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/hub\/project\/([^/]+)/)
  return match ? match[1] : null
}

function lastSyncedLabel(lastSyncedAt: string | null, isResyncing: boolean): string {
  if (isResyncing) return 'Syncing…'
  if (!lastSyncedAt) return 'Not synced yet'
  return `Last synced ${formatRelativeAgo(lastSyncedAt)}`
}

export function ProjectSelect() {
  const router = useRouter()
  const pathname = usePathname()
  const { projects: projectsCtx } = useDashboard()
  const { enforceProjectLimit } = usePlanLimits()

  const activeProjectId = resolveActiveProjectId(pathname)
  const activeProject = useMemo(
    () => projectsCtx.projects.find(p => p.id === activeProjectId) ?? null,
    [projectsCtx.projects, activeProjectId],
  )

  const displayProject: Project | null =
    activeProject ?? projectsCtx.projects[0] ?? null

  const { lastSyncedAt, isResyncing } = useProjectLastSynced(displayProject?.id ?? null)

  const dropdownProjects = useMemo(
    () =>
      displayProject
        ? projectsCtx.projects.filter(p => p.id !== displayProject.id)
        : projectsCtx.projects,
    [projectsCtx.projects, displayProject],
  )

  const selectProject = (projectId: string) => {
    router.push(`/hub/project/${projectId}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-1 py-1',
          'text-left transition-colors cursor-pointer',
          'hover:bg-hover-fill',
        )}
      >
        {displayProject ? (
          <span
            style={{ width: LOGO_WRAPPER_SIZE, height: LOGO_WRAPPER_SIZE }}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-lg',
              'bg-white shadow-control',
            )}
          >
            <ProjectIcon
              websiteUrl={displayProject.websiteUrl}
              size={LOGO_ICON_SIZE}
              pill={false}
            />
          </span>
        ) : (
          <span
            style={{ width: LOGO_WRAPPER_SIZE, height: LOGO_WRAPPER_SIZE }}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-lg',
              'bg-white shadow-control',
              'text-subtle text-xs font-bold',
            )}
          >
            +
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold leading-tight text-foreground">
            {displayProject ? projectDisplayLabel(displayProject) : 'Select project'}
          </span>
          {displayProject && (
            <span className="mt-0.5 block truncate text-xs leading-tight text-subtle">
              {lastSyncedLabel(lastSyncedAt, isResyncing)}
            </span>
          )}
        </span>

        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            'bg-white shadow-control',
          )}
        >
          <CaretUpDown size={14} weight="regular" className="text-subtle" />
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[var(--anchor-width)] min-w-56 p-1">
        {projectsCtx.projects.length === 0 ? (
          <p className="px-2 py-2 text-xs text-subtle">No projects yet</p>
        ) : (
          dropdownProjects.map(project => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => selectProject(project.id)}
              className="gap-2.5 py-2 cursor-pointer"
            >
              <ProjectIcon websiteUrl={project.websiteUrl} size={18} pill={false} />
              <span className="truncate font-medium">{project.name}</span>
            </DropdownMenuItem>
          ))
        )}
        {dropdownProjects.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => {
            if (!enforceProjectLimit()) return
            projectsCtx.openModal()
          }}
          className="gap-2 py-2 text-primary font-medium cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          Add new project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
