'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, CaretRight } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { projectDisplayLabel } from './projectViewUtils'
import type { Project } from '@/types/project'

export function ProjectPageBreadcrumbs({
  project,
  pageLabel,
  pageIcon: PageIcon,
}: {
  project: Project
  pageLabel: string
  pageIcon: Icon
}) {
  const router = useRouter()

  return (
    <>
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
        <span className="truncate text-sm font-semibold text-foreground">
          {projectDisplayLabel(project)}
        </span>
      </div>

      <CaretRight size={10} weight="bold" className="shrink-0 text-subtle" aria-hidden="true" />

      <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
        <PageIcon size={16} weight="bold" className="shrink-0 text-foreground" />
        <span className="truncate text-sm font-semibold text-foreground">{pageLabel}</span>
      </div>
    </>
  )
}
