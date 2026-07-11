'use client'

/**
 * Demo project view — mirror of the real `<ProjectView>`
 * (`app/hub/(components)/project/ProjectView.tsx`), scaled to the demo
 * card's footprint.
 *
 * DESKTOP renders the same four individually-carded sections the real
 * project overview does, stacked with a 16-px gap:
 *   1. Folders — the folder grid (+ "New folder" slot, + breadcrumb /
 *      back when drilled into a subfolder). Always present.
 *   2. Overview — the project_overview composite (chart + sources),
 *      shown only at the project root.
 *   3. People — the project's cross-platform end-users (`<DemoPeople>`),
 *      root only.
 *   4. Everything else — the uniform tile grid of all other views
 *      (funnel + every `<DemoViewCard>`).
 *
 * Project identity + the ⋮ (rename / delete) + "Create view" live in
 * `<DemoProjectSidebar>` on desktop — so the body renders header-less,
 * exactly like the real one.
 *
 * MOBILE keeps the stacked "Folders / Views" section layout (mirroring
 * `<MobileProjectBody>`) with its own in-body create-view button, since
 * the sidebar is hidden at phone widths.
 *
 * Folder navigation is in-place: tapping a folder card swaps the
 * current folder and re-renders with that folder's subfolders + views.
 */

import { useMemo, useState } from 'react'
import { CaretLeft, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { ViewCardOverviewChart } from '@/app/hub/(components)/view/(components)/ViewCardOverviewChart'
import { ViewCardOverviewSources } from '@/app/hub/(components)/view/(components)/ViewCardOverviewSources'
import { ViewCardFunnel } from '@/app/hub/(components)/view/(components)/ViewCardFunnel'
import { buildOverviewChart, DEMO_POSTHOG_EVENTS, useDemoContext } from '../context/DemoContext'
import type { DemoProject, DemoView } from '../context/DemoContext'
import { DemoViewCard } from '../DemoViewCard'
import { DemoCreateViewModal } from '../DemoCreateViewModal'
import { DemoPeople } from './DemoPeople'
import {
  // `MOCK_OVERVIEW_CHARTS` is the static (non-date-aware) snapshot
  // we fall back to during the brief window between mount and the
  // CSV time-series fetch resolving. After that, the chart comes
  // from `buildOverviewChart(...)` over `timeSeries` — which now
  // also takes the current `primaryMetric` / `secondaryMetric` so
  // the in-card picker actually changes what's plotted.
  MOCK_OVERVIEW_CHARTS,
  MOCK_OVERVIEW_SOURCES,
  MOCK_OVERVIEW_COUNTRIES,
} from '../demoMocks'
import type { Folder as RealFolder } from '@/types/folder'
import type { View as RealView } from '@/types/view'
import type {
  ConnectionMetricRef,
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
  ProjectOverviewChartConfig,
} from '@/types/view'

/** Shared card chrome — matches the real `<ProjectView>`'s `CARD`. */
const CARD = 'bg-white rounded-2xl border border-stroke shadow-card'
const SURFACE_WRAP = 'rounded-xl bg-surface p-4'
const OVERVIEW_PANE = `${CARD} flex flex-col min-h-[420px] overflow-hidden`

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
    connections,
    globalDate,
    timeSeries,
    deleteFolder,
    renameFolder,
    createFolder,
    deleteView,
    togglePin,
  } = useDemoContext()

  // Folder navigation — the user can drill into a subfolder; "Back"
  // returns one level up. Mirrors the real project view's
  // `currentFolderId` state.
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
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
  const [primaryMetric, setPrimaryMetric] = useState<OverviewPrimaryMetric | null>('visitors')
  // Default secondary to 'revenue' — same default as the real dashboard's
  // CreateViewModal so the demo's first paint shows the same chart shape
  // a user gets when they create this view for real.
  const [secondaryMetric, setSecondaryMetric] = useState<OverviewSecondaryMetric>('revenue')
  // Connection-metric overrides — set when the user picks a metric from
  // the chart dropdown's "From your connections" cascade (the demo only
  // wires the PostHog → Event count path). When set, the matching axis
  // plots that event instead of the predefined metric.
  const [primaryConnMetric, setPrimaryConnMetric] = useState<ConnectionMetricRef | null>(null)
  const [secondaryConnMetric, setSecondaryConnMetric] = useState<ConnectionMetricRef | null>(null)
  const handleMetricChange = (next: ProjectOverviewChartConfig) => {
    setPrimaryMetric(next.primaryMetric)
    setSecondaryMetric(next.secondaryMetric)
    setPrimaryConnMetric(next.primaryConnectionMetric ?? null)
    setSecondaryConnMetric(next.secondaryConnectionMetric ?? null)
  }

  // PostHog connections for THIS project — feed the chart dropdown's
  // connection cascade so "PostHog → Event count" surfaces in the demo
  // (the cascade is otherwise empty without a DashboardProvider). Only
  // PostHog is included: it's the one connection metric the demo has
  // fake series for.
  const posthogConnections = useMemo(
    () => connections.filter(c => c.type === 'posthog'),
    [connections],
  )

  // Sources/countries tab state — same pattern as `useOverviewSourcesData`,
  // just static mock data + caller-owned tab.
  const [sourcesTab, setSourcesTab] = useState<'sources' | 'countries' | 'pages'>('sources')

  // Overview chart — recomputed for THIS project whenever the
  // picker (primary / secondary metric), the date range, or the CSV
  // changes. The picker state lives locally above, so `useMemo`
  // here is what makes the picker actually move the chart: switch
  // primary from `visitors` → `revenue` and the bars + total
  // re-render against `acme_gross_cents` instead of visitor counts.
  //
  // While the CSV is still loading (`timeSeries.length === 0`) we
  // fall back to the static `MOCK_OVERVIEW_CHARTS` snapshot to
  // avoid a flash of empty/null on first paint.
  const mockChart = useMemo(() => {
    if (timeSeries.length === 0) return MOCK_OVERVIEW_CHARTS[project.id] ?? null
    // A PostHog event override on either axis → plot that event's
    // per-bucket count instead of the predefined metric.
    const primaryEvent =
      primaryConnMetric?.connectionType === 'posthog'
        ? primaryConnMetric.eventName ?? null
        : null
    const secondaryEvent =
      secondaryConnMetric?.connectionType === 'posthog'
        ? secondaryConnMetric.eventName ?? null
        : null
    return buildOverviewChart(
      project.id,
      globalDate,
      timeSeries,
      // The demo's dropdown can technically blank the primary now
      // (the placeholder option) — fall back to visitors so the
      // mock chart builder always has a concrete metric.
      primaryMetric ?? 'visitors',
      secondaryMetric,
      primaryEvent,
      secondaryEvent,
    )
  }, [
    project.id,
    globalDate,
    timeSeries,
    primaryMetric,
    secondaryMetric,
    primaryConnMetric,
    secondaryConnMetric,
  ])
  const mockSources = MOCK_OVERVIEW_SOURCES[project.id] ?? []
  const mockCountries = MOCK_OVERVIEW_COUNTRIES[project.id] ?? []

  // Shared FolderGrid handlers — same on both mobile + desktop, so we
  // close over them once instead of inlining twice.
  const handleCreateSubfolder = (parentId: string, projectId: string) =>
    createFolder('New folder', projectId, parentId)
  const handleCreateRootFolder = () =>
    createFolder('New folder', project.id, currentFolder?.id ?? null)

  // The composite chart tile, shared by both layouts (built once).
  const compositeChart =
    !currentFolderId && overviewChart && mockChart ? (
      <ViewCardOverviewChart
        view={toRealOverviewView(overviewChart)}
        dateFrom={globalDate.from}
        dateTo={globalDate.to}
        mode={globalDate.mode}
        primaryMetric={primaryMetric}
        secondaryMetric={secondaryMetric}
        primaryConnectionMetric={primaryConnMetric}
        secondaryConnectionMetric={secondaryConnMetric}
        onMetricChange={handleMetricChange}
        chart={mockChart}
        loading={false}
        error={null}
        onRefresh={() => {/* no-op in demo */}}
        onPin={() => togglePin(overviewChart.id)}
        // Demo escape hatches: surface the "PostHog → Event count"
        // cascade + feed the event picker fake events (no backend).
        connectionsOverride={posthogConnections}
        posthogEventsOverride={DEMO_POSTHOG_EVENTS}
        chromeless
      />
    ) : null
  const compositeSources =
    !currentFolderId && overviewSources ? (
      <ViewCardOverviewSources
        view={toRealOverviewView(overviewSources)}
        dateFrom={globalDate.from}
        dateTo={globalDate.to}
        tab={sourcesTab}
        onTabChange={setSourcesTab}
        sources={{ data: mockSources, loading: false, error: null, fetched: true, provider: 'posthog' }}
        countries={{
          data: mockCountries,
          loading: false,
          error: null,
          fetched: true,
          provider: 'posthog',
        }}
        onRefreshSources={() => {/* no-op */}}
        onRefreshCountries={() => {/* no-op */}}
        onPin={() => togglePin(overviewSources.id)}
        chromeless
      />
    ) : null

  // The funnel tile, shared by both layouts (built once). Root only.
  const funnelTile =
    !currentFolderId && funnel && funnel.kind === 'funnel' ? (
      <ViewCardFunnel
        view={{
          id: funnel.id,
          name: funnel.name,
          projectId: funnel.projectId,
          folderId: funnel.folderId,
          connectionId: funnel.connectionId,
          connectionType: funnel.connectionType,
          type: 'posthog_funnel',
          config: { displayMode: funnel.displayMode ?? 'chart' },
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
        // `dense` activates the demo-specific row-span + min-height
        // bump inside ViewCardFunnel + HorizontalFunnelChart.
        dense
      />
    ) : null

  return (
    <>
      {/* ============================================================
          MOBILE LAYOUT — mirrors `<MobileProjectBody>`. Section cards
          (Folders / Views) with `chromeless` tiles stacked single-
          column under hairline `divide-y` dividers.
          ============================================================ */}
      <div className="flex flex-col gap-4 md:hidden">
        {/* Project header row — Cube icon + name + icon-only create. */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <ProjectIcon websiteUrl={null} size={22} pill />
            <h1 className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </h1>
          </div>
          <Button
            size="sm"
            onClick={() => setCreateViewOpen(true)}
            aria-label="Create view"
            className="rounded-full px-0 h-8 w-8 bg-primary hover:bg-primary/90 text-white shrink-0"
          >
            <Plus size={12} weight="bold" />
          </Button>
        </div>

        {/* Folder back-link — above the Folders section when drilled in. */}
        {currentFolder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolderId(currentFolder.parentId ?? null)}
            className="-mb-2 -ml-2 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground self-start"
          >
            <CaretLeft size={11} weight="bold" />
            Back to {project.name}
          </Button>
        )}

        {/* ── Folders section ───────────────────────────────────── */}
        <section>
          <h2 className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-subtle">
            Folders
          </h2>
          <div className="rounded-xl border border-stroke bg-white shadow-card p-3">
            <FolderGrid
              folders={subFolders.map(toRealFolder)}
              onDeleteFolder={deleteFolder}
              onRenameFolder={renameFolder}
              onCreateSubfolder={handleCreateSubfolder}
              onCreateFolder={handleCreateRootFolder}
              onFolderClick={id => setCurrentFolderId(id)}
            />
          </div>
        </section>

        {/* ── Overview composite (root only) ────────────────────── */}
        {compositeChart && (
          <section>
            <h2 className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-subtle">
              Overview
            </h2>
            <div className="rounded-xl border border-stroke bg-white shadow-card flex flex-col divide-y divide-stroke">
              {compositeChart}
              {compositeSources}
            </div>
          </section>
        )}

        {/* ── People (root only) ────────────────────────────────── */}
        {!currentFolderId && (
          <section>
            <h2 className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-subtle">
              People
            </h2>
            <div className="rounded-xl border border-stroke bg-white shadow-card p-3">
              <DemoPeople />
            </div>
          </section>
        )}

        {/* ── Other views ───────────────────────────────────────── */}
        <section>
          <h2 className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-subtle">
            Views
          </h2>
          {regularViews.length > 0 || funnelTile ? (
            <div className="rounded-xl border border-stroke bg-white shadow-card flex flex-col divide-y divide-stroke">
              {funnelTile && (
                <ViewCardFunnel
                  view={{
                    id: funnel!.id,
                    name: funnel!.name,
                    projectId: funnel!.projectId,
                    folderId: funnel!.folderId,
                    connectionId: funnel!.connectionId,
                    connectionType: funnel!.connectionType,
                    type: 'posthog_funnel',
                    config: { displayMode: funnel!.displayMode ?? 'chart' },
                    value: null,
                    isPinned: funnel!.pinned,
                    userId: 'demo',
                    createdAt: '',
                  }}
                  steps={funnel!.steps}
                  loading={false}
                  error={null}
                  onUntrack={() => deleteView(funnel!.id)}
                  onPin={() => togglePin(funnel!.id)}
                  isPinned={funnel!.pinned}
                  chromeless
                  dense
                />
              )}
              {regularViews.map(v => (
                <DemoViewCard
                  key={v.id}
                  view={v}
                  onUntrack={() => deleteView(v.id)}
                  onPin={() => togglePin(v.id)}
                  chromeless
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-3 px-1">
              No views yet. Tap <span className="font-medium">+</span> above to add one.
            </p>
          )}
        </section>
      </div>

      {/* ============================================================
          DESKTOP LAYOUT — three stacked cards on the surface bg:
          Project overview (folders + chart) / People / Views.
          ============================================================ */}
      <div className="hidden md:flex md:flex-col gap-4 bg-white min-h-full p-6">
        <div className={SURFACE_WRAP}>
          <div className="flex flex-col gap-3">
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
            <FolderGrid
              folders={subFolders.map(toRealFolder)}
              onDeleteFolder={deleteFolder}
              onRenameFolder={renameFolder}
              onCreateSubfolder={handleCreateSubfolder}
              onCreateFolder={handleCreateRootFolder}
              onFolderClick={id => setCurrentFolderId(id)}
            />
          </div>
        </div>

        {compositeChart && (
          <div className={SURFACE_WRAP}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(240px,320px)] gap-4">
              <div className={OVERVIEW_PANE}>
                <div className="flex min-h-0 flex-1 flex-col">{compositeChart}</div>
              </div>
              {compositeSources && (
                <div className={OVERVIEW_PANE}>
                  <div className="flex min-h-0 flex-1 flex-col">{compositeSources}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {!currentFolderId && (
          <div className={SURFACE_WRAP}>
            <section className={`${CARD} p-5`}>
              <DemoPeople />
            </section>
          </div>
        )}

        <div className={SURFACE_WRAP}>
          <section className={`${CARD} p-5`}>
            {regularViews.length > 0 || funnelTile ? (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                style={{ gridAutoRows: '110px' }}
              >
                {funnelTile}
                {regularViews.map(v => (
                  <DemoViewCard
                    key={v.id}
                    view={v}
                    onUntrack={() => deleteView(v.id)}
                    onPin={() => togglePin(v.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-6">
                {currentFolderId
                  ? 'No views in this folder yet.'
                  : 'No other views yet. Use “Create view” in the sidebar to add one.'}
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Shared modal — one instance, driven by the `createViewOpen`
          state the mobile layout's create-view button sets. (Desktop's
          create-view lives in `<DemoProjectSidebar>`, which owns its
          own modal instance.) */}
      <DemoCreateViewModal
        open={createViewOpen}
        onOpenChange={setCreateViewOpen}
        projectId={project.id}
        folderId={currentFolder?.id ?? subFolders[0]?.id ?? `${project.id}-root`}
      />
    </>
  )
}
