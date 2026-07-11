'use client'

import { useMemo } from 'react'
import { CaretUpDown, Plus } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { demoProjectLabel } from './demoProjectUtils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useDemoContext } from './context/DemoContext'

const LOGO_WRAPPER_SIZE = 40
const LOGO_ICON_SIZE = 24
const UNSUPPORTED = "This feature isn't available in the demo."

export function DemoProjectSelect() {
  const { projects, currentProjectId, pageOpen, goToPage, showNotice } = useDemoContext()

  const activeProject = useMemo(
    () => projects.find(p => p.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  )

  const displayProject = activeProject ?? projects[0] ?? null

  const dropdownProjects = useMemo(
    () =>
      displayProject
        ? projects.filter(p => p.id !== displayProject.id)
        : projects,
    [projects, displayProject],
  )

  const selectProject = (projectId: string) => {
    goToPage('overview', projectId)
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
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white shadow-control text-subtle text-xs font-semibold"
          >
            —
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {displayProject ? demoProjectLabel(displayProject) : 'Select project'}
          </span>
          <span className="block truncate text-[11px] font-normal text-subtle">
            {pageOpen === 'overview' && activeProject
              ? 'Overview'
              : pageOpen === 'connections' && activeProject
                ? 'Connections'
                : pageOpen === 'agent' && activeProject
                  ? 'Ask agent'
                  : 'All projects'}
          </span>
        </span>

        <CaretUpDown size={14} weight="regular" className="shrink-0 text-subtle" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {dropdownProjects.map(project => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => selectProject(project.id)}
            className="gap-2.5 text-sm"
          >
            <ProjectIcon websiteUrl={project.websiteUrl} size={20} pill={false} />
            <span className="truncate">{demoProjectLabel(project)}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => showNotice(UNSUPPORTED)}
          className="gap-2 text-sm text-subtle"
        >
          <Plus size={14} weight="bold" />
          New project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
