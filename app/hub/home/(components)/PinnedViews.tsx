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
import { PushPin, ArrowsClockwise } from '@phosphor-icons/react'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardOverviewChart } from '@/app/hub/(components)/view/ViewCardOverviewChart'
import { ViewCardOverviewSources } from '@/app/hub/(components)/view/ViewCardOverviewSources'
import {
  WidePosthogViewRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/view/renderers/WidePosthogViewRenderer'
import { useViewLiveValue } from '@/app/hub/(components)/view/data'
import { useStripeSyncOnMount } from '@/lib/hooks/useStripeSyncOnMount'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
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
              <ViewCardOverviewChart
                key={group.chart!.id}
                view={group.chart!}
                dateFrom={dateFrom}
                dateTo={dateTo}
                mode={mode}
                projectName={projectName}
                onPin={onUnpin}
              />
              <ViewCardOverviewSources
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
            <ViewCardOverviewChart
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
            <ViewCardOverviewSources
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
  widePosthog: View[]
  regular: View[]
}

function partitionPins(pins: View[]): PinPartition {
  const composites: View[] = []
  const widePosthog: View[] = []
  const regular: View[] = []
  for (const p of pins) {
    if (p.type === 'project_overview' || p.type === 'project_overview_sources')
      composites.push(p)
    else if (isWidePosthogView(p)) widePosthog.push(p)
    else regular.push(p)
  }
  return { composites, widePosthog, regular }
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
  loading?: boolean
  projects?: Project[]
}

const PinnedViews = ({
  pins,
  unpinView,
  onConnectionAssigned,
  loading = false,
  projects = [],
}: PinnedViewsProps) => {
  const dateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const dateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)
  // Read once here, pass as prop to children (PinnedViewCard, the
  // overview-chart / sources lanes). Keeps low-level view components
  // provider-free.
  const tz = useSelector((s: RootState) => s.ui.globalTimeZone)

  const { composites, widePosthog, regular } = partitionPins(pins)
  const projectNameOf = (pin: View) => projects.find(p => p.id === pin.projectId)?.name

  // Live-on-mount sync — `pins` may include Stripe tiles. Pinned cards are
  // a primary surface (top of /hub/home), so they especially benefit from
  // showing data fresher than 24h on first paint.
  useStripeSyncOnMount(pins)

  // NOTE: no `overflow-hidden` on the wrapper. `overflow: hidden` on an
  // ancestor establishes a containing block for `position: sticky` children —
  // the sticky header would then try to stick relative to this wrapper
  // instead of the viewport, breaking the "pin under the top bar" behaviour.
  // Rounded corners are preserved by giving the sticky header its own
  // `rounded-t-xl` so its `bg-main` doesn't paint past the wrapper's border.
  return (
    <div className="shrink-0 rounded-xl border border-stroke bg-white shadow-card">
      <SectionHeader
        icon={
          <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
            <PushPin size={14} weight="bold" className="text-grey-darkest" />
          </span>
        }
        title={<span className="text-base font-bold text-grey-darkest">Pinned</span>}
        // Flush against the bottom of the global top bar (which has its own
        // `border-b` acting as the divider between the two sticky rows).
        // `rounded-t-xl` replaces the removed wrapper clip so the header's
        // top corners stay rounded when the section is at rest in its
        // wrapper.
        className="sticky top-[74px] left-0 z-[10] rounded-t-xl"
      />
      {loading ? (
        <PinnedLoadingState />
      ) : pins.length === 0 ? (
        <PinnedEmptyState />
      ) : (
        <div className="p-5 flex flex-col gap-6">
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
              className="grid gap-y-6 gap-x-4 grid-flow-dense grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6"
              style={{ gridAutoRows: '140px' }}
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
      )}
    </div>
  )
}

function PinnedLoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
    </div>
  )
}

function PinnedEmptyState() {
  return (
    <p className="text-sm text-muted-foreground px-4 py-5">
      Pin a view to keep it here for quick access.
    </p>
  )
}

export default PinnedViews
