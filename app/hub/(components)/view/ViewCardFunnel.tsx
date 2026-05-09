'use client'

/**
 * Funnel card — renders a PostHog `posthog_funnel` view as a vertical
 * stack of steps, each with a horizontal progress bar showing the
 * step's count relative to the funnel's start (step 0).
 *
 * Layout per step (3 rows):
 *   1. Step number + name on the left, count + cumulative-conversion
 *      % on the right. Big enough to read at a glance, tabular nums
 *      so columns align.
 *   2. Thin solid `bg-brand` (orange) fill on a faint
 *      `bg-black/[0.05]` track. Width = step.count / startCount,
 *      clamped to a 3% floor so a near-zero conversion still leaves
 *      a visible bar instead of disappearing.
 *   3. Drop-off subtitle (skipped for the first step): a small down
 *      arrow + "{N} dropped · {pct}% from previous". Indented under
 *      the step number column so it visually belongs to its step.
 *
 * Why three rows instead of "everything inside the bar"? The bar
 * itself is 6 px tall (`h-1.5`) — too short to host any text. A
 * dedicated header row above keeps the count + percentage readable
 * at every viewport width, and frees the bar to be a pure visual
 * indicator (which is what bars are good at). Same shape the rest of
 * the dashboard's progress-style indicators use.
 *
 * Grid sizing: the component applies its own `col-span` / `row-span`
 * via the wrapper's className, sized off `view.config.displayMode`:
 *   - chart  → `col-span-2 row-span-2` — same footprint as
 *              `<ViewCardChart>` (Stripe gross volume), so the funnel
 *              sits cleanly alongside other 2×2 tiles in the grid.
 *   - value  → no span (default 1×1) — slots into the grid as a
 *              regular single-cell value tile.
 * Funnel is therefore expected to render INSIDE a CSS grid (the
 * project body's tile grid). Real dashboard's `<ViewCardRenderer>`
 * dispatches through to this card; the demo's `<DemoProjectView>`
 * does the same. Earlier versions wrapped funnels in a separate
 * full-width "wide PostHog lane" — that's gone.
 */

import { useState } from 'react'
import { ArrowsClockwise, ArrowDown, ArrowRight } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import { ConnectionMissingError, type PosthogFunnelStep } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'
import type { View } from '@/types/view'

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
        <p className="text-3xl font-semibold tabular-nums leading-none text-grey-darkest">
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

function FunnelBar({
  step,
  index,
  startCount,
  prevCount,
  isFirst,
}: {
  step: PosthogFunnelStep
  /** 0-based step index — used for the leading "1.", "2.", "3." prefix. */
  index: number
  startCount: number
  prevCount: number
  isFirst: boolean
}) {
  const widthPct = startCount > 0 ? Math.max(3, (step.count / startCount) * 100) : 0
  const dropOff = isFirst ? 0 : prevCount - step.count

  return (
    <div className="flex flex-col gap-1.5">
      {/* Header row: step number + name + count + cumulative %. */}
      <div className="flex items-baseline gap-2">
        <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {index + 1}.
        </span>
        <p
          className="min-w-0 flex-1 truncate text-sm font-medium text-grey-darkest"
          title={step.name}
        >
          {step.name}
        </p>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-grey-darkest">
          {fmt.format(step.count)}
        </span>
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {fmtPct(step.conversionFromStart)}
        </span>
      </div>

      {/* Progress bar — solid `bg-brand` fill on a faint track. The
          fill is rounded at both ends; the track itself is rounded
          so the empty area mirrors the fill's shape. */}
      <div
        className="relative h-1.5 overflow-hidden rounded-full bg-black/[0.05]"
        // ARIA — communicate the funnel value to screen readers.
        // Without this, the fill visual is invisible to assistive
        // tech.
        role="progressbar"
        aria-valuenow={Math.round((step.count / Math.max(1, startCount)) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${step.name}: ${fmtPct(step.conversionFromStart)} of starting users`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${widthPct}%` }}
        />
      </div>

      {/* Drop-off subtitle — indent under the step number column so
          the line visually anchors to its step. Skipped for the
          first step (no previous to drop off from). */}
      {!isFirst && (
        <div className="flex items-center gap-1 pl-7 text-[11px] text-muted-foreground">
          <ArrowDown size={10} weight="bold" />
          <span className="tabular-nums">
            {fmt.format(dropOff)} dropped · {fmtPct(step.conversionFromPrev)} from previous
          </span>
        </div>
      )}
    </div>
  )
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
}: ViewCardFunnelProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing
  const startCount = steps?.[0]?.count ?? 0
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
  //   - `chart` mode → `col-span-2 row-span-2`, matches the gross-volume
  //     chart card's footprint and gives the step-by-step bars enough
  //     room to breathe.
  //   - `value` mode → no span (default 1×1) — the compact "from →
  //     to + percentage" tile slots into the grid alongside other
  //     single-cell value tiles like Stripe MRR or PostHog
  //     `daily_counter`.
  const gridSpan = isValueMode ? '' : 'col-span-2 row-span-2'

  return (
    <>
      <ViewWrapper
        className={`${gridSpan}`}
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
        />

        {/* Value-mode body — compact "from/to + percentage + count"
            tile. Chart-mode body — the step-by-step bar layout. */}
        {isValueMode ? (
          loading ? (
            <div className="flex items-center gap-1.5 px-4 pb-4 pt-3">
              <ArrowsClockwise size={13} weight="bold" className="animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading funnel…</span>
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
          <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
            {loading ? (
              <div className="flex items-center gap-1.5 py-3">
                <ArrowsClockwise size={13} weight="bold" className="animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading funnel…</span>
              </div>
            ) : needsReattach ? (
              <div className="py-2">
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
              <FetchErrorBadge message="Couldn't load funnel" />
            ) : steps && steps.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                Funnel needs at least 2 steps. Edit the view to configure.
              </p>
            ) : steps ? (
              steps.map((s, i) => (
                <FunnelBar
                  key={`${s.name}-${i}`}
                  step={s}
                  index={i}
                  startCount={startCount}
                  prevCount={i === 0 ? s.count : steps[i - 1].count}
                  isFirst={i === 0}
                />
              ))
            ) : null}
          </div>
        )}
      </ViewWrapper>

      <ReassignConnectionDialog
        view={view}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onAssigned={onConnectionAssigned}
      />
    </>
  )
}
