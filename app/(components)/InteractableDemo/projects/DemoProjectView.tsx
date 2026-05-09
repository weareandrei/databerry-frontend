'use client'

/**
 * Demo project view — mirror of the real `<ProjectView>` from
 * `app/hub/home/(components)/ProjectsGrid/ProjectView/ProjectView.tsx`,
 * scaled down to the demo card's footprint.
 *
 * Renders, in order:
 *   1. Project header — icon + name + Create-view + collapse + ⋮
 *   2. Folder grid (the project's root folders + "+ New folder" slot)
 *   3. Composite overview lane — `<ViewCardOverviewChart>` (prop-drilled
 *      with mock data) + `<ViewCardOverviewSources>` side-by-side on
 *      desktop, stacked on mobile.
 *   4. Wide PostHog lane — `<ViewCardFunnel>` if the project has one.
 *   5. Tile grid — every other view (`<DemoViewCard>`).
 *
 * Folder navigation is in-place: tapping a folder card swaps the
 * current folder and re-renders the body with that folder's
 * subfolders + views (same UX the real project view has). A "Back"
 * button appears at the top while the user is inside a folder.
 *
 * The `⋮` menu offers Rename / Delete via simple `window.prompt` /
 * `window.confirm`. Replacing them with the styled real-app dialogs
 * was deemed out of scope for the demo.
 */

import { useState } from 'react'
import {
  ArrowsClockwise,
  CaretDown,
  CaretLeft,
  DotsThreeVertical,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { ViewCardOverviewChart } from '@/app/hub/(components)/view/ViewCardOverviewChart'
import { ViewCardOverviewSources } from '@/app/hub/(components)/view/ViewCardOverviewSources'
import { ViewCardFunnel } from '@/app/hub/(components)/view/ViewCardFunnel'
import { useDemoContext } from '../context/DemoContext'
import type { DemoProject, DemoView } from '../context/DemoContext'
import { DemoViewCard } from '../DemoViewCard'
import { DemoCreateViewModal } from '../DemoCreateViewModal'
import {
  MOCK_OVERVIEW_CHARTS,
  MOCK_OVERVIEW_SOURCES,
  MOCK_OVERVIEW_USERS,
} from '../demoMocks'
import type { Folder as RealFolder } from '@/types/folder'
import type { View as RealView } from '@/types/view'
import type {
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
  ProjectOverviewChartConfig,
} from '@/types/view'

interface DemoProjectViewProps {
  project: DemoProject
}

// Project the demo's project / folder shapes into what the shared
// real components expect. The shared `<FolderGrid>` consumes
// `Folder` (from `@/types/folder`); we hand it a minimal shape.
function toRealFolder(f: { id: string; name: string; projectId: string; parentId: string | null }): RealFolder {
  return {
    ...f,
    userId: 'demo',
    createdAt: '',
    updatedAt: '',
  }
}

// Build a `RealView` shell for the overview composite tiles. The
// shared `<ViewCardOverviewChart>` reads `view.id` / `view.projectId`
// + uses `view.config` for initial metric — we pass the metric
// explicitly via props so config can stay empty.
function toRealOverviewView(v: DemoView): RealView {
  return {
    id: v.id,
    name: v.name,
    projectId: v.projectId,
    folderId: v.folderId,
    connectionId: v.connectionId,
    connectionType: v.connectionType,
    type: v.kind === 'overview-chart' ? 'project_overview' : 'project_overview_sources',
    config: {},
    value: null,
    isPinned: v.pinned,
    userId: 'demo',
    createdAt: '',
  }
}

export function DemoProjectView({ project }: DemoProjectViewProps) {
  const {
    folders,
    views,
    globalDate,
    deleteFolder,
    renameFolder,
    createFolder,
    renameProject,
    deleteProject,
    deleteView,
    togglePin,
  } = useDemoContext()

  // Folder navigation — the user can drill into a subfolder; "Back"
  // returns one level up. Mirrors the real project view's
  // `currentFolderId` state.
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [createViewOpen, setCreateViewOpen] = useState(false)

  const currentFolder = currentFolderId
    ? folders.find(f => f.id === currentFolderId)
    : null

  // Subfolders shown in the folder grid: at root, all the project's
  // top-level folders; inside a folder, that folder's children.
  const subFolders = currentFolderId
    ? folders.filter(f => f.parentId === currentFolderId)
    : folders.filter(f => f.projectId === project.id && f.parentId === null)

  // Views to show: overview/composite views always live at project
  // root; "regular" tiles + funnel show inside the current folder
  // (or all of the project's tiles if at root).
  const projectViews = views.filter(v => v.projectId === project.id)
  const overviewChart = projectViews.find(v => v.kind === 'overview-chart')
  const overviewSources = projectViews.find(v => v.kind === 'overview-sources')
  const funnel = projectViews.find(v => v.kind === 'funnel')
  const regularViews = projectViews.filter(
    v =>
      v.kind !== 'overview-chart' &&
      v.kind !== 'overview-sources' &&
      v.kind !== 'funnel' &&
      // Folder scoping: at root we show everything; inside a folder
      // we show only that folder's tiles.
      (currentFolderId ? v.folderId === currentFolderId : true),
  )

  // Local metric state for the overview chart — one set per project
  // view (the demo never has more than one overview chart per
  // project, so this is fine). Real mode persists; demo just keeps
  // the picked metrics in component state.
  const [primaryMetric, setPrimaryMetric] = useState<OverviewPrimaryMetric>('visitors')
  const [secondaryMetric, setSecondaryMetric] = useState<OverviewSecondaryMetric>(null)
  const handleMetricChange = (next: ProjectOverviewChartConfig) => {
    setPrimaryMetric(next.primaryMetric)
    setSecondaryMetric(next.secondaryMetric)
  }

  // Sources/users tab state — same pattern as `useOverviewSourcesData`,
  // just static mock data + caller-owned tab.
  const [sourcesTab, setSourcesTab] = useState<'sources' | 'users'>('sources')

  const handleProjectMenuRename = () => {
    const next = window.prompt('Rename project', project.name)?.trim()
    if (next) renameProject(project.id, next)
  }
  const handleProjectMenuDelete = () => {
    if (window.confirm(`Delete "${project.name}"? This removes its folders + views.`)) {
      deleteProject(project.id)
    }
  }

  // Mock chart data + sources/users for THIS project — pulled from
  // `demoMocks.ts`. If the project doesn't have a mock entry, we
  // fall back to `null` so the tile shows its empty state.
  const mockChart = MOCK_OVERVIEW_CHARTS[project.id] ?? null
  const mockSources = MOCK_OVERVIEW_SOURCES[project.id] ?? []
  const mockUsers = MOCK_OVERVIEW_USERS[project.id] ?? []

  return (
    /*
      Mirror of the real `<ProjectView>` from
      `app/hub/home/(components)/ProjectsGrid/ProjectView/ProjectView.tsx`.
      The card has NO `bg` of its own — the white fill belongs to the
      sticky `<SectionHeader>` (top) and the body wrapper (bottom).
      That way the header's `rounded-t-xl` curves stay visible against
      the demo page's cream background once the card has scrolled past
      the sticky offset, instead of going invisible white-on-white.
      No `overflow:hidden` here either: it would establish a containing
      block for the sticky and break the "stick at scroll-container
      top" behaviour.
    */
    <article className="relative flex flex-col rounded-xl border shadow-card">
      <SectionHeader
        // ProjectIcon at 26 px — slightly under the real app's 30 px so
        // the header doesn't dominate the demo card's smaller frame.
        // Same pill chrome as the real one (favicon when websiteUrl set,
        // Cube fallback otherwise — demo projects have no websiteUrl so
        // this always renders the Cube pill).
        icon={<ProjectIcon websiteUrl={null} size={26} pill />}
        title={project.name}
        rightSlot={
          <div className="flex items-center gap-1.5">
            {/*
              Same `<Button>` primitive the real header uses, scaled
              down a notch (`size="sm"`, `h-8`, `px-3`, `text-xs`)
              so the create-view CTA fits inside the demo card's
              narrower header without overflowing on small screens.
              Brand-orange fill keeps it as the primary action.
            */}
            <Button
              size="sm"
              onClick={() => setCreateViewOpen(true)}
              className="rounded-full gap-1.5 px-3 h-8 bg-brand hover:bg-brand/90 text-white text-xs"
            >
              <Plus size={12} weight="bold" />
              Create view
            </Button>
            {/*
              Demo's Project menu — mirrors `<ProjectMenu>` (rounded
              white pill + DotsThreeVertical) at the same w-8 h-8 size.
              Replaces the previous bare `bg-accent` icon-only button.
            */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Project options"
                className="flex items-center justify-center w-8 h-8 rounded-full border border-stroke bg-white text-grey-dark shadow-sm hover:bg-black/[0.04] transition-colors"
              >
                <DotsThreeVertical size={14} weight="bold" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={handleProjectMenuRename} className="text-sm gap-2">
                  <PencilSimple size={13} weight="bold" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleProjectMenuDelete}
                  className="text-sm gap-2 text-destructive focus:text-destructive"
                >
                  <Trash size={13} weight="bold" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/*
              Collapse — same `<Button variant="outline" size="icon">`
              pattern the real header uses, just sized to match the
              kebab next to it (w-8 h-8). `rotate-180` on the chevron
              when collapsed keeps the affordance familiar.
            */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCollapsed(c => !c)}
              className="rounded-full shadow-sm w-8 h-8"
            >
              <CaretDown
                size={12}
                weight="bold"
                className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
              />
            </Button>
          </div>
        }
        // Sticky behaviour mirrors the real project header. The demo's
        // scroll container is the page wrapper (`overflow-y-auto` on
        // `DemoHomePage` / `DemoProjectPage`), so `top-0` is the right
        // offset — there's no above-the-card sticky label to clear like
        // there is in the real `/hub/home`. `rounded-xl` when collapsed
        // (header alone fills the card) → `rounded-t-xl` when expanded
        // (body covers the bottom).
        className={`sticky top-0 left-0 z-20 bg-white ${
          collapsed ? 'rounded-xl' : 'rounded-t-xl'
        }`}
      />

      {/* Body — hidden when collapsed.
          `bg-white rounded-b-xl` lives here (not on the parent
          `<article>`) so the sticky `<SectionHeader>` above can show its
          rounded-top curves against cream when the card has scrolled
          past the sticky offset — same pattern the real `<ProjectView>`
          uses. Body height floor (`min-h-[260px]`) keeps the empty
          state from collapsing into a sliver. */}
      {!collapsed && (
        <div className="p-4 pb-6 min-h-[260px] space-y-4 bg-white rounded-b-xl">
          {currentFolder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentFolderId(currentFolder.parentId ?? null)}
              className="-ml-2 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <CaretLeft size={11} weight="bold" />
              Back
            </Button>
          )}

          {/* Folder grid — reuses the shared `<FolderGrid>`. */}
          <FolderGrid
            folders={subFolders.map(toRealFolder)}
            onDeleteFolder={deleteFolder}
            onRenameFolder={renameFolder}
            onCreateSubfolder={(parentId, projectId) =>
              createFolder('New folder', projectId, parentId)
            }
            onCreateFolder={() =>
              createFolder('New folder', project.id, currentFolder?.id ?? null)
            }
            onFolderClick={id => setCurrentFolderId(id)}
          />

          {/* Composite overview lane — chart + sources/users.
              Only renders at project root (overview is project-level,
              not folder-scoped).

              Layout mirrors the real `<ProjectBodyViews>` from
              `app/hub/.../ProjectView.tsx`:
                - Mobile (default)  → 1 column, stacked: chart on top,
                                      sources below, horizontal divider
                                      between them.
                - md+ (≥ 768 px)   → 2 columns, chart fills `1fr` on
                                      the left, sources panel fixed
                                      `minmax(200px,260px)` on the
                                      right, vertical divider between
                                      them.
              The breakpoint is `md` (vs the real app's `xl`) because
              the demo card hits its `4xl` (896 px) width at `md`,
              which is enough room for the side-by-side layout to
              breathe. The shared chart component gets the new
              `compact` prop so its height drops from
              `h-[280px] xl:h-[340px]` → flat `h-[200px]`, fitting the
              shorter row alongside the sources panel without
              overwhelming the demo frame. */}
          {!currentFolderId && overviewChart && mockChart && (
            <div className="rounded-xl border bg-background grid grid-cols-1 md:grid-cols-[1fr_minmax(200px,260px)] divide-y divide-stroke md:divide-y-0 md:divide-x">
              <ViewCardOverviewChart
                view={toRealOverviewView(overviewChart)}
                dateFrom={globalDate.from}
                dateTo={globalDate.to}
                mode={globalDate.mode}
                primaryMetric={primaryMetric}
                secondaryMetric={secondaryMetric}
                onMetricChange={handleMetricChange}
                chart={mockChart}
                loading={false}
                error={null}
                onRefresh={() => {/* no-op in demo */}}
                onPin={() => togglePin(overviewChart.id)}
                chromeless
                compact
              />
              {overviewSources && (
                <ViewCardOverviewSources
                  view={toRealOverviewView(overviewSources)}
                  dateFrom={globalDate.from}
                  dateTo={globalDate.to}
                  tab={sourcesTab}
                  onTabChange={setSourcesTab}
                  sources={{
                    data: mockSources,
                    loading: false,
                    error: null,
                    fetched: true,
                  }}
                  users={{
                    data: mockUsers,
                    loading: false,
                    error: null,
                    fetched: true,
                    provider: 'posthog',
                  }}
                  onRefreshSources={() => {/* no-op */}}
                  onRefreshUsers={() => {/* no-op */}}
                  onPin={() => togglePin(overviewSources.id)}
                  chromeless
                />
              )}
            </div>
          )}

          {/* Wide PostHog lane — only the funnel for now (the user's
              spec listed funnel as one of the views). Retention /
              users widgets are wired up but not seeded for the demo. */}
          {!currentFolderId && funnel && funnel.kind === 'funnel' && (
            <ViewCardFunnel
              view={{
                id: funnel.id,
                name: funnel.name,
                projectId: funnel.projectId,
                folderId: funnel.folderId,
                connectionId: funnel.connectionId,
                connectionType: funnel.connectionType,
                type: 'posthog_funnel',
                config: {},
                value: null,
                isPinned: funnel.pinned,
                userId: 'demo',
                createdAt: '',
              }}
              steps={funnel.steps}
              loading={false}
              error={null}
              onUntrack={() => deleteView(funnel.id)}
              onPin={() => togglePin(funnel.id)}
              isPinned={funnel.pinned}
            />
          )}

          {/* Regular tile grid — `grid-cols-2 lg:grid-cols-3` mirrors
              the real project view's responsive grid, but rolled tighter
              so each tile sits comfortably in the demo's narrow
              card width. */}
          {regularViews.length > 0 && (
            <div
              className="grid grid-cols-2 lg:grid-cols-3 gap-3"
              style={{ gridAutoRows: '110px' }}
            >
              {regularViews.map(v => (
                <DemoViewCard
                  key={v.id}
                  view={v}
                  onUntrack={() => deleteView(v.id)}
                  onPin={() => togglePin(v.id)}
                />
              ))}
            </div>
          )}

          {/* Empty state — nothing in this scope (folders + views
              both empty) and we're not loading any. */}
          {subFolders.length === 0 &&
            regularViews.length === 0 &&
            !overviewChart &&
            !funnel && (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-muted-foreground">
                  Nothing here yet.
                  <span className="ml-1">
                    <ArrowsClockwise size={11} weight="thin" className="inline" />
                  </span>
                </p>
              </div>
            )}
        </div>
      )}

      <DemoCreateViewModal
        open={createViewOpen}
        onOpenChange={setCreateViewOpen}
        projectId={project.id}
        folderId={currentFolder?.id ?? subFolders[0]?.id ?? `${project.id}-root`}
      />
    </article>
  )
}
