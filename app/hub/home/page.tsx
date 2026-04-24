'use client'

import { useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { GlobalDateChange } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateChange'
import { GlobalDateModeDropdown } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateModeDropdown'
import { ProjectsGrid } from '@/app/hub/home/(components)/ProjectsGrid/ProjectsGrid'
import PinnedViews from "@/app/hub/home/(components)/PinnedViews";

export default function HomePage() {
  const { projects: projectsCtx, pins: pinsCtx } = useDashboard()
  const [query, setQuery] = useState('')

  return (
    <div className="flex flex-col pr-6 gap-5 pb-8">
      {/* Sticky global top bar. `bg-main` matches the page so scrolled content
          doesn't bleed through, and `border-b border-stroke` provides the
          single hairline that separates this bar from the section header
          stuck directly below it — no empty strip between the two. Sticky
          section headers (pinned, project views) use `top-[74px]` so they
          sit flush against this bar's bottom edge. */}
      <div className="sticky top-0 z-50 shrink-0 flex items-center gap-4 pt-6 pb-2 bg-main border-b border-stroke">
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
        <GlobalDateModeDropdown />
      </div>

      <div className="space-y-5">
        <PinnedViews pins={pinsCtx.pinnedViews} unpinView={pinsCtx.unpinView} loading={pinsCtx.loading} projects={projectsCtx.projects} />

        <ProjectsGrid projects={projectsCtx.projects} loading={projectsCtx.loading} />
      </div>
    </div>
  )
}
