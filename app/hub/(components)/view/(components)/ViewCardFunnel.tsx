'use client'

/**
 * Funnel card — renders a PostHog `posthog_funnel` view as a
 * horizontal "river" funnel that narrows at each step, going
 * left-to-right. See `HorizontalFunnelChart` below for the shape
 * + label rendering. Light theme; same red→orange→yellow palette
 * as the OverviewChart's bar gradient (thinner = brighter:
 * `#FF4852` at the wide start, `#FFA446` at the narrow end).
 *
 * Each step boundary shows two numbers (per the design spec):
 *   - above the shape: absolute count + small step-name caption
 *   - below the shape: % of starting users + drop-off count
 *
 * Display modes (same `config.displayMode` polymorphism every
 * other multi-mode tile uses):
 *   - chart  → `col-span-3 row-span-2` everywhere. 3 cols wide so
 *              the per-step pill labels don't crush on 4-5 step
 *              funnels. Demo height is NOT controlled here (the
 *              demo's parent is a flex-col card, not a grid, so
 *              row-span is inert) — see `HorizontalFunnelChart`'s
 *              `dense` prop for the demo's larger min-height.
 *   - value  → no span (default 1×1) — compact "from → to + %"
 *              tile rendered by `FunnelValueBody` (unchanged).
 * Funnel is expected to render INSIDE a CSS grid (the project
 * body's tile grid). Real dashboard's `<ViewCardRenderer>`
 * dispatches through to this card; the demo's `<DemoProjectView>`
 * does the same.
 */

import { useState } from 'react'
import { ArrowRight, Sliders } from '@phosphor-icons/react'
import { FunnelChart } from '@/components/charts'
import type { FunnelStep } from '@/components/charts/types'
import { SkeletonRows, SkeletonBlock } from './ViewSkeleton'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import { EditFunnelModal } from '../../modals/EditFunnelModal'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { ConnectionMissingError, type PosthogFunnelStep } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'
import type { View } from '@/types/view'
import { cn } from '@/lib/utils'

// Shared formatter so step counts and drop-off counts are consistent.
const fmt = new Intl.NumberFormat('en-US')
// Show one decimal for tiny conversions (`0.4%`, `2.1%`) and integer
// for everything `≥ 10%` so the column reads cleanly.
const fmtPct = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`

/**
 * Compact "single value" body for a funnel — used when the view's
 * `config.displayMode === 'value'`. Shows the overall start→end
 * conversion as one big number (the percentage) plus the user count
 * that made it all the way through, with a tiny "first step → last
 * step" subtitle so the reader knows which two events are being
 * compared.
 *
 * Different from the regular value tiles (`<ViewCard>`) on purpose —
 * a funnel's single value is meaningless without context (62% of
 * what?). The from/to row supplies that context.
 */
function FunnelValueBody({ steps }: { steps: PosthogFunnelStep[] }) {
  const first = steps[0]
  const last = steps[steps.length - 1]
  // Overall conversion = last step's conversion-from-start. PostHog's
  // funnel response already includes this on every step, so we just
  // read it off the final step rather than recomputing.
  const overallPct = last.conversionFromStart
  return (
    <div className="px-4 pb-5 pt-3">
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-semibold tabular-nums leading-none text-foreground">
          {fmtPct(overallPct)}
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          ({fmt.format(last.count)} of {fmt.format(first.count)})
        </p>
      </div>
      {/* From → To subtitle. Truncates if either name is long; the
          arrow stays anchored in the middle so the row reads as one
          continuous "first event → last event" expression. */}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate" title={first.name}>{first.name}</span>
        <ArrowRight size={11} weight="bold" className="shrink-0" />
        <span className="truncate" title={last.name}>{last.name}</span>
      </div>
    </div>
  )
}

function toFunnelSteps(steps: PosthogFunnelStep[]): FunnelStep[] {
  return steps.map(s => ({
    name: s.name,
    value: s.count,
    conversionFromStart: s.conversionFromStart,
  }))
}


interface ViewCardFunnelProps {
  view: View
  onUntrack?: (id: string) => void
  steps: PosthogFunnelStep[] | null
  loading: boolean
  error: ViewResourceError | null
  /**
   * @deprecated Card always renders the funnel results now (the
   * PostHog backend serves any date range). Kept on the props for
   * backward compatibility with existing call sites; remove when
   * those have stopped passing it.
   */
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  onConnectionAssigned?: (updated: View) => void
  /** See `ViewCard.chromeless`. */
  chromeless?: boolean
  /** See `ViewCard.dense`. Demo-only. */
  dense?: boolean
  /**
   * Extra classes merged onto the funnel's outer `<ViewWrapper>` — lets a
   * caller size/position it without an extra wrapper (the wrapper is
   * already `h-full`, so a fixed-height *parent* is the most reliable way
   * to set its height; this is for spans, margins, etc.). Merged after the
   * grid-span classes.
   */
  className?: string
}

export function ViewCardFunnel({
  view,
  onUntrack,
  steps,
  loading,
  error,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
  chromeless = false,
  dense = false,
  className,
}: ViewCardFunnelProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing
  // Display mode — the same `displayMode` config field every other
  // polymorphic view-type uses (Stripe gross, GA users, PostHog
  // daily_counter). Default to `chart` for backwards compatibility:
  // existing funnel rows in the DB don't carry `displayMode`, and the
  // step-by-step bar layout was the only mode this card supported
  // before, so unset rows should keep that look.
  const displayMode =
    (view.config as { displayMode?: string } | null)?.displayMode === 'value'
      ? 'value'
      : 'chart'
  const isValueMode = displayMode === 'value' && steps != null && steps.length >= 2

  // Grid span — funnel slots into the same tile grid as ViewCardChart
  // / ViewCard etc., so it owns its own `col-span` / `row-span`:
  //   - `chart` mode → `col-span-3 row-span-2` in the real
  //     dashboard, `col-span-3 row-span-3` in the demo (`dense`).
  //     The demo's tile grid uses `gridAutoRows: 110px`, so
  //     row-span-3 gives the funnel a ~354 px cell — enough room
  //     for the wider funnel shape + per-step pill labels without
  //     squashing. Real dashboard uses row-span-2 per the "no
  //     change" feedback on that path. Always 3 cols wide so the
  //     per-step label columns don't crush on 4-5 step funnels.
  //   - `value` mode → no span (default 1×1) — the compact "from →
  //     to + percentage" tile slots into the grid alongside other
  //     single-cell value tiles like Stripe MRR or PostHog
  //     `daily_counter`.
  const gridSpan = isValueMode
    ? ''
    : `col-span-3 ${dense ? 'row-span-3' : 'row-span-2'}`

  return (
    <>
      <ViewWrapper
        className={cn(gridSpan, className)}
        variant={chromeless ? 'borderless' : 'default'}
      >
        <ViewHeader
          name={view.name}
          connectionType={view.connectionType}
          connectionLabel="PostHog"
          isDisconnected={isDisconnected}
          isConnectionMissing={isConnectionMissing}
          onReconnect={() => setReassignOpen(true)}
          onUntrack={onUntrack}
          viewId={view.id}
          projectName={projectName}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onPin={onPin}
          isPinned={isPinned}
          dense={dense}
          // `view` + `onUpdated` enable the convert-to-mode menu
          // items (`Convert to value` / `Convert to chart`). Wired
          // here so funnels participate in the same menu pattern as
          // every other multi-mode tile.
          view={view}
          onUpdated={onConnectionAssigned}
          // Funnel-specific dropdown item — opens the edit modal so
          // the user can add / remove / reorder / change steps and
          // tweak the conversion window without re-creating the view.
          // Gated on a present connection: editing without an
          // attached PostHog connection makes no sense (no event
          // list to pick from).
          extraMenuItems={
            view.connectionId ? (
              <DropdownMenuItem
                onClick={() => setEditOpen(true)}
                className="text-sm gap-2"
              >
                <Sliders size={13} weight="bold" />
                Edit funnel…
              </DropdownMenuItem>
            ) : null
          }
        />

        {/* Value- and chart-mode bodies wrapped in a single
            `data-no-dnd` marker (display: contents so it has zero
            layout impact — flex children of `<ViewWrapper>` behave
            as if the wrapper isn't there). Dragging inside the funnel
            shouldn't start a tile drag; the header + outer padding
            remain the drag surface. See `FilteredPointerSensor`. */}
        <div data-no-dnd="true" style={{ display: 'contents' }}>
        {isValueMode ? (
          loading ? (
            <div className="px-4 pb-4 pt-3">
              <SkeletonBlock className="h-7 w-20" />
            </div>
          ) : needsReattach ? (
            <div className="px-4 pb-4 pt-2">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setReassignOpen(true)
                }}
                className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                aria-label="Attach a connection to this view"
              >
                <FetchErrorBadge message="Connection missing — click to reattach" />
              </button>
            </div>
          ) : error ? (
            <div className="px-4 pb-4 pt-2">
              <FetchErrorBadge message="Couldn't load funnel" />
            </div>
          ) : (
            <FunnelValueBody steps={steps!} />
          )
        ) : (
          <>
            {loading ? (
              <div className="px-4 py-3">
                <SkeletonRows count={4} rowClassName="h-8" />
              </div>
            ) : needsReattach ? (
              <div className="px-4 py-2">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    setReassignOpen(true)
                  }}
                  className="self-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  aria-label="Attach a connection to this view"
                >
                  <FetchErrorBadge message="Connection missing — click to reattach" />
                </button>
              </div>
            ) : error ? (
              <div className="px-4 py-2">
                <FetchErrorBadge message="Couldn't load funnel" />
              </div>
            ) : steps && steps.length < 2 ? (
              <p className="px-4 py-2 text-xs text-muted-foreground">
                Funnel needs at least 2 steps. Edit the view to configure.
              </p>
            ) : steps ? (
              <div className="flex-1 min-h-0 px-2 pb-3">
                <FunnelChart steps={toFunnelSteps(steps)} dense={dense} />
              </div>
            ) : null}
          </>
        )}
        </div>
      </ViewWrapper>

      <ReassignConnectionDialog
        view={view}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onAssigned={onConnectionAssigned}
      />

      {/* Edit-funnel modal — mounted unconditionally (cheap when
          closed), opened by the dropdown item above. On save we
          bubble the updated view via the existing
          `onConnectionAssigned` channel (parent patches its local
          state so the modal's next open reads the new config) AND
          fire `onRefresh` so the `usePosthogFunnel` hook re-fetches
          with the new steps — the hook keys on `view.id`, not on
          the config, so a config-only change wouldn't otherwise
          trigger a refetch. */}
      <EditFunnelModal
        view={view}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={updated => {
          onConnectionAssigned?.(updated)
          onRefresh?.()
        }}
      />
    </>
  )
}
