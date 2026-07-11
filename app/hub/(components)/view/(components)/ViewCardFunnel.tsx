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

/**
 * Horizontal funnel chart — replaces the old vertical per-step bars.
 *
 * Renders the whole funnel as one SVG shape: a left-to-right "river"
 * that narrows at each step, with a vertical divider + label cluster
 * per step. Light theme; uses the same red→orange→yellow palette as
 * the OverviewChart's single-bar gradient so the dashboard's funnels
 * and charts read as the same visual family.
 *
 * Colour rule per user spec: thinner = brighter. The wide left side
 * (start of funnel) is `#FF4852` (red); the narrow right side (end)
 * is `#FFA446` (yellow-orange). Because funnels narrow monotonically,
 * a linear left→right gradient does the right thing automatically.
 *
 * Each step gets TWO labels: the absolute count (above the shape) and
 * the percent-of-start (below). A small step-name caption sits above
 * the count so the column header is self-documenting. First-step
 * column also shows "from start" instead of a redundant 100% drop-off.
 *
 * `preserveAspectRatio="none"` on the SVG lets the shape stretch
 * horizontally with the container — the viewBox carries the
 * proportions and the labels (positioned in HTML, not SVG) handle the
 * scaling-with-card-width.
 */
/**
 * Multi-layer band definition. Each layer is a vertically-scaled
 * copy of the funnel shape centered on the midline, painted in one
 * of the three brand-palette colours. Order is back→front: outer
 * (red, widest) painted first, inner (yellow, narrowest) painted
 * last so it sits on top. Mirrors the layered/glowing look from the
 * design reference (where multiple cyan/blue/purple bands stacked
 * gave the funnel its depth).
 */
const FUNNEL_LAYERS: Array<{ color: string; scale: number; opacity: number }> = [
  { color: '#FF4852', scale: 1.0,  opacity: 0.75 }, // outermost — red
  { color: '#FC5327', scale: 0.65, opacity: 0.90 }, // middle    — secondary
  { color: '#FFA446', scale: 0.35, opacity: 1.0  }, // innermost — yellow
]

/**
 * Half-width of the smooth transition at each zone boundary, as a
 * fraction of zone width. 0.18 → 36% of a zone width is the
 * narrowing zone (centred on the boundary); the remaining 64% is
 * the flat plateau that holds the funnel at the step's width.
 */
const TRANSITION_HALF_FRAC = 0.18

/**
 * How far the first / last pill is inset from the funnel's outer
 * edges, expressed as a fraction of total funnel width.
 *
 * 0.03 ≈ 3% — at typical render widths (600–900px) that's roughly
 * 18–27px, comfortably close to the "~20px from the edge" target.
 * Using a fraction (vs a fixed pixel value) keeps HTML pills and
 * the SVG connecting lines aligned without having to measure the
 * container width.
 */
const EDGE_INSET_FRAC = 0.03

// Unique id suffix so multiple funnel cards on the same page don't
// collide on the `clipPath` id. `useId` would be the React-correct
// path but it adds a hydration hop for what is otherwise a
// stable-per-instance computation — a render-time random nonce
// keeps the path simple and re-keys correctly across instances.
let CLIP_ID_COUNTER = 0

function HorizontalFunnelChart({
  steps,
  dense = false,
}: {
  steps: PosthogFunnelStep[]
  /**
   * Demo callers pass `dense=true`. The demo lives inside a
   * `flex flex-col` card with no fixed-height grid cell, so the
   * SVG container's `flex-1` has nothing to grow into and the
   * funnel sizes purely off its `min-h-…` floor. We raise that
   * floor in the demo so the funnel reads as a substantial
   * visual rather than a thin sliver. Real-dashboard callers
   * (`dense=false`) keep the smaller default so a `row-span-2`
   * grid cell isn't stretched past its allocation.
   */
  dense?: boolean
}) {
  // Single stable clip-path id per mount. Mounts cheap; only used to
  // namespace `<clipPath id>` so SVGs from sibling funnels on the
  // same page don't fight over the same id.
  const [clipId] = useState(() => `funnel-zone-clip-${++CLIP_ID_COUNTER}`)

  // Zone = vertical column of the chart owned by one step. N steps
  // → N zones. `hoveredZone` is the zone the cursor is currently
  // over; `null` = no hover, full brightness everywhere.
  const [hoveredZone, setHoveredZone] = useState<number | null>(null)

  const startCount = steps[0]?.count ?? 0
  if (startCount === 0) {
    return (
      <p className="px-4 pb-4 pt-2 text-xs text-muted-foreground">
        No users entered the funnel in this period.
      </p>
    )
  }
  const N = steps.length
  if (N < 2) {
    return (
      <p className="px-4 pb-4 pt-2 text-xs text-muted-foreground">
        Funnel needs at least 2 steps. Edit the view to configure.
      </p>
    )
  }

  // SVG viewBox. `preserveAspectRatio="none"` stretches both axes to
  // fit the rendered pixel box, so these units are purely
  // proportional. Keep `W` generous so bezier control points have
  // horizontal room for smooth S-curves.
  const W = 1000
  const H = 200
  const MIN_HEIGHT_PCT = 0.06

  const heights = steps.map(s =>
    Math.max(s.count / startCount, MIN_HEIGHT_PCT) * H,
  )
  // Each step gets its own EVENLY-SIZED zone (W/N wide). Pill +
  // connecting line positioning is NOT uniform — the first and
  // last pills are inset a small fixed distance from the funnel's
  // outer edges (so they read as "anchored to the start/end" of
  // the funnel), while middle pills sit at their zone's centre.
  // Hover targets still cover the full zone regardless.
  const zoneW = W / N
  const TRANSITION_HALF = zoneW * TRANSITION_HALF_FRAC
  const edgeInset = W * EDGE_INSET_FRAC
  /** x of zone `i`'s pill + connecting line.  First/last get a
   *  fixed edge inset; middle pills get their zone's centre. */
  const pillX = (i: number) => {
    if (i === 0) return edgeInset
    if (i === N - 1) return W - edgeInset
    return (i + 0.5) * zoneW
  }
  /** Same positioning rule as `pillX`, expressed as a percent of the
   *  container width so HTML pills align with the SVG lines. */
  const pillLeftPct = (i: number) => {
    if (i === 0) return EDGE_INSET_FRAC * 100
    if (i === N - 1) return (1 - EDGE_INSET_FRAC) * 100
    return ((i + 0.5) / N) * 100
  }

  /**
   * Single continuous funnel path. Walks left→right plateau /
   * transition / plateau / transition / … then closes the bottom
   * edge right→left in mirror. Each transition is a horizontal-
   * tangent cubic-bezier S-curve centred on the zone boundary.
   * `scale` lets the same shape be re-used for each stacked band
   * by vertically scaling about the midline.
   */
  function buildFunnelPath(scale: number): string {
    const top = heights.map(h => (H - h * scale) / 2)
    const bot = heights.map(h => (H + h * scale) / 2)

    const parts: string[] = []
    parts.push(`M 0 ${top[0]}`)

    // Top edge — plateau then transition per zone, no transition
    // after the last zone (we're at the right edge).
    for (let i = 0; i < N; i++) {
      const plateauEndX = i === N - 1 ? W : (i + 1) * zoneW - TRANSITION_HALF
      parts.push(`L ${plateauEndX} ${top[i]}`)
      if (i < N - 1) {
        const boundary = (i + 1) * zoneW
        const transEndX = boundary + TRANSITION_HALF
        // Horizontal-tangent S-curve: control x = boundary on both
        // sides → smooth blend with the flat plateaus on either
        // side of the transition.
        parts.push(
          `C ${boundary} ${top[i]}, ${boundary} ${top[i + 1]}, ${transEndX} ${top[i + 1]}`,
        )
      }
    }

    // Drop straight down at the right edge to start the bottom edge.
    parts.push(`L ${W} ${bot[N - 1]}`)

    // Bottom edge — mirror of the top, traversed right→left.
    for (let i = N - 1; i >= 0; i--) {
      const plateauStartX = i === 0 ? 0 : i * zoneW + TRANSITION_HALF
      parts.push(`L ${plateauStartX} ${bot[i]}`)
      if (i > 0) {
        const boundary = i * zoneW
        const transStartX = boundary - TRANSITION_HALF
        parts.push(
          `C ${boundary} ${bot[i]}, ${boundary} ${bot[i - 1]}, ${transStartX} ${bot[i - 1]}`,
        )
      }
    }

    parts.push('Z')
    return parts.join(' ')
  }

  const isZoneLit = (i: number) => hoveredZone === null || hoveredZone === i

  return (
    // Flex column that fills its allocated height — the SVG container
    // below is `flex-1` so the funnel shape STRETCHES to use whatever
    // vertical space the card has after the pill rows. In the
    // dashboard `row-span-3` gives the card ~300 px and the funnel
    // grows accordingly; in the demo's `flex flex-col divide-y` card
    // the chain bottoms out at the SVG container's `min-h-[140px]`
    // so the funnel never shrinks below its readable default.
    <div className="px-4 pt-2 pb-3 flex flex-col h-full min-h-0">
      <div className="relative flex flex-col flex-1 min-h-0">
        {/* Top pills — step name (tiny caption) above + count pill.
            All centered on their zone, so first/last pills don't
            cling to the chart's outer edges. `shrink-0` so the
            flex-1 SVG container below can't squeeze them. */}
        <div className="relative h-10 shrink-0">
          {steps.map((s, i) => {
            const leftPct = pillLeftPct(i)
            const lit = isZoneLit(i)
            return (
              <div
                key={`top-${i}`}
                className="absolute bottom-0 max-w-[18%]"
                style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
              >
                <p
                  className={cn(
                    'text-[9px] uppercase tracking-wide truncate text-center transition-opacity duration-150',
                    lit ? 'text-subtle' : 'text-subtle/30',
                  )}
                  title={s.name}
                >
                  {s.name}
                </p>
                <div className="flex justify-center mt-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white transition-opacity duration-150',
                      lit ? 'opacity-100' : 'opacity-25',
                    )}
                  >
                    {fmt.format(s.count)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* SVG container — `flex-1` claims all remaining vertical
            space after the pill rows; the `min-h-…` floor takes
            over in auto-height parents (where flex-1 has nothing
            to grow into). Demo callers (`dense=true`) get a larger
            floor so the funnel reads as a substantial visual in
            the demo's flex-col card; real-dashboard callers use
            the smaller default so a `row-span-2` grid cell isn't
            stretched past its allocation. `min-w-0` is the
            standard flex escape-hatch so the container can shrink
            horizontally below its content's natural width. */}
        <div
          className={cn(
            'relative flex-1 min-w-0',
            // Demo gets a larger floor for two reasons:
            // (a) the mobile demo renders the funnel in a flex-col
            //     card (no grid), so `flex-1` has nothing to grow
            //     into and `min-h` IS the height;
            // (b) the desktop demo gives the funnel a row-span-3
            //     grid cell (~354 px after gap math), so `flex-1`
            //     grows the SVG to fill — `min-h` is just a floor.
            // 200 px in demo: visually substantial on mobile,
            // ignored on desktop where `flex-1` exceeds it.
            // 140 px in real dashboard: keeps the SVG inside its
            // smaller `row-span-2` cell (~220-280 px depending on
            // grid; flex-1 still typically exceeds this floor).
            dense ? 'min-h-[200px]' : 'min-h-[140px]',
          )}
        >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block w-full h-full overflow-visible"
          aria-label="Funnel conversion chart"
        >
          {/* Clip rectangle for the hovered zone. Defined inside
              the SVG so the id is namespaced to this `<svg>`
              element and visible to the `<g clipPath>` below. Only
              emitted when hovering — `<defs>` with no `id` users is
              cheap but skipping it altogether avoids any SVG-spec
              edge case around empty defs. */}
          {hoveredZone !== null && (
            <defs>
              <clipPath id={clipId}>
                <rect
                  x={hoveredZone * zoneW}
                  y={0}
                  width={zoneW}
                  height={H}
                />
              </clipPath>
            </defs>
          )}

          {/* Vertical connecting lines through each zone's pill
              position (right-of-centre, near the narrowing — same
              x as `pillX(i)`). Painted first so the funnel bands
              draw on top of them inside the funnel envelope. */}
          {steps.map((_, i) => {
            const cx = pillX(i)
            const lit = isZoneLit(i)
            return (
              <line
                key={`line-${i}`}
                x1={cx}
                y1={0}
                x2={cx}
                y2={H}
                stroke="#1B1B1B"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                opacity={lit ? 0.55 : 0.15}
                style={{ transition: 'opacity 150ms' }}
              />
            )
          })}

          {/* Base funnel — full bright when no hover; dimmed when
              a zone is hovered. Same `<g opacity>` wrapper drives
              both states so the cross-fade is one CSS transition. */}
          <g
            opacity={hoveredZone === null ? 1 : 0.25}
            style={{ transition: 'opacity 150ms' }}
          >
            {FUNNEL_LAYERS.map((layer, idx) => (
              <path
                key={`base-${idx}`}
                d={buildFunnelPath(layer.scale)}
                fill={layer.color}
                opacity={layer.opacity}
              />
            ))}
          </g>

          {/* Bright overlay — only emitted on hover; clipped to
              the hovered zone via the `<clipPath>` above. The
              dim base underneath shows through everywhere else,
              and the bright overlay paints over the dim base
              inside the hovered zone → net effect: hovered zone
              full bright, every other zone dim. */}
          {hoveredZone !== null && (
            <g clipPath={`url(#${clipId})`}>
              {FUNNEL_LAYERS.map((layer, idx) => (
                <path
                  key={`hi-${idx}`}
                  d={buildFunnelPath(layer.scale)}
                  fill={layer.color}
                  opacity={layer.opacity}
                />
              ))}
            </g>
          )}

          {/* Invisible hover targets — one rect per zone, full
              viewBox height so the cursor catches the zone even
              when it's outside the funnel mass (above/below the
              bands). `pointerEvents="all"` is belt-and-braces:
              `fill="transparent"` already gets events, but some
              older WebKit builds gate on the value being
              explicitly set. */}
          {Array.from({ length: N }).map((_, i) => (
            <rect
              key={`hover-${i}`}
              x={i * zoneW}
              y={0}
              width={zoneW}
              height={H}
              fill="transparent"
              pointerEvents="all"
              onMouseEnter={() => setHoveredZone(i)}
              onMouseLeave={() =>
                setHoveredZone(prev => (prev === i ? null : prev))
              }
            />
          ))}
        </svg>
        </div>

        {/* Bottom pills — % from start. Same zone-centred alignment
            + same hover-driven opacity flip as the top pills.
            The invisible spacer pill on the first line gives the
            row a natural content-driven height (instead of relying
            on `h-7` which can collapse to 0 in a constrained flex
            context). The real pills are absolute-positioned on top. */}
        <div className="relative mt-1 shrink-0">
          <span
            aria-hidden
            className="invisible inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums"
          >
            0%
          </span>
          {steps.map((s, i) => {
            const leftPct = pillLeftPct(i)
            const lit = isZoneLit(i)
            return (
              <div
                key={`bot-${i}`}
                className="absolute top-0"
                style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
              >
                <span
                  className={cn(
                    'inline-flex items-center rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white transition-opacity duration-150',
                    lit ? 'opacity-100' : 'opacity-25',
                  )}
                >
                  {fmtPct(s.conversionFromStart)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
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
              <HorizontalFunnelChart steps={steps} dense={dense} />
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
