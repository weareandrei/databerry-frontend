'use client'

/**
 * Body of the mobile home page — pinned views (single column) +
 * flat projects list. Sits below `<MobileTopBar variant="home">`.
 *
 * Mirrors the desktop home's structural split (pinned section
 * gated on `hasPins`, projects section always rendered) so the
 * single-screen layout stays simple and readable. Differences from
 * desktop:
 *
 *   1. Pinned section is rendered single-column via the `singleColumn`
 *      prop on `<PinnedViews>`.
 *   2. Projects section renders the flat list (`<MobileProjectsList>`)
 *      — taps go to `/hub/project/<id>` rather than scrolling inline.
 *   3. Empty state: when there are no projects yet, the
 *      `<WelcomeEmpty>` panel renders the same way as desktop. Acts
 *      as a fresh-account onboarding surface on both form factors.
 */

import { useDashboard } from '@/contexts/DashboardContext'
import PinnedViews from '@/app/hub/home/(components)/PinnedViews'
import { WelcomeEmpty } from '@/app/hub/home/(components)/WelcomeEmpty'
import { MobileProjectsList } from './MobileProjectsList'

export function MobileHomeBody() {
  const { projects: projectsCtx, pins: pinsCtx } = useDashboard()
  const hasPins = !pinsCtx.loading && pinsCtx.pinnedViews.length > 0
  const showWelcome = !projectsCtx.loading && projectsCtx.projects.length === 0

  if (showWelcome) {
    return (
      <div className="flex-1 overflow-y-auto">
        <WelcomeEmpty onCreate={() => projectsCtx.openModal()} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
      <div className="flex flex-col gap-6">
        {hasPins && (
          <section>
            <h2 className="px-1 mb-2 text-xs font-medium uppercase tracking-wider text-grey-light">
              Pinned views
            </h2>
            <div className="rounded-xl border border-stroke bg-white shadow-card p-4">
              <PinnedViews
                pins={pinsCtx.pinnedViews}
                unpinView={pinsCtx.unpinView}
                onConnectionAssigned={pinsCtx.replacePin}
                projects={projectsCtx.projects}
                singleColumn
              />
            </div>
          </section>
        )}

        <section>
          <h2 className="px-1 mb-2 text-xs font-medium uppercase tracking-wider text-grey-light">
            Projects
          </h2>
          <MobileProjectsList projects={projectsCtx.projects} />
        </section>
      </div>
    </div>
  )
}
