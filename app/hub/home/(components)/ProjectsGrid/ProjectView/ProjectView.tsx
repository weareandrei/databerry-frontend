'use client'

/**
 * Project page: header (project name, create-view button, collapse) +
 * folder breadcrumb + a body that renders the project's pinned and
 * untracked views.
 *
 * Per-view fetching lives in `app/hub/(components)/view/data/` —
 * each view-type has its own hook there. The wide PostHog cards
 * (funnel/retention/users) come from
 * `app/hub/(components)/view/renderers/WidePosthogViewRenderer.tsx`.
 *
 * What stays in this file:
 *   - The project-level state hook (`useProjectView`) — folder
 *     navigation, optimistic untrack/pin, ProjectBody data.
 *   - The dispatch component (`ViewCardRenderer`) that picks the right
 *     card for a given view-type.
 *   - The body component that lays out folders + composite lane +
 *     wide-PostHog lane + the regular tile grid.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { CaretLeft, CaretDown, ArrowsClockwise, Plus } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { ProjectViewBreadCrumbs } from './ProjectViewBreadCrumbs'
import { ProjectMenu } from './ProjectMenu'
import { EditProjectDialog } from './EditProjectDialog'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import { ViewCardOverviewChartConnected } from '@/app/hub/(components)/view/ViewCardOverviewChartConnected'
import { ViewCardOverviewSourcesConnected } from '@/app/hub/(components)/view/ViewCardOverviewSourcesConnected'
import { EVENT, trackEvent } from '@/lib/posthog'
import {
  WidePosthogViewRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/view/renderers/WidePosthogViewRenderer'
import { ViewCardRenderer } from '@/app/hub/(components)/view/renderers/ViewCardRenderer'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { useStripeSyncOnMount } from '@/lib/hooks/useStripeSyncOnMount'
import { useDashboard } from '@/contexts/DashboardContext'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { periodBoundariesInTz, todayInTz } from '@/utils/dateHelpers'
import type { RootState } from '@/store'
import type { Project } from '@/types/project'
import type { Folder } from '@/types/folder'
import type { View } from '@/types/view'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { Button } from '@/components/ui/button'

// `ViewCardRenderer` and its view-type predicate helpers
// (`isCalendlyMeetingsListView`, `isStripeTopCustomersView`,
// `isListView`) used to live inline in this file. Extracted to
// `app/hub/(components)/view/renderers/ViewCardRenderer.tsx` so
// the mobile project body can import the same dispatch logic.
// `ProjectBodyViews` below imports what it needs to partition
// views by lane.

// ── Project-level state hook ───────────────────────────────────────────────

/**
 * Drives the desktop `<ProjectView>` and the mobile `<MobileProjectBody>`
 * with the same fetch path. Owns folder navigation (current folder + back),
 * date-range awareness (`isRange`), optimistic untrack/pin, and the live-on-
 * mount Stripe sync. Both call sites pass:
 *
 *   - `project` — the project being rendered
 *   - `initialFolderId` — desktop sidebar's nav intent for this project
 *     (mobile passes `null`; the project page enters at root)
 *   - `navNonce` — bumped on each sidebar nav (desktop only). Mobile
 *     passes `0` since the route push is the navigation primitive there.
 *
 * Exported so the mobile body in `(components)/mobile/MobileProjectBody.tsx`
 * can drive itself off the same source of truth as the desktop body.
 */
export function useProjectView(
  project: Project,
  initialFolderId: string | null,
  navNonce: number,
) {
  const { folders: foldersCtx, views: viewsCtx, pins: pinsCtx } = useDashboard()
  const { enforceViewLimit } = usePlanLimits()
  const globalDateMode = useSelector((s: RootState) => s.ui.globalDateMode)
  const globalDateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const globalDateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    initialFolderId,
  )

  // Re-sync `currentFolderId` whenever the sidebar dispatches a fresh
  // nav intent. Keyed off `navNonce` so a re-click of the *same*
  // folder still fires (e.g. user navigated away inside the project,
  // wants to come back via the sidebar). When `initialFolderId` is
  // `null`, leave the user's in-page folder navigation alone — the
  // null intent means "the user clicked a different project, this
  // one's folder state isn't theirs to reset".
  useEffect(() => {
    if (initialFolderId !== null) {
      setCurrentFolderId(initialFolderId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navNonce, initialFolderId])
  const [views, setViews] = useState<View[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  // isRange = selected period is not the current period in the current mode.
  // Used for gating behaviours that only apply to historical data.
  //
  // Defer `today()` until after hydration. The redux store carries
  // server-computed dates across hydration; computing `today()` on the server
  // vs the client can flip `isRange` and cause a React 19 hydration mismatch
  // (and we'd kick off the wrong fetches on first render). Pre-mount we treat
  // the period as "current" (isRange=false), which matches the most common
  // case and never triggers historical-only branches inadvertently.
  //
  // tz-aware: "current period" uses the user's wall-clock day, not UTC.
  // While tz is null (settings still loading) we fall back to UTC so the
  // computation has *some* answer; once it lands, the boundaries re-compute.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const effectiveTz = tz ?? 'UTC'
  const currentBoundaries = mounted
    ? periodBoundariesInTz(globalDateMode, todayInTz(effectiveTz), effectiveTz)
    : null
  const isRange = currentBoundaries
    ? globalDateFrom !== currentBoundaries.from || globalDateTo !== currentBoundaries.to
    : false

  const currentFolder = currentFolderId
    ? (foldersCtx.folders.find(f => f.id === currentFolderId) ?? null)
    : null

  const subFolders = currentFolderId
    ? foldersCtx.folders.filter(f => f.parentId === currentFolderId)
    : foldersCtx.folders.filter(f => f.projectId === project.id && f.parentId === null)

  const loadViews = useCallback(async () => {
    setLoading(true)
    const data = currentFolderId
      ? await viewsCtx.fetchViewsByFolder(currentFolderId, globalDateFrom, globalDateTo)
      : await viewsCtx.fetchViewsByProject(project.id, globalDateFrom, globalDateTo)
    setViews(data)
    setLoading(false)
  }, [project.id, currentFolderId, globalDateFrom, globalDateTo, viewsCtx.refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadViews()
  }, [loadViews])

  // Live-on-mount: as soon as views land, fire a quick "did anything happen
  // since last sync" hit per Stripe connection so the tiles re-render
  // against fresh data within ~2s of opening the project. Backend throttle
  // (60s) + in-memory inflight Map mean repeat opens are cheap.
  useStripeSyncOnMount(views)

  const handleUntrack = async (viewId: string) => {
    setViews(prev => prev.filter(v => v.id !== viewId))
    await viewsCtx.untrackView(viewId)
  }

  // Swap a view's `connectionId` in place after the user attaches a fresh
  // connection through the reassignment dialog. The data hooks depend on
  // `view.connectionId`, so this triggers a refetch automatically.
  const handleConnectionAssigned = (updated: View) => {
    setViews(prev => prev.map(v => (v.id === updated.id ? updated : v)))
  }

  const handlePin = async (viewId: string) => {
    const view = views.find(v => v.id === viewId)
    if (!view) return
    // Fire BEFORE the optimistic toggle so `action` reflects the
    // intent (the value flips immediately, and reading it from `view`
    // after the toggle would invert the label).
    trackEvent(EVENT.VIEW_PINNED, {
      viewId,
      viewType: view.type,
      action: view.isPinned ? 'unpin' : 'pin',
    })
    // Optimistic toggle
    setViews(prev => prev.map(v => v.id === viewId ? { ...v, isPinned: !v.isPinned } : v))
    if (view.isPinned) {
      await pinsCtx.unpinView(viewId)
    } else {
      await pinsCtx.pinView(viewId)
    }
  }

  const handleFolderClick = (folder: Folder) => {
    // Track BEFORE the navigation so the event sticks even if the
    // route change interrupts. `parentFolderId` distinguishes
    // top-of-project folder clicks from drill-down inside a folder.
    trackEvent(EVENT.FOLDER_OPENED, {
      folderId: folder.id,
      projectId: folder.projectId,
      parentFolderId: folder.parentId,
    })
    setLoading(true)
    setCurrentFolderId(folder.id)
    setViews([])
  }

  const handleBack = () => {
    setLoading(true)
    setCurrentFolderId(null)
    setViews([])
  }

  const openCreateViewModal = () => {
    // Gate the create flow behind the plan's per-project view limit.
    // We count from the live Redux store — accurate when the user
    // has just navigated the project (typical case: the project
    // page just loaded its views). Edge case: a fresh page where
    // the user clicks "Create view" before any fetch lands shows
    // count=0 and lets the click through; the server should
    // separately enforce the cap (out of scope for this v1 wire-up).
    const projectViewCount = viewsCtx.views.filter(
      v => v.projectId === project.id,
    ).length
    if (!enforceViewLimit(projectViewCount)) return
    viewsCtx.openModal(currentFolderId, project.id)
  }

  const isEmpty = !loading && subFolders.length === 0 && views.length === 0

  return {
    views,
    loading,
    collapsed,
    setCollapsed,
    currentFolder,
    subFolders,
    isRange,
    dateFrom: globalDateFrom,
    dateTo: globalDateTo,
    mode: globalDateMode,
    // `tz` is exposed by the hook (rather than read directly inside
    // `ViewCardRenderer`) so the renderer stays a pure prop-drilling
    // component — no `useSelector` inside the rendering tree.
    tz,
    isEmpty,
    handleUntrack,
    handlePin,
    handleConnectionAssigned,
    handleFolderClick,
    handleBack,
    openCreateViewModal,
    foldersCtx,
  }
}

// ── View card renderer ─ moved to (components)/view/renderers/ViewCardRenderer.tsx
// (imported below as `ViewCardRenderer`).

// ── Main component ─────────────────────────────────────────────────────────

interface ProjectViewProps {
  project: Project
  /**
   * Pre-open this folder when the project mounts (or when a fresh
   * sidebar nav intent fires). `null` means "no folder intent for
   * this project — leave its folder state alone". The matching is
   * done one level up in `ProjectsGrid`; this component just receives
   * its own slice.
   */
  initialFolderId?: string | null
  /**
   * Bumped each time the sidebar fires a nav intent. Threaded through
   * so the folder-state effect can re-fire even when the same folder
   * is re-clicked.
   */
  navNonce?: number
}

export function ProjectView({
  project,
  initialFolderId = null,
  navNonce = 0,
}: ProjectViewProps) {
  const {
    views,
    loading,
    collapsed,
    setCollapsed,
    currentFolder,
    subFolders,
    isRange,
    dateFrom,
    dateTo,
    mode,
    tz,
    isEmpty,
    handleUntrack,
    handlePin,
    handleConnectionAssigned,
    handleFolderClick,
    handleBack,
    openCreateViewModal,
    foldersCtx,
  } = useProjectView(project, initialFolderId, navNonce)

  // Per-project mutation surface — we read from the same dashboard
  // context the rest of this component already uses (see
  // `useProjectView` above). Drives the edit + delete dialogs.
  const { projects: projectsCtx } = useDashboard()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    /*
      Each project card has NO `bg-white` of its own. The white fill
      belongs to the SectionHeader (top) and the ProjectBody wrapper
      (bottom) instead. Why: when the SectionHeader is sticky and the
      card has scrolled past, the card's bg would otherwise paint
      behind the header — its `rounded-t-xl` curves would be
      invisible (white-on-white). Moving the white to the children
      means the area "above" the sticky header (still inside the
      card's bounding box, but visually beneath the curves) shows
      dashboard cream, making the rounded corners actually read as
      rounded.

      No `overflow:hidden|clip` here either: that would establish a
      containing block for the sticky header, breaking the "stick at
      scroll-container top" behaviour.
    */
    <article
      // `data-project-id` is the hook the home page uses to find a
      // specific project for smooth-scroll-on-nav (see
      // `home/page.tsx`'s navIntent effect).
      data-project-id={project.id}
      // `scrollMarginTop` matches the 32-px sticky "Projects" label
      // that lives above the project list, so when we scrollIntoView
      // the project's top edge lands cleanly under the label rather
      // than being clipped by it.
      style={{ scrollMarginTop: 32 }}
      className="relative flex flex-col rounded-xl border border-stroke shadow-card"
    >
      <SectionHeader
        icon={
          // `<ProjectIcon pill>` owns its own chrome now — the Cube
          // fallback gets the rounded-white pill (matching the old
          // outer `<span>`); a real favicon renders bare at 30 px so
          // the site's own identity shows through cleanly. Total
          // visual footprint stays 30 × 30 either way.
          <ProjectIcon websiteUrl={project.websiteUrl} size={30} pill />
        }
        title={<ProjectViewBreadCrumbs project={project} folder={currentFolder} />}
        rightSlot={
          <div className="flex items-center gap-2">
            <Button
              onClick={openCreateViewModal}
              className="rounded-full gap-1.5 px-4 bg-brand hover:bg-brand/90 text-white"
            >
              <Plus size={14} weight="bold" />
              Create view
            </Button>
            <ProjectMenu
              onEdit={() => setEditOpen(true)}
              onDelete={() => setDeleteOpen(true)}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => setCollapsed(c => !c)}
              className="rounded-full shadow-sm"
            >
              <CaretDown
                size={13}
                weight="bold"
                className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
              />
            </Button>
          </div>
        }
        // `bg-white` replaces the previous cream-on-cream look — each
        // project header now reads as part of its own card. The
        // sticky reference frame is the home page's scrollable
        // content area (not the viewport), so the offset is just
        // 32px — the height of the sticky "Projects" label sitting
        // at `top-0` of the same scroll container.
        //
        // Rounded corners: `rounded-xl` (full) when collapsed so the
        // header alone fills the card; `rounded-t-xl` (top only) when
        // expanded so the body's `rounded-b-xl` covers the bottom.
        // Critical at the sticky position — without this the curves
        // would be invisible against the card's bg-white.
        className={`sticky top-10 left-0 z-20 bg-white ${
          collapsed ? 'rounded-xl' : 'rounded-t-xl'
        }`}
      />
      {!collapsed && (
        <ProjectBody
          projectId={project.id}
          currentFolder={currentFolder}
          handleBack={handleBack}
          subFolders={subFolders}
          foldersCtx={foldersCtx}
          loading={loading}
          handleFolderClick={handleFolderClick}
          views={views}
          isRange={isRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          tz={tz}
          handleUntrack={handleUntrack}
          handlePin={handlePin}
          handleConnectionAssigned={handleConnectionAssigned}
          isEmpty={isEmpty}
        />
      )}

      {/* Edit + delete are mounted unconditionally so their close
          animations can play even after the project disappears from
          the list (delete) or its values change (edit) — the dialog
          state lives here, the underlying mutation is fire-and-forget
          via the dashboard context. */}
      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={patch => projectsCtx.editProject(project.id, patch)}
      />
      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={() => projectsCtx.deleteProject(project.id)}
      />
    </article>
  )
}

// ── Project body ───────────────────────────────────────────────────────────

interface ProjectBodyProps {
  projectId: string
  currentFolder: Folder | null
  handleBack: () => void
  subFolders: Folder[]
  foldersCtx: {
    folders: Folder[]
    deleteFolder: (id: string) => void
    renameFolder: (folderId: string, name: string) => void | Promise<void>
    openModal: (parentId: string | null, projectId: string) => void
  }
  loading: boolean
  handleFolderClick: (folder: Folder) => void
  views: View[]
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  tz: string | null
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
  handleConnectionAssigned: (updated: View) => void
  isEmpty: boolean
}

function ProjectBody({
  projectId,
  currentFolder,
  handleBack,
  subFolders,
  foldersCtx,
  loading,
  handleFolderClick,
  views,
  isRange,
  dateFrom,
  dateTo,
  mode,
  tz,
  handleUntrack,
  handlePin,
  handleConnectionAssigned,
  isEmpty,
}: ProjectBodyProps) {
  return (
    // `bg-white rounded-b-xl` here (instead of on the parent
    // `<article>`) lets the sticky SectionHeader's rounded-top curves
    // show against dashboard cream when scrolled — see the comment on
    // the article wrapper above. `rounded-b-xl` matches the card's
    // outer rounding so the bottom looks continuous.
    <div className="p-5 pb-16 min-h-[420px] bg-white rounded-b-xl">
      {currentFolder && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="-ml-2 mb-4 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <CaretLeft size={11} weight="bold" />
          Back
        </Button>
      )}

      <div className="mb-5">
        <FolderGrid
          folders={subFolders}
          onDeleteFolder={foldersCtx.deleteFolder}
          onRenameFolder={foldersCtx.renameFolder}
          onCreateSubfolder={foldersCtx.openModal}
          onCreateFolder={() => foldersCtx.openModal(currentFolder?.id ?? null, projectId)}
          onFolderClick={id => {
            const f = foldersCtx.folders.find(fl => fl.id === id)
            if (f) handleFolderClick(f)
          }}
        />
      </div>

      {loading ? (
        <ProjectBodyLoadingState />
      ) : views.length > 0 ? (
        <ProjectBodyViews
          views={views}
          isRange={isRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          tz={tz}
          handleUntrack={handleUntrack}
          handlePin={handlePin}
          handleConnectionAssigned={handleConnectionAssigned}
        />
      ) : isEmpty ? (
        <ProjectBodyEmptyState isRange={isRange} />
      ) : null}
    </div>
  )
}

function ProjectBodyLoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
    </div>
  )
}

function ProjectBodyEmptyState({ isRange }: { isRange: boolean }) {
  return (
    <p className="text-xs text-muted-foreground py-10">
      {isRange
        ? 'No data recorded for this date range.'
        : 'No views yet. Use the + button to add one.'}
    </p>
  )
}

interface ProjectBodyViewsProps {
  views: View[]
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  /** Forwarded to `ViewCardRenderer` → per-view data hooks. Read once
   *  in `useProjectView` from `state.ui.globalTimeZone`. */
  tz: string | null
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
  handleConnectionAssigned: (updated: View) => void
}

function ProjectBodyViews({
  views,
  isRange,
  dateFrom,
  dateTo,
  mode,
  tz,
  handleUntrack,
  handlePin,
  handleConnectionAssigned,
}: ProjectBodyViewsProps) {
  const chartView = views.find(v => v.type === 'project_overview')
  const sourcesView = views.find(v => v.type === 'project_overview_sources')
  // Wide PostHog views (funnel/retention/users) ride alongside the
  // overview composite lane — full-width, stacked vertically.
  const widePosthogViews = views.filter(isWidePosthogView)
  const regularViews = views.filter(
    v =>
      v.type !== 'project_overview' &&
      v.type !== 'project_overview_sources' &&
      !isWidePosthogView(v),
  )
  return (
    <div className="flex flex-col gap-6">
      {(chartView || sourcesView) && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(280px,360px)] gap-4">
          {chartView && (
            <ViewCardOverviewChartConnected
              key={chartView.id}
              view={chartView}
              dateFrom={dateFrom}
              dateTo={dateTo}
              mode={mode}
              onUntrack={handleUntrack}
              onPin={handlePin}
            />
          )}
          {sourcesView && (
            <ViewCardOverviewSourcesConnected
              key={sourcesView.id}
              view={sourcesView}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onUntrack={handleUntrack}
              onPin={handlePin}
            />
          )}
        </div>
      )}
      {widePosthogViews.length > 0 && (
        <div className="flex flex-col gap-4">
          {widePosthogViews.map(v => (
            <WidePosthogViewRenderer
              key={v.id}
              view={v}
              historical={isRange}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onUntrack={handleUntrack}
              onPin={handlePin}
              onConnectionAssigned={handleConnectionAssigned}
            />
          ))}
        </div>
      )}
      {regularViews.length > 0 && (
        <div
          className="grid gap-y-6 gap-x-4 grid-flow-dense grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6"
          style={{ gridAutoRows: '140px' }}
        >
          {regularViews.map(view => (
            <ViewCardRenderer
              key={view.id}
              view={view}
              isRange={isRange}
              dateFrom={dateFrom}
              dateTo={dateTo}
              mode={mode}
              tz={tz}
              onUntrack={handleUntrack}
              onPin={handlePin}
              onConnectionAssigned={handleConnectionAssigned}
            />
          ))}
        </div>
      )}
    </div>
  )
}
