'use client'

import type { Project } from '@/types/project'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'
import {
  HomeProjectMiniCard,
  HomeProjectMiniCardSkeleton,
} from '@/app/hub/home/(components)/HomeProjectMiniCard'

interface ProjectsSummaryViewProps {
  projects: Project[]
  loading?: boolean
}

/** Homepage grid of per-project summary cards. */
export function ProjectsSummaryView({ projects, loading = false }: ProjectsSummaryViewProps) {
  return (
    <ViewWrapper>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
        {loading &&
          Array.from({ length: 2 }).map((_, i) => (
            <HomeProjectMiniCardSkeleton key={i} />
          ))}

        {!loading &&
          projects.map(project => (
            <HomeProjectMiniCard key={project.id} project={project} />
          ))}
      </div>
    </ViewWrapper>
  )
}
