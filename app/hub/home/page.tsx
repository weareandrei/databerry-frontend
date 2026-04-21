'use client'

import { useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { GlobalDateChange } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateChange'
import { ProjectsGrid } from '@/app/hub/home/(components)/ProjectsGrid/ProjectsGrid'
import PinnedViews from "@/app/hub/home/(components)/PinnedViews";

export default function HomePage() {
  const { projects: projectsCtx, pins: pinsCtx } = useDashboard()
  const [query, setQuery] = useState('')

  return (
    <div className="flex flex-col h-screen pt-6 pr-6 gap-5 relative">
      <div className="sticky shrink-0 flex items-center gap-4 z-50">
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

      <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-6">
        <PinnedViews pins={pinsCtx.pinnedViews} unpinView={pinsCtx.unpinView} loading={pinsCtx.loading} projects={projectsCtx.projects} />

        <ProjectsGrid projects={projectsCtx.projects} loading={projectsCtx.loading} />
      </div>
    </div>
  )
}
