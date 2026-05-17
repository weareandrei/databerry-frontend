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

import { useMemo, useState } from 'react'
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
import { buildOverviewChart, useDemoContext } from '../context/DemoContext'
import type { DemoProject, DemoView } from '../context/DemoContext'
import { DemoViewCard } from '../DemoViewCard'
import { DemoCreateViewModal } from '../DemoCreateViewModal'
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
    timeSeries,
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
  // Default secondary to 'revenue' — same default as the real dashboard's
  // CreateViewModal so the demo's first paint shows the same chart shape
  // a user gets when they create this view for real.
  const [secondaryMetric, setSecondaryMetric] = useState<OverviewSecondaryMetric>('revenue')
  const handleMetricChange = (next: ProjectOverviewChartConfig) => {
    setPrimaryMetric(next.primaryMetric)
    setSecondaryMetric(next.secondaryMetric)
  }

  // Sources/countries tab state — same pattern as `useOverviewSourcesData`,
  // just static mock data + caller-owned tab.
  const [sourcesTab, setSourcesTab] = useState<'sources' | 'countries'>('sources')

  const handleProjectMenuRename = () => {
    const next = window.prompt('Rename project', project.name)?.trim()
    if (next) renameProject(project.id, next)
  }
  const handleProjectMenuDelete = () => {
    if (window.confirm(`Delete "${project.name}"? This removes its folders + views.`)) {
      deleteProject(project.id)
    }
  }

  // Overview chart — recomputed for THIS project whenever the
  // picker (primary / secondary metric), the date range, or the CSV
  // changes. The picker state lives locally above, so `useMemo`
  // here is what makes the picker actually move the chart: switch
  // primary from `visitors` → `revenue` and the bars + total
  // re-render against `acme_gross_cents` instead of visitor counts.
  //
  // While the CSV is still loading (`timeSeries.length === 0`) we
  // fall back to the static `MOCK_OVERVIEW_CHARTS` snapshot to
  // avoid a flash of empty/null on first paint. The fallback isn't
  // metric-aware, but that window is sub-second; the user can't
  // poke the picker that fast.
  //
  // Sources / users panels stay static — they're list-shaped data
  // where date filtering at the demo's tiny scale would either show
  // the same thing or empty out entirely, neither being useful.
  const mockChart = useMemo(() => {
    if (timeSeries.length === 0) return MOCK_OVERVIEW_CHARTS[project.id] ?? null
    return buildOverviewChart(
      project.id,
      globalDate,
      timeSeries,
      primaryMetric,
      secondaryMetric,
    )
  }, [project.id, globalDate, timeSeries, primaryMetric, secondaryMetric])
  const mockSources = MOCK_OVERVIEW_SOURCES[project.id] ?? []
  const mockCountries = MOCK_OVERVIEW_COUNTRIES[project.id] ?? []

  // Shared FolderGrid handlers — same on both mobile + desktop, so we
  // close over them once instead of inlining twice.
  const handleCreateSubfolder = (parentId: string, projectId: string) =>
    createFolder('New folder', projectId, parentId)
  const handleCreateRootFolder = () =>
    createFolder('New folder', project.id, currentFolder?.id ?? null)

  return (
    <>
      {/* ============================================================
          MOBILE LAYOUT — mirrors `<MobileProjectBody>` in
          `app/hub/(components)/mobile/MobileProjectBody.tsx`.
          Section cards (Folders / Views) with `chromeless` tiles
          stacked single-column under hairline `divide-y` dividers.
          ============================================================ */}
      <div className="flex flex-col gap-4 md:hidden">
        {/* Project header row — minimal version of `<SectionHeader>`.
            Cube icon + project name + icon-only Create-view button.
            We skip the kebab + collapse from the desktop header: at
            phone widths the controls are easier to mis-tap, and
            collapse adds no value on a card-shaped scroll surface
            this short. The shared modal at the end still drives
            create-view; rename/delete are desktop-only affordances
            for now. */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <ProjectIcon websiteUrl={null} size={22} pill />
            <h1 className="truncate text-sm font-semibold text-grey-darkest">
              {project.name}
            </h1>
          </div>
          <Button
            size="sm"
            onClick={() => setCreateViewOpen(true)}
            aria-label="Create view"
            className="rounded-full px-0 h-8 w-8 bg-brand hover:bg-brand/90 text-white shrink-0"
          >
            <Plus size={12} weight="bold" />
          </Button>
        </div>

        {/* Folder back-link — sits above the Folders section when the
            user has drilled into a subfolder. Same affordance as
            `<MobileProjectBody>`. */}
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

        {/* ── Folders section ─────────────────────────────────────
            Always renders so the `+ New folder` slot inside
            `<FolderGrid>` has a home — mirrors `<MobileProjectBody>`'s
            "Card always renders" behaviour. */}
        <section>
          <h2 className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-grey-light">
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

        {/* ── Views section ───────────────────────────────────────
            Composite overview card (chart + sources stacked with
            hairline divider) + other-views card (funnel + every
            regular tile in a single-column `divide-y` stack, each
            `chromeless` so its own border doesn't nest inside the
            outer card). */}
        <section>
          <h2 className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-grey-light">
            Views
          </h2>

          {/* Composite overview card — only at project root, since
              overview is project-level not folder-scoped. The two
              tiles already opt into `<ViewWrapper variant='borderless'>`
              themselves via the `chromeless` prop, so the outer card's
              `divide-y` is what separates them visually. */}
          {!currentFolderId && overviewChart && mockChart && (
            <div className="rounded-xl border border-stroke bg-white shadow-card flex flex-col divide-y divide-stroke mb-3">
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
                // compact
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
              )}
            </div>
          )}

          {/* Other-views card — single-column flat stack. The funnel
              rides above the regular tiles (same order desktop uses).
              Each tile is `chromeless`; `divide-y` between rows gives
              the "stacked but related" feel `<MobileProjectBody>` has.

              `flex flex-col` (not a grid) means each tile sizes to
              its own content — sentry's `col-span-2 row-span-2`
              classes are inert here, so the issue list renders at
              its natural height instead of being clamped to 220 px. */}
          {(regularViews.length > 0 || (!currentFolderId && funnel && funnel.kind === 'funnel')) && (
            <div className="rounded-xl border border-stroke bg-white shadow-card flex flex-col divide-y divide-stroke">
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
                  chromeless
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
          )}

          {/* Empty-state copy — only when nothing renders inside Views. */}
          {!overviewChart && !funnel && regularViews.length === 0 && (
            <p className="text-xs text-muted-foreground py-3 px-1">
              No views yet. Tap <span className="font-medium">+</span> above to add one.
            </p>
          )}
        </section>
      </div>

      {/* ============================================================
          DESKTOP LAYOUT — unchanged from before. Sticky
          `<SectionHeader>` + body with overview lane + tile grid.
          The card has NO `bg` of its own — the white fill belongs to
          the sticky `<SectionHeader>` (top) and the body wrapper
          (bottom). That way the header's `rounded-t-xl` curves stay
          visible against the demo page's cream background once the
          card has scrolled past the sticky offset, instead of going
          invisible white-on-white. No `overflow:hidden` here either:
          it would establish a containing block for the sticky and
          break the "stick at scroll-container top" behaviour.
          ============================================================ */}
      <article className="relative hidden md:flex flex-col rounded-xl border shadow-card">
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

              On mobile the label collapses to just the `+` glyph
              inside a circular button: the demo card's narrow
              mobile width can't accommodate the full
              `[icon-plus-label]` + kebab + collapse trio without
              wrapping the row. Same affordance survives — the icon
              alone is recognisable as "add" — only the text changes.
            */}
            <Button
              size="sm"
              onClick={() => setCreateViewOpen(true)}
              aria-label="Create view"
              className="rounded-full gap-1.5 px-0 md:px-3 h-8 w-8 md:w-auto bg-brand hover:bg-brand/90 text-white text-xs"
            >
              <Plus size={12} weight="bold" />
              <span className="hidden md:inline">Create view</span>
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
                // compact
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
              )}
            </div>
          )}

          {/* Regular tile grid — single column on mobile (the demo
              card itself is only ~76vw on phones, so even 2 columns
              would crunch each tile to ~135 px wide, dropping the
              value text to a single squashed line). At `md:` and up
              we step to 2 cols, then 3 cols at `lg:` — same
              progression the real project body uses, just shifted one
              tier earlier because the demo card is narrower than the
              full dashboard.

              The funnel rides in this same grid (not a separate wide
              lane like the real dashboard) so its width snaps to
              EXACTLY two grid cells — `col-span-2 row-span-3`. The
              real dashboard caps the funnel at 672 px via
              `WidePosthogViewRenderer`'s wrapper; the demo uses grid
              cells instead, which gives a more proportional shape
              alongside the regular tiles.

              A tile carrying `col-span-2` (funnel, sentry) inside a
              single-column grid gracefully degrades — CSS Grid clips
              the span to the available columns, so the tile becomes
              full-width and `row-span-2` still applies. No mobile-
              specific span overrides needed. */}
          {(regularViews.length > 0 || (!currentFolderId && funnel && funnel.kind === 'funnel')) && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              style={{ gridAutoRows: '110px' }}
            >
              {/*
                Funnel renders DIRECTLY in the tile grid (no wrapper
                div). `<ViewCardFunnel>` applies its own `col-span` /
                `row-span` based on `view.config.displayMode`:
                  - chart → `col-span-2 row-span-2` (2×2 like
                    `<ViewCardChart>`)
                  - value → no span (1×1 like the value tiles around it)
                Same behaviour the real dashboard's
                `<ViewCardRenderer>` applies — keeps the demo and real
                modes visually identical.
              */}
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
                    // Pass `displayMode` through `config` — same key
                    // `<ViewCardFunnel>` reads in real-mode rows.
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
                />
              )}
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

      </article>

      {/* Shared modal — one instance, driven by the same
          `createViewOpen` state that both layouts (mobile + desktop)
          set. Lives at the Fragment root so it isn't gated by either
          layout's `hidden md:*` toggling. */}
      <DemoCreateViewModal
        open={createViewOpen}
        onOpenChange={setCreateViewOpen}
        projectId={project.id}
        folderId={currentFolder?.id ?? subFolders[0]?.id ?? `${project.id}-root`}
      />
    </>
  )
}
