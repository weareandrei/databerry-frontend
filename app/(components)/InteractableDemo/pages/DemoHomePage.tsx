'use client'

/**
 * Demo home page — `<DemoTopBar>` on top, then EITHER the dashboard
 * (pinned-views card + project list) OR the embedded Agent chat,
 * controlled by a `Dashboard / Agent mode` switch hosted in the top
 * bar. Same architecture the real `/hub/home` uses since the recent
 * dashboard refresh: switching doesn't change the route, doesn't
 * touch the sidebar, just swaps the body component below the same
 * top bar with a short fade.
 *
 * Section labels (`PINNED VIEWS`, `PROJECTS`) match the real
 * dashboard's typography so the demo reads as the same product.
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDemoContext } from '../context/DemoContext'
import { DemoTopBar } from '../DemoTopBar'
import { DemoPinnedViews } from '../projects/DemoPinnedViews'
import { DemoMobileProjectsList } from '../projects/DemoMobileProjectsList'
import { DemoProjectView } from '../projects/DemoProjectView'
import { DemoAgentBody } from '../DemoAgentBody'
import {
  DashboardAgentSwitch,
  type SwitchValue,
} from '@/app/hub/home/(components)/DashboardAgentSwitch'

export function DemoHomePage() {
  const { projects, views } = useDemoContext()

  // Local Dashboard / Agent mode toggle. Lives at this level so the
  // top bar (rendered here) and the body (rendered here) can both
  // read it — no need to push it up to `DemoContext`. The real
  // `/hub/home` does the same.
  const [view, setView] = useState<SwitchValue>('dashboard')

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
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <DemoTopBar view={view} onViewChange={setView} />

      {/* Mobile-only full-width Dashboard / Agent mode switch row.
          Matches the real mobile dashboard pattern: at `<md` the
          inline switch in `<DemoTopBar>` is hidden (the demo card
          can't fit switch + date pills on one row at phone widths)
          and the switch moves down here as a full-bleed control,
          flush with the body's `px-3` horizontal rhythm. Desktop
          (`md+`) keeps the inline switch in the top bar and this
          row never renders. */}
      <div className="md:hidden shrink-0 px-3 pb-3">
        <DashboardAgentSwitch value={view} onChange={setView} fullWidth />
      </div>

      {/* Body swap. `AnimatePresence mode="wait"` runs the outgoing
          body's fade-out before the incoming body mounts — same
          pattern the real home uses. `initial={false}` skips the
          fade on first paint so the dashboard doesn't fade in for
          no reason on page load. */}
      <AnimatePresence mode="wait" initial={false}>
        {view === 'agent' ? (
          <motion.div
            key="agent"
            className="flex-1 min-h-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <DemoAgentBody />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            className="flex-1 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
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
                {/* Mobile: flat list of project rows, each navigates to the
                    dedicated project page on tap. Same drill-down pattern
                    the real `<MobileHomeBody>` uses — stacking every full
                    `<DemoProjectView>` body in the narrow demo card means
                    the user can't see anything without scrolling several
                    screens, and they don't get a per-project landing they
                    can actually inspect. The flat list keeps the home
                    page glanceable and pushes detail to the dedicated
                    project page (`pageOpen === 'project'`). */}
                <div className="block md:hidden">
                  <DemoMobileProjectsList projects={projects} />
                </div>

                {/* Desktop / tablet: keep the stacked project bodies — at
                    `md+` the demo card is wide enough that each body's
                    folder grid + overview lane + tile grid render
                    comfortably side-by-side within their own card. */}
                <div className="hidden md:block space-y-3">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
