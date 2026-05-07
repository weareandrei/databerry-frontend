'use client'

/**
 * Mobile home's flat project list — replaces the desktop home's
 * inline `<ProjectsGrid>` (which stacks each project as a full card
 * with its views inside).
 *
 * Each row is a button: project favicon + name on the left, chevron
 * on the right. Tap navigates to the dedicated project page at
 * `/hub/project/<id>`. The `+ New project` row at the bottom opens
 * the existing `<CreateProjectModal>` via the same Redux action the
 * sidebar `+` button uses.
 *
 * No data fetching here — the project array is passed in by the
 * parent (`<MobileHomeBody>` reads it from `useDashboard()`). Stays
 * a pure presentational component so it could be reused elsewhere
 * (e.g. a "switch project" picker inside a different bottom sheet).
 */

import { useRouter } from 'next/navigation'
import { CaretRight, Plus } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { useDashboard } from '@/contexts/DashboardContext'
import type { Project } from '@/types/project'

interface MobileProjectsListProps {
  projects: Project[]
}

export function MobileProjectsList({ projects }: MobileProjectsListProps) {
  const router = useRouter()
  const { projects: projectsCtx } = useDashboard()

  return (
    <div className="rounded-xl border border-stroke bg-white shadow-card overflow-hidden">
      {projects.map((project, index) => (
        <button
          key={project.id}
          type="button"
          onClick={() => router.push(`/hub/project/${project.id}`)}
          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hover-fill ${
            index < projects.length - 1 ? 'border-b border-stroke/60' : ''
          }`}
        >
          <ProjectIcon
            websiteUrl={project.websiteUrl}
            size={28}
            pill
          />
          <span className="flex-1 truncate text-base font-semibold text-grey-darkest">
            {project.name}
          </span>
          <CaretRight size={14} weight="bold" className="text-grey-light shrink-0" />
        </button>
      ))}

      {/* `+ New project` lives at the bottom of the same card so it
          reads as part of the projects list rather than a floating
          button. Same modal the desktop sidebar `+` opens. */}
      <button
        type="button"
        onClick={() => projectsCtx.openModal()}
        className={`flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-grey-light transition-colors hover:bg-hover-fill hover:text-grey-darkest ${
          projects.length > 0 ? 'border-t border-dashed border-stroke' : ''
        }`}
      >
        <Plus size={14} weight="bold" />
        New project
      </button>
    </div>
  )
}
