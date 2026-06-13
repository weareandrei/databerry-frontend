'use client'

/**
 * `[project]/overview` — the project's main canvas: folders row +
 * the full views grid. This is the ONLY sub-page where view
 * positions are user-editable (drag-to-reorder); every other
 * sub-page auto-positions.
 *
 * Layout contract: top bar + body fill the viewport (h-screen
 * column); the white panel is the ONLY scroll container — the page
 * itself never scrolls. The search bar filters views + folders by
 * name (client-side; drag-reorder pauses while filtering so a
 * partial order can't be persisted).
 *
 * Reuses `<ProjectView>` — the standalone overview body (the old
 * per-project card chrome is gone; project identity + 3-dots moved
 * into the `<ProjectSidebar>`).
 */

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProjectView } from '@/app/hub/(components)/project/ProjectView'
import { HubTopBar } from '@/app/hub/(components)/HubTopBar'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { useDashboard } from '@/contexts/DashboardContext'

export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const router = useRouter()
  const { projects: projectsCtx } = useDashboard()
  const [query, setQuery] = useState('')
  const project = projectsCtx.projects.find(p => p.id === projectId)

  // The layout already gates on project resolution — by the time a
  // page renders, the project exists. The guard keeps TS honest.
  if (!project) return null

  return (
    // Mobile: the hub layout's `<main>` already reserves 60 px for the
    // fixed MobileTopBar, so the column height is viewport minus that
    // gutter. Desktop: full viewport (no top bar gutter).
    <div className="flex flex-col h-[calc(100dvh-60px)] md:h-screen">
      <MobileTopBar
        variant="project"
        projectName={project.name}
        onBack={() => router.push('/hub/home')}
      />
      <HubTopBar
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search views and folders…',
        }}
      />
      {/* White panel = the scroll container. `mx-4 mb-4` keeps the
          16-px rhythm shared with the top bar and the sidebar card. */}
      <div className="flex-1 min-h-0 mx-4 mb-3 bg-white rounded-2xl border border-stroke shadow-card overflow-y-auto">
        <ProjectView project={project} filterQuery={query} />
      </div>
    </div>
  )
}
