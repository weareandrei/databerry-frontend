'use client'

/**
 * `[project]/pinned` — this project's pinned views only. Same lane
 * renderer as the home page's per-project pinned sections, filtered
 * to one project. Auto-positioned (pins have no manual ordering).
 */

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PinnedViews } from '@/app/hub/home/(components)/PinnedViews'
import { HubTopBar } from '@/app/hub/(components)/HubTopBar'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { BodySkeleton } from '@/app/hub/(components)/BodySkeleton'
import { useDashboard } from '@/contexts/DashboardContext'

export default function ProjectPinnedPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const router = useRouter()
  const { projects: projectsCtx, pins: pinsCtx } = useDashboard()
  const [query, setQuery] = useState('')
  const project = projectsCtx.projects.find(p => p.id === projectId)
  if (!project) return null

  const projectPins = pinsCtx.pinnedViews.filter(p => p.projectId === projectId)
  // Search scope = ONLY this project's pinned views, by name.
  const normalized = query.trim().toLowerCase()
  const pins = normalized
    ? projectPins.filter(p => p.name.toLowerCase().includes(normalized))
    : projectPins

  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] md:h-screen">
      <MobileTopBar
        variant="project"
        projectName={`${project.name} — Pinned`}
        onBack={() => router.push('/hub/home')}
      />
      <HubTopBar
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search pinned views…',
        }}
      />
      {/* White panel = the ONLY scroll container. */}
      <div className="flex-1 min-h-0 mx-4 mb-4 bg-white rounded-2xl border border-stroke shadow-card overflow-y-auto">
        {pinsCtx.loading ? (
          <BodySkeleton />
        ) : (
          <div className="p-5 pb-6">
            <h2 className="px-1 mb-4 text-xs font-medium uppercase tracking-wider text-grey-light">
              Pinned views
            </h2>
            {pins.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10">
                {normalized
                  ? `No pinned views match "${query.trim()}".`
                  : "Nothing pinned in this project yet — open a view's menu and choose Pin to keep it here."}
              </p>
            ) : (
              <PinnedViews
                pins={pins}
                unpinView={pinsCtx.unpinView}
                onConnectionAssigned={pinsCtx.replacePin}
                projects={projectsCtx.projects}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
