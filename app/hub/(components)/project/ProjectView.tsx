'use client'

/**
 * The `[project]/overview` AND `[project]/folders/[folderId]` page
 * body — three individually-carded sections, stacked in the page's
 * scroll container with the shared 16-px gap:
 *
 *   1. Folders — the folder grid (+ back / breadcrumb when inside a
 *      folder). Always present (carries the "New folder" CTA).
 *   2. Overview — the project_overview composite (chart + sources).
 *      Shown only at the project root (folders carry no composite).
 *   3. Everything else — the uniform tile grid of all other views
 *      (drag-to-reorder; the only surface that offers it).
 *
 * Folder navigation is ROUTE-driven: `folderId` comes from the URL,
 * and clicking a folder (here OR in the `<ProjectSidebar>`) pushes
 * `/hub/projects/[id]/folders/[folderId]` — so both entry points land
 * on the exact same view and the sidebar can mark the active folder.
 *
 * Each section is its own white card. The project identity / 3-dots /
 * "Create view" live in the `<ProjectSidebar>`.
 */

import { CaretLeft, Plus } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { ProjectViewBreadCrumbs } from './ProjectViewBreadCrumbs'
import { ProjectBodyViews, OverviewComposite } from './ProjectBodyViews'
import { ProjectPeople } from './ProjectPeople'
import { useProjectView } from './useProjectView'
import { EVENT, trackEvent } from '@/lib/posthog'
import type { Project } from '@/types/project'

const CARD = 'bg-white rounded-2xl border border-stroke shadow-card'

interface ProjectViewProps {
  project: Project
  /** Current folder from the route — `null`/omitted = project root. */
  folderId?: string | null
  /**
   * Case-insensitive name filter applied to views + folders (the
   * search bar). Empty = no filter. While a filter is active
   * drag-reorder is disabled — persisting an order computed from a
   * filtered subset would corrupt the saved order.
   */
  filterQuery?: string
}

export function ProjectView({ project, folderId = null, filterQuery = '' }: ProjectViewProps) {
  const router = useRouter()
  const {
    views,
    loading,
    currentFolder,
    subFolders,
    isRange,
    dateFrom,
    dateTo,
    mode,
    tz,
    handleUntrack,
    handlePin,
    handleConnectionAssigned,
    handleReorder,
    openCreateViewModal,
    foldersCtx,
  } = useProjectView(project, folderId)

  const base = `/hub/projects/${project.id}`
  const openFolder = (id: string) => {
    const folder = foldersCtx.folders.find(f => f.id === id)
    if (!folder) return
    trackEvent(EVENT.FOLDER_OPENED, {
      folderId: folder.id,
      projectId: folder.projectId,
      parentFolderId: folder.parentId,
    })
    router.push(`${base}/folders/${folder.id}`)
  }
  const goBack = () =>
    router.push(
      currentFolder?.parentId ? `${base}/folders/${currentFolder.parentId}` : `${base}/overview`,
    )

  // Render-time filter — typing never refetches.
  const normalizedFilter = filterQuery.trim().toLowerCase()
  const visibleViews = normalizedFilter
    ? views.filter(v => v.name.toLowerCase().includes(normalizedFilter))
    : views
  const visibleFolders = normalizedFilter
    ? subFolders.filter(f => f.name.toLowerCase().includes(normalizedFilter))
    : subFolders

  // Split out the composite pair; everything else flows into card 3.
  const chartView = visibleViews.find(v => v.type === 'project_overview')
  const sourcesView = visibleViews.find(v => v.type === 'project_overview_sources')
  const hasComposite = !!(chartView && sourcesView)
  const tileCount = visibleViews.filter(
    v => v.id !== chartView?.id && v.id !== sourcesView?.id,
  ).length

  return (
    // `pt-4` on mobile keeps the first element (the create-view button)
    // clear of the fixed `<MobileTopBar>`; desktop already gets its gap
    // from the `<HubTopBar>` above the scroll area, so `md:pt-0`.
    <div className="flex flex-col gap-4 mx-4 mb-4 pt-4 md:pt-0">
      {/* Create view — MOBILE ONLY. Desktop's lives in the project
          sidebar; mobile has no sidebar, so the action surfaces here
          at the top of the project page. */}
      <button
        type="button"
        onClick={openCreateViewModal}
        className="md:hidden flex items-center justify-center gap-1.5 rounded-full bg-brand hover:bg-brand/90 text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer"
      >
        <Plus size={14} weight="bold" />
        Create view
      </button>

      {/* ── 1. Folders ──────────────────────────────────────────── */}
      <section className={`${CARD} p-4`}>
        {currentFolder && (
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="-ml-2 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <CaretLeft size={11} weight="bold" />
              Back
            </Button>
            <ProjectViewBreadCrumbs project={project} folder={currentFolder} />
          </div>
        )}
        <FolderGrid
          folders={visibleFolders}
          onDeleteFolder={foldersCtx.deleteFolder}
          onRenameFolder={foldersCtx.renameFolder}
          onCreateSubfolder={foldersCtx.openModal}
          onCreateFolder={() => foldersCtx.openModal(currentFolder?.id ?? null, project.id)}
          onFolderClick={openFolder}
        />
      </section>

      {/* ── 2. Overview composite ───────────────────────────────────
          Loading → chart skeleton (the overview almost always has a
          composite). Loaded with no composite (inside a folder) →
          section omitted. */}
      {loading ? (
        <section className={`${CARD} p-5`}>
          <div className="h-[300px] rounded-xl bg-black/[0.05] animate-pulse" />
        </section>
      ) : hasComposite ? (
        <section className={`${CARD} p-5`}>
          <OverviewComposite
            chartView={chartView!}
            sourcesView={sourcesView!}
            dateFrom={dateFrom}
            dateTo={dateTo}
            mode={mode}
            handleUntrack={handleUntrack}
            handlePin={handlePin}
          />
        </section>
      ) : null}

      {/* ── 3. People ───────────────────────────────────────────────
          Project-scoped (not folder-scoped), so only at the root. */}
      {!folderId && (
        <section className={`${CARD} p-5`}>
          <ProjectPeople projectId={project.id} />
        </section>
      )}

      {/* ── 4. Every other view ─────────────────────────────────── */}
      <section className={`${CARD} p-5`}>
        {loading ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[140px] rounded-xl bg-black/[0.05]" />
            ))}
          </div>
        ) : tileCount > 0 ? (
          <ProjectBodyViews
            views={visibleViews}
            isRange={isRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            mode={mode}
            tz={tz}
            handleUntrack={handleUntrack}
            handlePin={handlePin}
            handleConnectionAssigned={handleConnectionAssigned}
            handleReorder={handleReorder}
            sortable={!normalizedFilter}
          />
        ) : (
          <p className="text-xs text-muted-foreground py-6">
            {normalizedFilter
              ? 'No views match your search.'
              : isRange
                ? 'No data recorded for this date range.'
                : 'No other views yet. Use “Create view” in the sidebar to add one.'}
          </p>
        )}
      </section>
    </div>
  )
}
