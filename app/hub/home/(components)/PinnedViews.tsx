'use client'

/**
 * Pinned views section — the panel above the project list on /hub/home.
 *
 * Three lanes inside one card:
 *   1. Composite project-overview pairs (chart + sources by project),
 *      side-by-side on xl+, stacked on smaller screens.
 *   2. Wide PostHog cards (funnel / retention / users), one per row.
 *   3. The 140px tile grid for everything else (Stripe values, GA tiles,
 *      Calendly counters, PostHog daily counters).
 *
 * All three render the same `<View*>` components used by the project
 * page; the only thing this file owns is the lane layout + the "Unpin"
 * (vs "Pin") menu semantic — when a pinned card's menu is opened the
 * action says "Unpin", and clicking it calls the parent's `unpinView`.
 */

import { useSelector } from 'react-redux'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardOverviewChartConnected } from '@/app/hub/(components)/view/ViewCardOverviewChartConnected'
import { ViewCardOverviewSourcesConnected } from '@/app/hub/(components)/view/ViewCardOverviewSourcesConnected'
import {
  WidePosthogViewRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/view/renderers/WidePosthogViewRenderer'
import { useViewLiveValue } from '@/app/hub/(components)/view/data'
import { useStripeSyncOnMount } from '@/lib/hooks/useStripeSyncOnMount'
import { formatIsoDateRange } from '@/utils/dateHelpers'
import type { RootState } from '@/store'
import type { View } from '@/types/view'
import type { Project } from '@/types/project'

// Same caption ruleset as ProjectView's dispatcher. Lives in the
// CALLER (here / `ProjectView`) — `ViewCard` itself stays
// provider-free so it can be rendered on the marketing landing page.
const DATE_RANGE_CAPTION_TYPES = new Set(['stripe_mrr'])

// ── Pinned tile (regular grid) ─────────────────────────────────────────────

interface PinnedViewCardProps {
  view: View
  projectName?: string
  dateFrom: string
  dateTo: string
  /** User's currently-selected timezone, threaded into `useViewLiveValue`
   *  so day-bucketing matches the rest of the dashboard. Read once at
   *  the top of `PinnedViews` and passed in. */
  tz: string | null
  onUnpin: (id: string) => void
  onConnectionAssigned?: (updated: View) => void
}

function PinnedViewCard({
  view,
  projectName,
  dateFrom,
  dateTo,
  tz,
  onUnpin,
  onConnectionAssigned,
}: PinnedViewCardProps) {
  const { liveValue, liveLoading, liveError, refresh } = useViewLiveValue(view, {
    dateFrom,
    dateTo,
    tz,
  })

  // Same caption logic as the project view's dispatcher — pinned MRR
  // tiles also benefit from showing the date range under their value.
  const dateRangeLabel = DATE_RANGE_CAPTION_TYPES.has(view.type)
    ? formatIsoDateRange(dateFrom, dateTo) ?? undefined
    : undefined

  return (
    <ViewCard
      view={view}
      projectName={projectName}
      liveValue={liveValue}
      liveLoading={liveLoading}
      liveError={liveError}
      onRefresh={refresh}
      refreshing={liveLoading}
      onPin={() => onUnpin(view.id)}
      isPinned={true}
      onConnectionAssigned={onConnectionAssigned}
      dateRangeLabel={dateRangeLabel}
      // No onUntrack — hides the "Untrack" (delete) item; "Unpin" replaces it.
    />
  )
}

// ── Composite lane (project_overview + project_overview_sources) ───────────

/**
 * Groups pinned project-overview views by project so each project's
 * chart + sources pair stays side-by-side. Order: stable in the order
 * the first composite of each project appears — preserves any
 * user-arranged pin order.
 */
function groupCompositesByProject(
  composites: View[],
): { projectId: string; chart?: View; sources?: View }[] {
  const byProject = new Map<string, { projectId: string; chart?: View; sources?: View }>()
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
  composites: View[]
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
              <ViewCardOverviewChartConnected
                key={group.chart!.id}
                view={group.chart!}
                dateFrom={dateFrom}
                dateTo={dateTo}
                mode={mode}
                projectName={projectName}
                onPin={onUnpin}
              />
              <ViewCardOverviewSourcesConnected
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
            <ViewCardOverviewChartConnected
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
            <ViewCardOverviewSourcesConnected
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
  composites: View[]
  customCharts: View[]
  widePosthog: View[]
  regular: View[]
}

function partitionPins(pins: View[]): PinPartition {
  const composites: View[] = []
  const customCharts: View[] = []
  const widePosthog: View[] = []
  const regular: View[] = []
  for (const p of pins) {
    if (p.type === 'project_overview' || p.type === 'project_overview_sources')
      composites.push(p)
    else if (p.type === 'custom_chart') customCharts.push(p)
    else if (isWidePosthogView(p)) widePosthog.push(p)
    else regular.push(p)
  }
  return { composites, customCharts, widePosthog, regular }
}

// ── Main component ────────────────────────────────────────────────────────

interface PinnedViewsProps {
  pins: View[]
  unpinView: (id: string) => void
  /**
   * Optional — if provided, the reassignment dialog can update the pin's
   * connectionId in place after a successful re-attach so the live value
   * refetches without requiring a full reload of the pinned section.
   */
  onConnectionAssigned?: (updated: View) => void
  projects?: Project[]
  /**
   * Mobile flag — collapses the regular tile grid to a single column
   * and the wide-posthog/composite lanes to a one-up vertical stack.
   * Default false → desktop behaviour (grid sized per breakpoint,
   * 140 px tile rows). Set by `<MobileHomeBody>` only.
   */
  singleColumn?: boolean
}

/**
 * Pinned views section — emits the lanes directly with no wrapper
 * card or sticky header. The parent (`/hub/home/page.tsx`) owns the
 * "Pinned views" label, the gating on `pins.length > 0`, and the
 * vertical spacing around this section. Keeps the empty / loading
 * branches at the page level so an empty section doesn't render an
 * orphaned label.
 */
export function PinnedViews({
  pins,
  unpinView,
  onConnectionAssigned,
  projects = [],
  singleColumn = false,
}: PinnedViewsProps) {
  const dateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const dateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)
  // Read once here, pass as prop to children (PinnedViewCard, the
  // overview-chart / sources lanes). Keeps low-level view components
  // provider-free.
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const { composites, customCharts, widePosthog, regular } = partitionPins(pins)
  const projectNameOf = (pin: View) => projects.find(p => p.id === pin.projectId)?.name

  // Live-on-mount sync — `pins` may include Stripe tiles. Pinned cards are
  // a primary surface (top of /hub/home), so they especially benefit from
  // showing data fresher than 24h on first paint.
  useStripeSyncOnMount(pins)

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
            singleColumn
              ? 'flex flex-col gap-4'
              : 'grid grid-cols-1 xl:grid-cols-2 gap-4'
          }
        >
          {customCharts.map(pin => (
            <ViewCardOverviewChartConnected
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
            <WidePosthogViewRenderer
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
          // content. Desktop unchanged: same `grid-cols-2 lg:cols-3 …`
          // grid with 140 px rows.
          className={
            singleColumn
              ? 'flex flex-col gap-3'
              : 'grid gap-y-6 gap-x-4 grid-flow-dense grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6'
          }
          style={singleColumn ? undefined : { gridAutoRows: '140px' }}
        >
          {regular.map(pin => (
            <PinnedViewCard
              key={pin.id}
              view={pin}
              projectName={projectNameOf(pin)}
              dateFrom={dateFrom}
              dateTo={dateTo}
              tz={tz}
              onUnpin={unpinView}
              onConnectionAssigned={onConnectionAssigned}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Empty + loading states intentionally removed — the parent
// (`/hub/home/page.tsx`) gates rendering on `pins.length > 0` and
// `!loading`, so we never reach this component without something to
// show. Keeps PinnedViews free of orphan-label / spinner UI that
// would otherwise show under the new "Pinned views" label.


