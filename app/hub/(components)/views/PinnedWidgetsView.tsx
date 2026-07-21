'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'
import { getHomeProjectSections } from '@/app/hub/home/(components)/homeProjectSections'
import { projectDisplayLabel } from '@/app/hub/project/(components)/projectViewUtils'
import { OverviewChartWidgetConnected } from '@/app/hub/(components)/widgets/overview/OverviewChartWidgetConnected'
import { OverviewSourcesWidgetConnected } from '@/app/hub/(components)/widgets/overview/OverviewSourcesWidgetConnected'
import {
  WidePosthogWidgetRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/widgets/renderers/WidePosthogWidgetRenderer'
import { WidgetRenderer } from '@/app/hub/(components)/widgets/renderers/WidgetRenderer'
import { useStripeSyncOnMount } from '@/lib/hooks/useStripeSyncOnMount'
import {
  cellSpanClasses,
  getViewSizing,
} from '@/constants/viewSizing'
import type { RootState } from '@/store'
import type { Widget } from '@/types/widget'
import type { Project } from '@/types/project'

// ── Composite lane (project_overview + project_overview_sources) ───────────

/**
 * Groups pinned project-overview views by project so each project's
 * chart + sources pair stays side-by-side. Order: stable in the order
 * the first composite of each project appears — preserves any
 * user-arranged pin order.
 */
function groupCompositesByProject(
  composites: Widget[],
): { projectId: string; chart?: Widget; sources?: Widget }[] {
  const byProject = new Map<string, { projectId: string; chart?: Widget; sources?: Widget }>()
  for (const v of composites) {
    const key = v.projectId
    if (!byProject.has(key)) byProject.set(key, { projectId: key })
    const bucket = byProject.get(key)!
    if (v.type === 'project_overview') bucket.chart = v
    else if (v.type === 'project_overview_sources') bucket.sources = v
  }
  return Array.from(byProject.values())
}

function PinnedCompositesLane({
  composites,
  projects,
  dateFrom,
  dateTo,
  mode,
  onUnpin,
}: {
  composites: Widget[]
  projects: Project[]
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  onUnpin: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      {groupCompositesByProject(composites).map(group => {
        const projectName = projects.find(p => p.id === group.projectId)?.name
        const both = !!(group.chart && group.sources)
        // Paired state — chart + sources side-by-side at 5:2.
        if (both) {
          return (
            <div
              key={group.projectId}
              className="grid grid-cols-1 xl:grid-cols-[5fr_2fr] gap-4"
            >
              <OverviewChartWidgetConnected
                key={group.chart!.id}
                view={group.chart!}
                dateFrom={dateFrom}
                dateTo={dateTo}
                mode={mode}
                projectName={projectName}
                onPin={onUnpin}
              />
              <OverviewSourcesWidgetConnected
                key={group.sources!.id}
                view={group.sources!}
                dateFrom={dateFrom}
                dateTo={dateTo}
                projectName={projectName}
                onPin={onUnpin}
              />
            </div>
          )
        }
        // Standalone Chart — full row width.
        if (group.chart) {
          return (
            <OverviewChartWidgetConnected
              key={group.chart.id}
              view={group.chart}
              dateFrom={dateFrom}
              dateTo={dateTo}
              mode={mode}
              projectName={projectName}
              onPin={onUnpin}
            />
          )
        }
        // Standalone Sources — left-aligned, capped at the paired-state
        // width so it doesn't dwarf the panel content (a list of small chips).
        return (
          <div
            key={group.projectId}
            className="w-full xl:max-w-[28%] xl:min-w-[300px]"
          >
            <OverviewSourcesWidgetConnected
              key={group.sources!.id}
              view={group.sources!}
              dateFrom={dateFrom}
              dateTo={dateTo}
              projectName={projectName}
              onPin={onUnpin}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Pin partitioning ───────────────────────────────────────────────────────

interface PinPartition {
  composites: Widget[]
  customCharts: Widget[]
  widePosthog: Widget[]
  regular: Widget[]
}

function partitionPins(pins: Widget[]): PinPartition {
  const composites: Widget[] = []
  const customCharts: Widget[] = []
  const widePosthog: Widget[] = []
  const regular: Widget[] = []
  for (const p of pins) {
    if (p.type === 'project_overview' || p.type === 'project_overview_sources')
      composites.push(p)
    else if (p.type === 'custom_chart') customCharts.push(p)
    else if (isWidePosthogView(p)) widePosthog.push(p)
    else regular.push(p)
  }
  return { composites, customCharts, widePosthog, regular }
}

function pinnedTileWrapperClass(view: Widget, stackTiles: boolean): string {
  if (stackTiles) return ''
  const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
  return cellSpanClasses(getViewSizing(view.type, displayMode))
}

// ── Main component ────────────────────────────────────────────────────────

interface PinnedWidgetsGridProps {
  pins: Widget[]
  unpinView: (id: string) => void
  onConnectionAssigned?: (updated: Widget) => void
  projects?: Project[]
  singleColumn?: boolean
  narrowColumn?: boolean
}

/** Widget lanes only — composites, wide PostHog, and the 140px tile grid. */
export function PinnedWidgetsGrid({
  pins,
  unpinView,
  onConnectionAssigned,
  projects = [],
  singleColumn = false,
  narrowColumn = false,
}: PinnedWidgetsGridProps) {
  const dateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const dateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)
  // Read once here, pass as prop to children (WidgetRenderer, the
  // overview-chart / sources lanes). Keeps low-level view components
  // provider-free.
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const { composites, customCharts, widePosthog, regular } = partitionPins(pins)
  const projectNameOf = (pin: Widget) => projects.find(p => p.id === pin.projectId)?.name
  const isRange = dateFrom !== dateTo

  // Live-on-mount sync — `pins` may include Stripe tiles. Pinned cards are
  // a primary surface (top of /hub/home), so they especially benefit from
  // showing data fresher than 24h on first paint.
  useStripeSyncOnMount(pins)

  const stackTiles = singleColumn || narrowColumn

  return (
    <div className="flex flex-col gap-6">
      {composites.length > 0 && (
        <PinnedCompositesLane
          composites={composites}
          projects={projects}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          onUnpin={unpinView}
        />
      )}

      {customCharts.length > 0 && (
        /* 2-up grid past xl (≥1280px) — same rationale as the
           project-page custom-chart lane. `singleColumn` (mobile
           override on home) forces single-column regardless of
           breakpoint, so the layout stays vertical on phones. */
        <div
          className={
            stackTiles
              ? 'flex flex-col gap-4'
              : 'grid grid-cols-1 xl:grid-cols-2 gap-4'
          }
        >
          {customCharts.map(pin => (
            <OverviewChartWidgetConnected
              key={pin.id}
              view={pin}
              dateFrom={dateFrom}
              dateTo={dateTo}
              mode={mode}
              projectName={projectNameOf(pin)}
              onPin={unpinView}
            />
          ))}
        </div>
      )}

      {widePosthog.length > 0 && (
        <div className="flex flex-col gap-4">
          {widePosthog.map(pin => (
            <WidePosthogWidgetRenderer
              key={pin.id}
              view={pin}
              projectName={projectNameOf(pin)}
              dateFrom={dateFrom}
              dateTo={dateTo}
              pinned
              onPin={unpinView}
              onConnectionAssigned={onConnectionAssigned}
            />
          ))}
        </div>
      )}

      {regular.length > 0 && (
        <div
          // Mobile (`singleColumn`): vertical stack with a tighter gap
          // and no fixed-height grid rows — each tile sizes to its
          // content. Desktop: same dense grid as the project page,
          // with chart-mode tiles spanning 2×2 via getViewSizing.
          className={
            stackTiles
              ? 'flex flex-col gap-3'
              : 'grid gap-y-6 gap-x-4 grid-flow-dense grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6'
          }
          style={stackTiles ? undefined : { gridAutoRows: '140px' }}
        >
          {regular.map(pin => (
            <div key={pin.id} className={pinnedTileWrapperClass(pin, stackTiles)}>
              <WidgetRenderer
                view={pin}
                isRange={isRange}
                dateFrom={dateFrom}
                dateTo={dateTo}
                mode={mode}
                tz={tz}
                onPin={unpinView}
                onConnectionAssigned={onConnectionAssigned}
                forcePinned
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const PINNED_INNER_CARD = 'rounded-2xl border border-stroke bg-white p-5 shadow-card'

function PinnedWidgetsSectionHeader({ project }: { project: Project }) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/hub/project/${project.id}`)}
      className="mb-4 flex cursor-pointer items-start gap-3 text-left"
      title={`Open ${project.name}`}
    >
      <ProjectIcon websiteUrl={project.websiteUrl} size={36} pill={false} />
      <span>
        <span className="block text-sm font-semibold text-foreground">
          {projectDisplayLabel(project)}
        </span>
        <span className="mt-0.5 block text-xs text-subtle">Pinned views</span>
      </span>
    </button>
  )
}

interface PinnedWidgetsViewProps {
  pins: Widget[]
  projects: Project[]
  loading?: boolean
  unpinView: (id: string) => void
  onConnectionAssigned?: (updated: Widget) => void
  singleColumn?: boolean
  narrowColumn?: boolean
}

/** Home pinned-widgets view — grey tray, white card, per-project headers + widget grids. */
export function PinnedWidgetsView({
  pins,
  projects,
  loading = false,
  unpinView,
  onConnectionAssigned,
  singleColumn = false,
  narrowColumn = false,
}: PinnedWidgetsViewProps) {
  const sections = useMemo(
    () =>
      getHomeProjectSections(projects, pins, pins, false, '').filter(
        section => section.pins.length > 0,
      ),
    [projects, pins],
  )

  if (!loading && sections.length === 0) return null

  return (
    <ViewWrapper>
      <section className={PINNED_INNER_CARD}>
        {loading && sections.length === 0 ? (
          <div className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[140px] rounded-xl bg-black/[0.05]" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {sections.map(({ project, pins: projectPins }) => (
              <div key={project.id}>
                <PinnedWidgetsSectionHeader project={project} />
                <PinnedWidgetsGrid
                  pins={projectPins}
                  unpinView={unpinView}
                  onConnectionAssigned={onConnectionAssigned}
                  projects={projects}
                  singleColumn={singleColumn}
                  narrowColumn={narrowColumn}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </ViewWrapper>
  )
}
