'use client'

/**
 * Demo home page — `<DemoTopBar>` (mock date/mode pills) on top,
 * pinned-views card, then a stack of `<DemoProjectView>` cards
 * (one per demo project). Mirrors the real `/hub/home` structure
 * at the demo card's smaller scale.
 *
 * Section labels (`PINNED VIEWS`, `PROJECTS`) match the real
 * dashboard's typography so the demo reads as the same product.
 */

import { useDemoContext } from '../context/DemoContext'
import { DemoTopBar } from '../DemoTopBar'
import { DemoPinnedViews } from '../projects/DemoPinnedViews'
import { DemoProjectView } from '../projects/DemoProjectView'

export function DemoHomePage() {
  const { projects, views } = useDemoContext()
  // Hide the pinned-views section entirely when there's nothing
  // pinned — same affordance the real home page has, no orphan
  // label hovering over an empty grid.
  const hasPins = views.some(
    v =>
      v.pinned &&
      v.kind !== 'overview-chart' &&
      v.kind !== 'overview-sources',
  )

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <DemoTopBar />
      <div className="px-3 pb-6 space-y-5">
        {hasPins && (
          <section>
            <h2 className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pinned views
            </h2>
            <div className="rounded-xl border bg-card shadow-card p-3">
              <DemoPinnedViews />
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map(project => (
              <DemoProjectView key={project.id} project={project} />
            ))}
            {projects.length === 0 && (
              <p className="px-1 text-xs text-muted-foreground">
                No projects yet — create one from the sidebar.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
