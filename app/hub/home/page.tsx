'use client'

import { useState } from 'react'
import { PushPin, MagnifyingGlass } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { DashboardSectionWrapper } from '@/components/dashboard/shared/DashboardSectionWrapper'
import { GlobalDateChange } from '@/components/dashboard/shared/GlobalDateChange'
import { ProjectsGrid } from '@/components/dashboard/project/ProjectsGrid'
import { ViewCard } from '@/components/dashboard/view/ViewCard'

export default function HomePage() {
  const { projects: projectsCtx, pins } = useDashboard()
  const [query, setQuery] = useState('')

  return (
    <div className="flex flex-col h-screen p-6 gap-5">
      {/* Row 1: Search + Global date — always visible, static */}
      <div className="shrink-0 flex items-center gap-4 pt-2">
        <div className="flex-1 flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
          <MagnifyingGlass size={15} weight="bold" className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search your data…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <GlobalDateChange />
      </div>

      {/* Row 2: Pinned views — always visible, static */}
      {pins.pinnedViews.length > 0 && (
        <div className="shrink-0">
          <DashboardSectionWrapper
            icon={<PushPin size={13} weight="bold" />}
            title="Pinned"
          >
            <div
              className="p-3 grid grid-cols-2 gap-3 grid-flow-dense"
              style={{ gridAutoRows: '140px' }}
            >
              {pins.pinnedViews.map(view => {
                const project = projectsCtx.projects.find(p => p.id === view.projectId)
                return (
                  <ViewCard
                    key={view.id}
                    view={view}
                    onUntrack={id => pins.unpinView(id)}
                    projectName={project?.name}
                  />
                )
              })}
            </div>
          </DashboardSectionWrapper>
        </div>
      )}

      {/* Row 3: Projects grid — takes remaining space, scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ProjectsGrid projects={projectsCtx.projects} />
      </div>
    </div>
  )
}
