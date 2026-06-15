'use client'

/**
 * Shared screen for the project's overview AND folder views — the
 * same three-card body, differing only by `folderId`. Both the
 * `[project]/overview` and `[project]/folders/[folderId]` routes
 * render this, so entering a folder looks identical no matter where
 * it was opened from (body grid or sidebar).
 *
 * Top bar stays fixed; the body is a transparent scroll container
 * holding the three white cards (`<ProjectView>` owns the stack).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectView } from '@/app/hub/(components)/project/ProjectView'
import { HubTopBar } from '@/app/hub/(components)/HubTopBar'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import type { Project } from '@/types/project'

export function ProjectOverviewScreen({
  project,
  folderId = null,
}: {
  project: Project
  folderId?: string | null
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] md:h-screen">
      <MobileTopBar
        variant="project"
        projectName={project.name}
        projectWebsiteUrl={project.websiteUrl}
        onBack={() => router.push('/hub/home')}
      />
      <HubTopBar
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search views and folders…',
        }}
      />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <ProjectView project={project} folderId={folderId} filterQuery={query} />
      </div>
    </div>
  )
}
