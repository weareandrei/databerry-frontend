'use client'

/**
 * Body of the mobile project page (`/hub/project/[projectId]`).
 *
 * Three white-card sections, in order:
 *   1. Folders          — `<FolderGrid>` (already 2-col responsive)
 *   2. Overview lane    — `<ViewCardOverviewChart>` + `<ViewCardOverviewSources>`
 *                         stacked vertically, separated by a hairline divider
 *   3. Other views      — wide-PostHog tiles + every regular tile, all rendered
 *                         single-column with the `chromeless` prop so each tile
 *                         sits flat inside the outer card (no nested borders)
 *
 * Drives data through `useProjectView` — the same hook the desktop
 * `<ProjectView>` uses, exported for cross-form-factor reuse. We pass
 * `(project, null, 0)` because the mobile route is the navigation primitive
 * (the desktop sidebar's `setProjectNavIntent` doesn't apply here — that
 * still drives the desktop home page's scroll).
 *
 * Folder navigation works in place: tapping a folder swaps the current
 * folder, and a small "Back to <project name>" button appears at the top
 * of the body so the user can return to project root. The `<MobileTopBar>`
 * keeps showing the project name regardless of folder depth — folder
 * breadcrumbs in the title bar would be overkill on a phone.
 */

import { ArrowsClockwise, CaretLeft, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { ViewCardOverviewChartConnected } from '@/app/hub/(components)/view/ViewCardOverviewChartConnected'
import { ViewCardOverviewSourcesConnected } from '@/app/hub/(components)/view/ViewCardOverviewSourcesConnected'
import { ViewCardRenderer } from '@/app/hub/(components)/view/renderers/ViewCardRenderer'
import {
  WidePosthogViewRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/view/renderers/WidePosthogViewRenderer'
import { useProjectView } from '@/app/hub/home/(components)/ProjectsGrid/ProjectView/ProjectView'
import type { Project } from '@/types/project'

interface MobileProjectBodyProps {
  project: Project
}

export function MobileProjectBody({ project }: MobileProjectBodyProps) {
  const v = useProjectView(project, null, 0)
  const { projects: projectsCtx } = useDashboard()
  // Mobile-side mutation surface for the future (edit/delete project) lives
  // here too via the dashboard context — currently the mobile body doesn't
  // expose those actions (no project menu in the top bar yet); fine to wire
  // them in later without touching the data plumbing.
  void projectsCtx

  // Partition views by lane. Same rules as desktop's `ProjectBodyViews`:
  //   - composite overview (chart + sources/users)  → first card
  //   - wide PostHog (funnel/retention/users)       → second card, top
  //   - everything else                             → second card, below
  const overviewChart = v.views.find(view => view.type === 'project_overview')
  const overviewSources = v.views.find(view => view.type === 'project_overview_sources')
  const widePosthogViews = v.views.filter(isWidePosthogView)
  // Standalone Chart views — see ProjectView desktop variant for the
  // rationale. On mobile they ride alongside the other-views card.
  const customChartViews = v.views.filter(view => view.type === 'custom_chart')
  const regularViews = v.views.filter(
    view =>
      view.type !== 'project_overview' &&
      view.type !== 'project_overview_sources' &&
      view.type !== 'custom_chart' &&
      !isWidePosthogView(view),
  )

  const hasOverview = Boolean(overviewChart || overviewSources)
  const hasOtherViews =
    widePosthogViews.length > 0 ||
    customChartViews.length > 0 ||
    regularViews.length > 0
  const hasFolders = v.subFolders.length > 0

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
      <div className="flex flex-col gap-6">
        {/* Folder back-link — only when navigated *into* a folder. Sits
            above the folders card so it's the first thing the user sees
            when their thumb's still on the screen. */}
        {v.currentFolder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={v.handleBack}
            className="-mb-2 -ml-2 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground self-start"
          >
            <CaretLeft size={11} weight="bold" />
            Back to {project.name}
          </Button>
        )}

        {/* ── Folders section ───────────────────────────────────────── */}
        {/* Card always renders so the `+ New folder` slot has a home;
            empty `subFolders` plus `onCreateFolder` shows just the slot. */}
        <section>
          <h2 className="px-1 mb-2 text-xs font-medium uppercase tracking-wider text-grey-light">
            Folders
          </h2>
          <div className="rounded-xl border border-stroke bg-white shadow-card p-4">
            <FolderGrid
              folders={v.subFolders}
              onDeleteFolder={v.foldersCtx.deleteFolder}
              onRenameFolder={v.foldersCtx.renameFolder}
              onCreateSubfolder={v.foldersCtx.openModal}
              onCreateFolder={() =>
                v.foldersCtx.openModal(v.currentFolder?.id ?? null, project.id)
              }
              onFolderClick={id => {
                const f = v.foldersCtx.folders.find(fl => fl.id === id)
                if (f) v.handleFolderClick(f)
              }}
            />
          </div>
        </section>

        {/* ── Views section ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-grey-light">
              Views
            </h2>
            <Button
              onClick={v.openCreateViewModal}
              className="rounded-full gap-1.5 px-3.5 h-8 bg-brand hover:bg-brand/90 text-white text-xs"
            >
              <Plus size={12} weight="bold" />
              Create view
            </Button>
          </div>

          {/* Loading state — folder/view fetch is in flight. Inline
              spinner mirrors desktop's `<ProjectBodyLoadingState>`. */}
          {v.loading && (
            <div className="rounded-xl border border-stroke bg-white shadow-card flex items-center justify-center py-8">
              <ArrowsClockwise
                size={16}
                weight="bold"
                className="text-muted-foreground animate-spin"
              />
            </div>
          )}

          {/* Composite overview card — renders only when at least one of
              the two overview view types is in scope. The two tiles
              already opt into `<ViewWrapper variant='borderless'>` on
              their own, so we don't pass `chromeless` to them; the
              hairline `divide-y` between rows gives the two-tile
              "stacked but related" feel. */}
          {!v.loading && hasOverview && (
            <div className="rounded-xl border border-stroke bg-white shadow-card flex flex-col divide-y divide-stroke mb-4">
              {overviewChart && (
                <ViewCardOverviewChartConnected
                  view={overviewChart}
                  dateFrom={v.dateFrom}
                  dateTo={v.dateTo}
                  mode={v.mode}
                  onUntrack={v.handleUntrack}
                  onPin={v.handlePin}
                />
              )}
              {overviewSources && (
                <ViewCardOverviewSourcesConnected
                  view={overviewSources}
                  dateFrom={v.dateFrom}
                  dateTo={v.dateTo}
                  onUntrack={v.handleUntrack}
                  onPin={v.handlePin}
                />
              )}
            </div>
          )}

          {/* Other-views card — single-column stack of every non-overview
              view. Wide PostHog tiles ride above the regular ones (same
              order desktop uses). Each tile is `chromeless` so its own
              border + shadow doesn't nest inside this outer card. */}
          {!v.loading && hasOtherViews && (
            <div className="rounded-xl border border-stroke bg-white shadow-card flex flex-col divide-y divide-stroke">
              {customChartViews.map(view => (
                <ViewCardOverviewChartConnected
                  key={view.id}
                  view={view}
                  dateFrom={v.dateFrom}
                  dateTo={v.dateTo}
                  mode={v.mode}
                  onUntrack={v.handleUntrack}
                  onPin={v.handlePin}
                  chromeless
                />
              ))}
              {widePosthogViews.map(view => (
                <WidePosthogViewRenderer
                  key={view.id}
                  view={view}
                  dateFrom={v.dateFrom}
                  dateTo={v.dateTo}
                  onUntrack={v.handleUntrack}
                  onPin={v.handlePin}
                  onConnectionAssigned={v.handleConnectionAssigned}
                  chromeless
                />
              ))}
              {regularViews.map(view => (
                <ViewCardRenderer
                  key={view.id}
                  view={view}
                  isRange={v.isRange}
                  dateFrom={v.dateFrom}
                  dateTo={v.dateTo}
                  mode={v.mode}
                  tz={v.tz}
                  onUntrack={v.handleUntrack}
                  onPin={v.handlePin}
                  onConnectionAssigned={v.handleConnectionAssigned}
                  chromeless
                />
              ))}
            </div>
          )}

          {/* Empty state — no overview, no wide-posthog, no regular views,
              no folders, and we're not loading. Mirror desktop's empty
              copy but a touch more discoverable on mobile (the "+
              Create view" button is right there above this message). */}
          {!v.loading && !hasOverview && !hasOtherViews && !hasFolders && (
            <p className="text-xs text-muted-foreground py-6 px-1">
              {v.isRange
                ? 'No data recorded for this date range.'
                : 'No views yet. Tap "+ Create view" to add one.'}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
