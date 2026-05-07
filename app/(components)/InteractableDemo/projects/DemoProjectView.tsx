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
  Cube,
  DotsThreeVertical,
  Plus,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
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
    <article className="flex flex-col rounded-xl border bg-background shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card rounded-t-xl">
        <span className="flex items-center justify-center rounded-full bg-background border p-1.5 shrink-0">
          <Cube size={14} weight="thin" className="text-muted-foreground" />
        </span>
        <h2 className="flex-1 min-w-0 truncate text-sm font-semibold text-foreground">
          {project.name}
        </h2>
        <Button
          size="sm"
          className="rounded-full gap-1 px-3 h-7"
          onClick={() => setCreateViewOpen(true)}
        >
          <Plus size={11} weight="bold" />
          <span className="text-xs">Create view</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <DotsThreeVertical size={14} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={handleProjectMenuRename} className="text-sm">
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleProjectMenuDelete}
              className="text-sm text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center w-7 h-7 rounded-full border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <CaretDown
            size={11}
            weight="bold"
            className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Body — hidden when collapsed */}
      {!collapsed && (
        <div className="p-4 space-y-4">
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
              not folder-scoped). Stacked vertically inside the demo
              card; the real app shows them side-by-side on `xl:` but
              we don't have that much horizontal room here. */}
          {!currentFolderId && overviewChart && mockChart && (
            <div className="rounded-xl border bg-background flex flex-col divide-y">
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
