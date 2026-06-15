'use client'

/**
 * Layout for every `/hub/projects/[projectId]/*` page. Owns the
 * per-project sidebar so that navigating between the project's
 * sub-pages (overview ↔ tools/stripe ↔ connections …) swaps ONLY
 * the body — Next.js keeps this layout mounted across child route
 * changes, so the sidebar never re-renders or blinks.
 *
 * Resolution states:
 *   - projects still loading → cream full-screen spinner (matches
 *     the OnboardingGate look so the hand-off is seamless)
 *   - loaded but id unknown → bounce to /hub/home (stale link,
 *     deleted project)
 *   - found → sidebar + body
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProjectSidebar } from '@/app/hub/(components)/ProjectSidebar/ProjectSidebar'
import { ProjectSidebarSkeleton } from '@/app/hub/(components)/ProjectSidebar/ProjectSidebarSkeleton'
import { BodySkeleton } from '@/app/hub/(components)/BodySkeleton'
import { HubTopBarSkeleton } from '@/app/hub/(components)/HubTopBar'
import { useDashboard } from '@/contexts/DashboardContext'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const projectId = params.projectId as string
  const router = useRouter()
  const { projects: projectsCtx } = useDashboard()

  const project = projectsCtx.projects.find(p => p.id === projectId) ?? null
  const missing = !projectsCtx.loading && project === null

  useEffect(() => {
    if (missing) router.replace('/hub/home')
  }, [missing, router])

  if (!project) {
    // Initial load — the project hasn't resolved, so there's no real
    // sidebar yet. Render the FULL shell as skeletons (sidebar + top
    // bar + body) so nothing sits empty and the hand-off to the real
    // page has no layout shift.
    return (
      <>
        <ProjectSidebarSkeleton />
        <div className="md:pl-64 flex-1 min-h-0 flex flex-col">
          <div className="flex flex-col h-screen">
            <HubTopBarSkeleton />
            <div className="flex-1 min-h-0 mx-4 mb-4 bg-white rounded-2xl border border-stroke shadow-card overflow-hidden">
              <BodySkeleton />
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <ProjectSidebar project={project} />
      {/* `md:pl-64` = the sidebar card's 240 px + the 16-px gap
          between rail and sidebar (the hub layout's `<main>` already
          reserved the 64-px icon rail). The body panels' own `mx-4`
          then adds the matching 16-px sidebar→body gap. Mobile
          renders no project sidebar — pages keep their own
          `<MobileTopBar>` chrome. */}
      <div className="md:pl-64 flex-1 min-h-0 flex flex-col">{children}</div>
    </>
  )
}
