'use client'

/**
 * Demo project page — what the user sees when they tap a project in
 * the sidebar. Renders `<DemoTopBar>` on top + a single
 * `<DemoProjectView>` body for the picked project. Reuses the same
 * primitives the home page uses; the difference is just "one
 * project's full body" vs. "two projects stacked".
 */

import { ArrowLeft } from '@phosphor-icons/react'
import { useDemoContext } from '../context/DemoContext'
import { DemoTopBar } from '../DemoTopBar'
import { DemoProjectView } from '../projects/DemoProjectView'

export function DemoProjectPage() {
  const { currentProjectId, projects, goToPage } = useDemoContext()
  const project = projects.find(p => p.id === currentProjectId)

  if (!project) {
    return (
      <div className="flex-1 overflow-y-auto bg-background">
        <DemoTopBar />
        <div className="px-3 py-6">
          <p className="text-xs text-muted-foreground">Project not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <DemoTopBar />
      <div className="px-3 pb-6 space-y-3">
        <button
          onClick={() => goToPage('home')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={11} weight="bold" />
          Back to home
        </button>
        <DemoProjectView project={project} />
      </div>
    </div>
  )
}
