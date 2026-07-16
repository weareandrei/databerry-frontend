'use client'

/**
 * Demo counterpart of hub `ProjectSelect`. On home (no active project)
 * shows the SquaresFour + "Select project" state; selecting a project
 * opens its overview. Used in both the sidebar and the home header.
 */

import { useMemo } from 'react'
import { CaretUpDown, Plus, SquaresFour } from '@phosphor-icons/react'
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

  const dropdownProjects = useMemo(
    () =>
      activeProject
        ? projects.filter(p => p.id !== activeProject.id)
        : projects,
    [projects, activeProject],
  )

  const selectProject = (projectId: string) => {
    goToPage('overview', projectId)
  }

  const pageSubtitle =
    pageOpen === 'overview'
      ? 'Overview'
      : pageOpen === 'connections'
        ? 'Connections'
        : pageOpen === 'agent'
          ? 'Ask agent'
          : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-demo-select-project
        className={cn(
          'inline-flex max-w-full items-center gap-3 rounded-xl px-1 py-1 lg:flex lg:w-full',
          'text-left transition-colors cursor-pointer',
          'hover:bg-hover-fill',
        )}
      >
        {activeProject ? (
          <span
            style={{ width: LOGO_WRAPPER_SIZE, height: LOGO_WRAPPER_SIZE }}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-lg',
              'bg-white shadow-control',
            )}
          >
            <ProjectIcon
              websiteUrl={activeProject.websiteUrl}
              logoSrc={activeProject.logoSrc}
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
            )}
          >
            <SquaresFour size={LOGO_ICON_SIZE} weight="regular" className="text-subtle" />
          </span>
        )}

        <span className="min-w-0 max-w-[11rem] lg:max-w-none lg:flex-1">
          {activeProject ? (
            <>
              <span className="block truncate text-base font-bold leading-tight text-foreground">
                {demoProjectLabel(activeProject)}
              </span>
              {pageSubtitle && (
                <span className="mt-0.5 block truncate text-xs leading-tight text-subtle">
                  {pageSubtitle}
                </span>
              )}
            </>
          ) : (
            <span className="block truncate text-sm font-medium leading-tight text-subtle">
              Select project
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
        {projects.length === 0 ? (
          <p className="px-2 py-2 text-xs text-subtle">No projects yet</p>
        ) : (
          dropdownProjects.map(project => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => selectProject(project.id)}
              className="gap-2.5 py-2 cursor-pointer"
            >
              <ProjectIcon
                websiteUrl={project.websiteUrl}
                logoSrc={project.logoSrc}
                size={18}
                pill={false}
              />
              <span className="truncate font-medium">{demoProjectLabel(project)}</span>
            </DropdownMenuItem>
          ))
        )}
        {dropdownProjects.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => showNotice(UNSUPPORTED)}
          className="gap-2 py-2 text-primary font-medium cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          Add new project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
