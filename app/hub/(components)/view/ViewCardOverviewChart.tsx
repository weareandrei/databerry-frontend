'use client'

/**
 * Composite "project overview" chart tile. Visualises the primary
 * traffic metric (visitors / pageviews / conversions / revenue)
 * with an optional secondary overlay (conversion rate / bounce rate
 * / avg session / revenue), plus a "now" reference line that
 * advances every minute.
 *
 * Props-only data path. The component owns:
 *   - The metric-dropdown state (UI). Selecting a new metric calls
 *     back via `onConfigChange(next)`; the caller persists if it
 *     wants (real → `ALGORITHM.updateView`, demo → no-op).
 *   - The `nowTick` interval that re-derives `nowLabel` once a
 *     minute (purely visual, no fetch).
 *
 * Everything else — the actual chart payload, loading/error flags,
 * refresh trigger, conversions-dialog opener — comes from the
 * caller. Real callers compose `useOverviewChartData()` + render
 * this component. Demo callers pass static mock data.
 *
 * Why split? Real-mode is paired with a Supabase-backed
 * `PROJECT_OVERVIEW.getChart()` call inside a project page that has
 * full Redux + dashboard context. The demo (`<InteractableDemo>`
 * on the landing page) has neither — but the visual surface is the
 * same. Hoisting the data path above the component keeps a single
 * source of truth for the design.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  CaretDown,
  Check,
  Cube,
  DotsThreeVertical,
  Gear,
  Plugs,
  PushPin,
  PushPinSlash,
  Target,
  Warning,
} from '@phosphor-icons/react'
import { SkeletonBlock } from './ViewSkeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useDashboardOptional } from '@/contexts/DashboardContext'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { DragGrip } from './dnd/DragGrip'
import { ViewWrapper } from './ViewWrapper'
import { OverviewChart } from './OverviewChart'
import { PosthogEventPickerDialog } from './PosthogEventPickerDialog'
import { TrafficConnectionPicker } from '../modals/TrafficConnectionPicker'
import type { OverviewChartResponse, PosthogEventDefinition } from '@/lib/api'
import { bucketLabelForNow } from '@/utils/overviewBucketLabel'
import type {
  ConnectionMetricRef,
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
  ProjectOverviewChartConfig,
  View,
} from '@/types/view'

const PRIMARY_OPTIONS: { value: OverviewPrimaryMetric | null; label: string }[] = [
  // `null` = explicitly-empty primary — the placeholder a chart
  // starts with when it was created without a traffic tool
  // connected. Listed so the trigger resolves a label for it (and
  // the user can deliberately blank the axis).
  { value: null,          label: 'Select metric' },
  { value: 'visitors',    label: 'Visitors' },
  { value: 'pageviews',   label: 'Pageviews' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'revenue',     label: 'Revenue' },
]

const SECONDARY_OPTIONS: { value: OverviewSecondaryMetric; label: string }[] = [
  { value: null,               label: 'None' },
  { value: 'conversion_rate',  label: 'Conversion rate' },
  { value: 'bounce_rate',      label: 'Bounce rate' },
  { value: 'avg_session_sec',  label: 'Avg. session' },
  { value: 'revenue',          label: 'Revenue' },
]

// ── Connection-sourced metric options ───────────────────────────────────
//
// Below the predefined options, the dropdown shows a submenu per
// connection type (Stripe / GA / PostHog). Selecting an option pulls
// the metric from THAT connection. This is the "any data vs any data"
// feature — the predefined options above can only express the metrics
// we hard-coded in the project-overview endpoint; the connection
// options below let the user wire any metric exposed by their
// integrations into either axis.
//
// `type` identifies the provider whose chart-data endpoint we'd hit.
// `viewType` is the metric within that provider (matches existing
// view-type identifiers like `stripe_gross`, `ga_users_today`).
//
// PostHog `daily_counter` (event count) needs an event-name picker
// step before it can be plotted — for v1 of the cascade UI it shows
// a "needs configuration" toast. Stripe + GA work end-to-end as soon
// as the data path lands next turn.
interface ConnectionMetricOption {
  type: 'stripe' | 'google_analytics' | 'posthog'
  viewType: string
  label: string
  needsEventPicker?: boolean
}

// View types whose values are denominated in dollars (vs raw counts).
// Used to flip the connection-metric override's display formatter from
// "1,234" → "$1,234" in tooltips + axis ticks. Kept in sync with
// `STRIPE_CENTS_VIEW_TYPES` over in `useConnectionMetricSeries` — that
// hook divides by 100 at the wire boundary so by the time values reach
// the chart they're already in dollars, this set just controls the
// presentation.
const CURRENCY_CONNECTION_VIEW_TYPES = new Set(['stripe_gross', 'stripe_mrr'])

/**
 * Resolves a `ConnectionMetricRef` into the display label + currency
 * flag the chart needs. Looks the label up in
 * `CONNECTION_METRIC_GROUPS` (the canonical source of truth for what
 * a connection-metric view-type is called in the UI), and pairs it
 * with the currency check above. Returns `null` for an empty ref so
 * callers can write `derive(...) ?? null`-style fallbacks cleanly.
 *
 * PostHog special case: when the ref carries an `eventName`, that's
 * the specific user-selected event (e.g. "Project submitted") — show
 * it instead of the generic "Event count" group label. Mirrors how
 * the standalone PostHog value tile reads, so the user sees the same
 * identifier everywhere their event is plotted.
 */
function connectionDisplay(
  ref: ConnectionMetricRef | null | undefined,
): { label: string; isCurrency: boolean } | null {
  if (!ref) return null
  if (ref.connectionType === 'posthog' && ref.eventName) {
    return { label: ref.eventName, isCurrency: false }
  }
  const label =
    CONNECTION_METRIC_GROUPS.flatMap(g => g.options).find(
      o => o.viewType === ref.viewType,
    )?.label ?? ref.viewType
  return { label, isCurrency: CURRENCY_CONNECTION_VIEW_TYPES.has(ref.viewType) }
}

const CONNECTION_METRIC_GROUPS: {
  type: ConnectionMetricOption['type']
  label: string
  options: ConnectionMetricOption[]
}[] = [
  {
    type: 'stripe',
    label: 'Stripe',
    options: [
      { type: 'stripe', viewType: 'stripe_gross', label: 'Gross Volume' },
    ],
  },
  {
    type: 'google_analytics',
    label: 'Google Analytics',
    options: [
      { type: 'google_analytics', viewType: 'ga_users_today',     label: 'Users' },
      { type: 'google_analytics', viewType: 'ga_sessions_today',  label: 'Sessions' },
      { type: 'google_analytics', viewType: 'ga_pageviews_today', label: 'Pageviews' },
    ],
  },
  {
    type: 'posthog',
    label: 'PostHog',
    options: [
      { type: 'posthog', viewType: 'daily_counter', label: 'Event count', needsEventPicker: true },
    ],
  },
]

function readConfig(view: View): ProjectOverviewChartConfig {
  const cfg = view.config as Partial<ProjectOverviewChartConfig>
  return {
    // undefined (legacy rows) -> 'visitors'; explicit null stays
    // null so the dropdown shows its "Select metric" placeholder.
    primaryMetric: cfg.primaryMetric === undefined ? 'visitors' : cfg.primaryMetric,
    secondaryMetric: cfg.secondaryMetric ?? null,
  }
}

/**
 * Metric picker rendered as a single pill: a chart-type icon (bar vs line,
 * SVG from `/public/icons/`) on the left, the current metric label in the
 * middle, a caret on the right. The old textual "Primary" / "Overlay"
 * labels were dropped — the icon now indicates whether the metric is
 * plotted as bars or as the overlay line.
 */
/**
 * Metric dropdown — handles both predefined options (top group) and
 * connection-sourced metrics (cascade submenus). The component is
 * stateless: it displays the CURRENT selection (either a predefined
 * `value` or a `connectionMetric` ref) and fires callbacks on pick.
 *
 * When the user picks a predefined option, `onChange` fires with
 * the new value AND the connection ref is cleared (caller's job).
 * When the user picks a connection option, `onPickConnection`
 * fires with the resolved ref — the caller is expected to update
 * the parent config so the connection ref takes priority over
 * `value` in the chart's data path.
 *
 * Scoping: the cascade only surfaces submenus for providers where
 * the project has at least one eligible connection (project-scoped
 * OR Common). Same scoping rule the backend's
 * `pickTrafficProvider` uses — picking from a section the project
 * can't actually fetch data for would just produce empty charts.
 */
function MetricDropdown<T extends string | null>({
  iconSrc,
  iconAlt,
  value,
  options,
  onChange,
  connectionMetric,
  onPickConnection,
  onRequestPosthogEvent,
  projectId,
  connectionsOverride,
}: {
  iconSrc: string
  iconAlt: string
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
  /** When set, the dropdown displays this connection metric's label
   *  in its trigger (in place of the predefined `value`'s label). */
  connectionMetric: ConnectionMetricRef | null | undefined
  /** Fired when the user picks a connection metric from the cascade.
   *  Caller resolves into the proper `ConnectionMetricRef` and
   *  updates the parent config. */
  onPickConnection: (ref: ConnectionMetricRef) => void
  /** Fired when the user picks a PostHog metric from the cascade —
   *  the cascade can't commit a PostHog ref until the parent has
   *  opened the event picker and the user has chosen an event.
   *  Receives `{ connectionId }` so the parent can prefill the
   *  picker with the right connection. */
  onRequestPosthogEvent: (info: { connectionId: string }) => void
  /** Project that owns this chart — used to filter connections
   *  for the cascade (project-scoped OR Common). */
  projectId: string
  /** Demo escape hatch: when set, drives the connection cascade in
   *  place of `useDashboardOptional()` (which is null on the landing-
   *  page demo, where there's no `DashboardProvider`). Real callers
   *  omit it and the cascade reads from dashboard context as before. */
  connectionsOverride?: { id: string; type: string; projectId: string | null }[] | null
}) {
  // `useDashboardOptional` returns null on the landing-page demo (no
  // `DashboardProvider` in that tree). Without the optional variant,
  // every render of this dropdown — which `<ViewCardOverviewChart>`
  // mounts in the demo via `<InteractableDemo>` — would throw,
  // `DemoErrorBoundary` would catch + reset, the re-render would
  // throw again, and the page would loop on errors forever.
  // When no provider exists we treat the connection list as empty:
  // the cascade's `visibleGroups` ends up empty and the cascade
  // section is silently skipped, which is the right behaviour for
  // a static mock-data demo anyway.
  const dashboard = useDashboardOptional()
  const allConnections = connectionsOverride ?? dashboard?.connections.connections ?? null

  // Filter the user's connections to those eligible for THIS chart:
  // project-scoped to its project, OR Common. Matches the
  // server-side `pickTrafficProvider` scoping rule.
  const eligibleConnections = useMemo(
    () =>
      (allConnections ?? []).filter(
        c => c.projectId === projectId || c.projectId === null,
      ),
    [allConnections, projectId],
  )
  const userHasType = (type: ConnectionMetricOption['type']) =>
    eligibleConnections.some(c =>
      type === 'stripe'
        ? c.type === 'stripe' || c.type === 'stripe_manual'
        : c.type === type,
    )
  const visibleGroups = CONNECTION_METRIC_GROUPS.filter(g => userHasType(g.type))

  // Resolve the connection metric's display label for the trigger,
  // falling back to the predefined value's label when no connection
  // ref is set. `connectionDisplay()` is the single source of truth
  // — same helper the chart tooltips use, so the label the user sees
  // in the pill is identical to the one in the tooltip (e.g. PostHog
  // events show their `eventName` like "Project submitted" in both
  // places, not "Event count" in one and the name in the other).
  const connectionDerived = connectionDisplay(connectionMetric)
  const current = options.find(o => o.value === value) ?? options[0]
  const triggerLabel = connectionDerived?.label ?? current.label

  // Resolve a picked cascade option into a concrete connection
  // ref. We grab the FIRST eligible connection of the matching type
  // — same convention as the rest of the dashboard when multiple
  // connections of one type exist (see CreateViewModal's
  // `connList[0]` selection). Future iteration: push a connection
  // picker sub-page when count > 1.
  const handlePickConnectionMetric = (opt: ConnectionMetricOption) => {
    const conn = eligibleConnections.find(c =>
      opt.type === 'stripe'
        ? c.type === 'stripe' || c.type === 'stripe_manual'
        : c.type === opt.type,
    )
    if (!conn) {
      toast.error(
        `No ${opt.type} connection eligible for this project. Connect one in Connections first.`,
      )
      return
    }
    if (opt.needsEventPicker) {
      // PostHog needs a 2-step pick: connection (resolved here) +
      // event name (collected by the parent's picker dialog).
      // Defer to the parent — it owns the dialog state, and once
      // the user confirms an event the parent calls
      // `onPickConnection` with the fully-populated ref.
      onRequestPosthogEvent({ connectionId: conn.id })
      return
    }
    onPickConnection({
      connectionId: conn.id,
      connectionType: conn.type as ConnectionMetricRef['connectionType'],
      viewType: opt.viewType,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors cursor-pointer">
        <Image src={iconSrc} alt={iconAlt} width={14} height={14} className="shrink-0" />
        {/* Connection logo — only rendered when the active metric
            comes from a connection. Sits between the chart-type
            icon and the label so the pill reads as
            "[chart icon] [provider logo] [metric name]". For
            predefined picks (Visitors, Revenue, …) we don't have a
            provider to attribute the metric to, so the logo slot is
            simply omitted and the layout collapses cleanly. */}
        {connectionMetric && (
          <ConnectionIcon type={connectionMetric.connectionType} size={12} />
        )}
        <span>{triggerLabel}</span>
        <CaretDown size={9} weight="bold" className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {/* Predefined options — the existing top group. Selecting one
            clears any active connection-metric ref so the predefined
            value takes effect. */}
        {options.map(o => (
          <DropdownMenuItem
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className="gap-2 text-sm"
          >
            <span className="w-4 shrink-0">
              {!connectionMetric && o.value === value && (
                <Check size={12} weight="bold" />
              )}
            </span>
            <span>{o.label}</span>
          </DropdownMenuItem>
        ))}

        {/* Cascade — only renders when the user has at least one
            eligible connection. The separator + section header help
            the dropdown read as "predefined / per-connection" rather
            than a flat soup of options. */}
        {visibleGroups.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              From your connections
            </div>
            {visibleGroups.map(group => (
              <DropdownMenuSub key={group.type}>
                <DropdownMenuSubTrigger className="gap-2 text-sm">
                  <span className="w-4 shrink-0">
                    {/* Check mark on the GROUP when any of its
                        viewTypes matches the active connection ref —
                        so the user sees at a glance which provider
                        the current overlay is from without having to
                        expand the submenu. */}
                    {connectionMetric &&
                      group.options.some(o => o.viewType === connectionMetric.viewType) && (
                        <Check size={12} weight="bold" />
                      )}
                  </span>
                  {/* Provider logo — same icon shown in the trigger
                      pill when this provider's metric is selected.
                      Helps the dropdown scan visually (logo +
                      provider name) instead of the user having to
                      read each row's text to identify the source. */}
                  <ConnectionIcon type={group.type} size={14} />
                  <span>{group.label}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[160px]">
                  {group.options.map(opt => (
                    <DropdownMenuItem
                      key={opt.viewType}
                      onClick={() => handlePickConnectionMetric(opt)}
                      className="gap-2 text-sm"
                    >
                      <span className="w-4 shrink-0">
                        {/* Selection tick — only for options that
                            commit a metric directly on click.
                            `needsEventPicker` options (PostHog event
                            count) open a further picker step instead,
                            so they get a right-caret "drill in"
                            affordance on the RIGHT rather than a tick
                            here — mirroring the group submenu
                            triggers above. */}
                        {!opt.needsEventPicker &&
                          connectionMetric?.viewType === opt.viewType && (
                            <Check size={12} weight="bold" />
                          )}
                      </span>
                      <span>{opt.label}</span>
                      {opt.needsEventPicker && (
                        // "select" badge — signals that clicking
                        // opens a further picker step (the event
                        // chooser) rather than committing the metric
                        // immediately. Replaces the earlier
                        // "configure" wording / right-caret, both of
                        // which read as ambiguous.
                        <span className="ml-auto inline-flex items-center rounded-full border border-stroke px-1.5 py-[1px] text-[10px] font-medium text-grey-dark">
                          select
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ViewCardOverviewChartProps {
  view: View
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  /**
   * Currently-selected primary metric. Lifted into the caller (rather
   * than local state in this component) so the same value drives both
   * the dropdown UI *and* the data fetch — without that, the caller's
   * `useOverviewChartData()` and the component's dropdown can drift
   * (caller doesn't know which metric to refetch with).
   */
  primaryMetric: OverviewPrimaryMetric | null
  secondaryMetric: OverviewSecondaryMetric
  /**
   * When set, the corresponding dropdown displays this connection
   * metric's label and the chart's data layer treats it as the
   * source of truth (overriding the predefined `*Metric` above).
   * Optional — older view configs lack these fields and the chart
   * works fine with the predefined metrics alone.
   */
  primaryConnectionMetric?: ConnectionMetricRef | null
  secondaryConnectionMetric?: ConnectionMetricRef | null
  /**
   * Called when the user picks a new metric from either dropdown.
   * Caller is expected to update its own metric state + (real mode)
   * persist via `ALGORITHM.updateView`. Demo passes a state-only
   * setter, no persistence.
   */
  onMetricChange: (next: ProjectOverviewChartConfig) => void
  // Caller-supplied data — real mode threads `useOverviewChartData()`
  // through; demo mode passes static mock results.
  chart: OverviewChartResponse | null
  loading: boolean
  error: string | null
  /** Called when the user picks Refresh from the menu. */
  onRefresh: () => void
  /**
   * Optional opener for the project-conversions configuration dialog.
   * When provided, the menu's "Configure conversions" item fires
   * this callback. When omitted, the menu item is hidden — used by
   * the demo, which has no conversions dialog.
   */
  onOpenConversions?: () => void
  /**
   * Optional /hub/settings opener. When provided, the menu's
   * "Global settings" item fires this. When omitted, the item is
   * hidden — same demo escape hatch as `onOpenConversions`.
   */
  onOpenSettings?: () => void
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
  /**
   * When true, the wrapper renders without its own border + shadow
   * (mobile project body). The caller is responsible for placing
   * this tile inside something that already provides the chrome.
   */
  chromeless?: boolean
  /**
   * Compact size variant — shrinks the chart's internal height and
   * skips the `xl:` upsize so the tile fits inside narrow containers
   * (e.g. the landing-page demo card, where horizontal space is shared
   * with the sources/users panel on the right). Default `false` keeps
   * the real dashboard's existing dimensions unchanged. IGNORED when
   * `fillHeight` is true (the parent's height is the source of truth).
   *
   * Padding + bar widths are NOT changed by this prop — recharts'
   * `ResponsiveContainer` handles bar spacing automatically as the
   * chart shrinks, so a smaller height naturally produces smaller
   * bars without us touching `OverviewChart`'s configuration.
   */
  compact?: boolean
  /**
   * Fill the parent container's full height instead of using a fixed
   * inner chart height. Used by callers that place the chart in a
   * grid cell with explicit height (the project view's unified
   * grid) — without this, the chart's fixed `h-[340px]` plus header
   * plus padding pushes the rendered card to ~480 px regardless of
   * the cell size, overflowing smaller cells and overlapping
   * neighboring tiles.
   *
   * Implementation: when `true`, the chart container becomes
   * `flex-1 min-h-0` so it adapts to whatever vertical space the
   * parent gives it. The previous `min-h-[240px]` floor was
   * removed — it caused overflow in smaller cells
   * (`row-span-2` = 304 px after header + padding) and recharts'
   * `ResponsiveContainer` already prevents the SVG from collapsing
   * to 0. When `false` (default), the chart keeps its previous
   * fixed-height behavior for non-grid contexts (mobile project
   * body, demo, etc.).
   */
  fillHeight?: boolean
  /**
   * Cross-component highlight: when set, every stacked bar segment
   * matching this source key stays lit and everything else dims.
   * Driven by the sources panel sitting next to this chart in the
   * project_overview composite — the panel's row hover writes to
   * shared state, this prop reads from it. Passed straight through
   * to `<OverviewChart>`.
   */
  externalHoveredSourceKey?: string | null
  /**
   * Wrap the tile in the standard view chrome (border + drop
   * shadow). Used by the standalone "Chart" view-type
   * (`custom_chart`) so it visually matches every other regular
   * tile in the grid (Pageviews, Users, Funnel, …).
   *
   * The `project_overview` composite intentionally leaves this
   * `false` — its chart half is paired with a sources panel in a
   * single bespoke layout that owns its own borders, and adding
   * the wrapper around just the chart half would break the visual
   * continuity of the composite block.
   */
  withChrome?: boolean
  /**
   * Composite mode — the sources panel to render beside the chart. When
   * supplied (the unified project_overview block), the chart body and
   * this slot share one grid UNDER the single header above, so the two
   * halves read as one view with one header + one menu. When omitted
   * (standalone `custom_chart`, lone overview), the grid wrappers
   * collapse to `display:contents` and the chart body fills the card
   * exactly as before.
   */
  sourcesSlot?: ReactNode
  /**
   * Demo escape hatch — forwarded to the metric dropdowns' connection
   * cascade. The landing-page demo has no `DashboardProvider`, so the
   * cascade is otherwise empty; passing the demo's connections here is
   * what surfaces "PostHog → Event count" (and any other connection
   * metric) in the demo chart. Real callers omit it.
   */
  connectionsOverride?: { id: string; type: string; projectId: string | null }[] | null
  /**
   * Demo escape hatch — event list for the PostHog event picker dialog.
   * When set, the picker lists these instead of fetching from the
   * backend (unreachable in the demo). Real callers omit it.
   */
  posthogEventsOverride?: PosthogEventDefinition[]
}

export function ViewCardOverviewChart({
  view,
  dateFrom,
  dateTo,
  mode,
  primaryMetric,
  secondaryMetric,
  primaryConnectionMetric = null,
  secondaryConnectionMetric = null,
  onMetricChange,
  chart,
  loading,
  error,
  onRefresh,
  onOpenConversions,
  onOpenSettings,
  projectName,
  onUntrack,
  onPin,
  chromeless = false,
  compact = false,
  fillHeight = false,
  externalHoveredSourceKey = null,
  withChrome = false,
  sourcesSlot,
  connectionsOverride,
  posthogEventsOverride,
}: ViewCardOverviewChartProps) {
  // `nowTick` bumps once per minute so the "now" reference line advances to
  // the next bucket when the wall clock crosses an hour/day boundary without
  // requiring a refetch. Purely visual — this is the only state the
  // component owns; data + selected metrics live above.
  const [nowTick, setNowTick] = useState(0)
  // Bar/line swap state. When true:
  //   - bars plot the SECONDARY metric (single non-stacked bar, brand orange)
  //   - the line + gradient plot the PRIMARY total
  //   - the dropdown icons swap (bar ↔ line) so the pills still match the
  //     visual encoding their metric currently has
  // The dropdown SELECTIONS (which primary metric, which secondary metric)
  // are unchanged — only their visual roles swap.
  const [swapped, setSwapped] = useState(false)
  // Opens the in-place picker for the "no analytics tool connected
  // yet" empty state below. Replaces the old `<Link to /hub/connections>`
  // navigation which dropped the user on a different page with no
  // context (and would auto-open a stale property picker if the URL
  // still had OAuth-callback params lingering).
  const [trafficPickerOpen, setTrafficPickerOpen] = useState(false)

  // PostHog event-picker dialog state. `axis` remembers which
  // dropdown asked for the event so we can commit the resulting ref
  // to the right side on confirm. `connectionId` is the resolved
  // PostHog connection (the cascade already picked it before
  // opening the picker), threaded so the dialog knows which project
  // to list events from. Null when the dialog is closed.
  const [posthogPicker, setPosthogPicker] = useState<
    | {
        axis: 'primary' | 'secondary'
        connectionId: string
        initialEventName: string | null
      }
    | null
  >(null)

  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const nowLabel = useMemo(
    () => bucketLabelForNow(mode, dateFrom, dateTo),
    // nowTick participates in the dependency array so we recompute every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, dateFrom, dateTo, nowTick],
  )

  // Predefined pick → clear the connection-metric override on the
  // same axis so the predefined value takes effect. Without this,
  // a user who picks "Stripe → Gross Volume" and then re-picks
  // "Revenue" from the top group would still see the Stripe
  // override winning.
  const onPrimaryChange = (next: OverviewPrimaryMetric | null) =>
    onMetricChange({
      primaryMetric: next,
      secondaryMetric,
      primaryConnectionMetric: undefined,
      secondaryConnectionMetric: secondaryConnectionMetric ?? undefined,
    })
  const onSecondaryChange = (next: OverviewSecondaryMetric) =>
    onMetricChange({
      primaryMetric,
      secondaryMetric: next,
      primaryConnectionMetric: primaryConnectionMetric ?? undefined,
      secondaryConnectionMetric: undefined,
    })
  // Cascade pick → set the connection ref. The predefined value
  // stays in storage (we keep it around so unsetting the connection
  // override falls back to it), it's just inert while a connection
  // override is set.
  const onPrimaryPickConnection = (ref: ConnectionMetricRef) =>
    onMetricChange({
      primaryMetric,
      secondaryMetric,
      primaryConnectionMetric: ref,
      secondaryConnectionMetric: secondaryConnectionMetric ?? undefined,
    })
  const onSecondaryPickConnection = (ref: ConnectionMetricRef) =>
    onMetricChange({
      primaryMetric,
      secondaryMetric,
      primaryConnectionMetric: primaryConnectionMetric ?? undefined,
      secondaryConnectionMetric: ref,
    })

  const primaryUnavailable = chart?.primaryUnavailable ?? false
  const secondaryUnavailable = chart?.secondaryUnavailable ?? false
  const totalPrimary = chart?.totalPrimary ?? 0

  // Connection-metric display overrides — drive the chart's labels +
  // axis/tooltip formatters when the user has picked a Stripe / GA /
  // PostHog metric for either axis. `null` when the predefined path
  // is active; `<OverviewChart>` falls back to its built-in
  // `primaryMetric` / `secondaryMetric` formatters in that case.
  const primaryDisplay = connectionDisplay(primaryConnectionMetric)
  const secondaryDisplay = connectionDisplay(secondaryConnectionMetric)
  // Format the header "Total: N" using the same rules as the
  // tooltip — dollars when the active metric is currency-typed,
  // count otherwise. Without this the header would print "Total: 20"
  // for a $20 Gross Volume total, which reads as a count.
  const formattedTotalPrimary = primaryDisplay
    ? (primaryDisplay.isCurrency
      ? `$${totalPrimary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : totalPrimary.toLocaleString())
    : primaryMetric === 'revenue'
      ? `$${totalPrimary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : totalPrimary.toLocaleString()

  return (
    <>
    <ViewWrapper variant={withChrome ? 'default' : 'borderless'}>
      {/* Metric selectors row — replaces the standard header for this composite view.
          When a projectName is passed (pinned views on Home), a small project pill
          sits after the metric dropdowns so the user can see which project the
          card came from. On a project page the pill is omitted (the project
          context is already obvious from the route).

          Note: the wrapper above always renders `borderless` regardless of
          `chromeless` — this composite tile has its own bespoke layout that
          doesn't use the standard view-card border + shadow chrome. The prop
          is accepted for API uniformity with the rest of the tile components. */}
      <div className="px-4 pt-3.5 pb-3 flex items-center gap-2 flex-wrap shrink-0">
        {/* Drag grip — only renders when this tile is inside a
            `<SortableTile>`. The composite project_overview pair
            renders OUTSIDE `<SortableContext>` (it's the immovable
            top anchor) so the grip is a no-op for that case;
            `custom_chart` IS sortable, so the grip appears and
            becomes its drag handle. */}
        <DragGrip />
        <MetricDropdown
          iconSrc={swapped ? '/icons/line_chart.svg' : '/icons/bar_chart.svg'}
          iconAlt={swapped ? 'Line chart' : 'Bar chart'}
          value={primaryMetric}
          options={PRIMARY_OPTIONS}
          onChange={onPrimaryChange}
          connectionMetric={primaryConnectionMetric}
          onPickConnection={onPrimaryPickConnection}
          onRequestPosthogEvent={({ connectionId }) =>
            setPosthogPicker({
              axis: 'primary',
              connectionId,
              initialEventName:
                primaryConnectionMetric?.connectionType === 'posthog'
                  ? primaryConnectionMetric.eventName ?? null
                  : null,
            })
          }
          projectId={view.projectId}
          connectionsOverride={connectionsOverride}
        />
        {/* Swap button — toggles the bar/line visual encoding. After click,
            the bars plot the secondary metric and the line plots the primary
            total (and vice versa). The dropdown icons flip to match. */}
        <button
          type="button"
          onClick={() => setSwapped(s => !s)}
          aria-label="Swap bar and line charts"
          className="flex items-center justify-center w-6 h-6 rounded text-grey-light hover:text-grey-dark hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors cursor-pointer"
        >
          <ArrowsLeftRight size={13} weight="bold" />
        </button>
        <MetricDropdown
          iconSrc={swapped ? '/icons/bar_chart.svg' : '/icons/line_chart.svg'}
          iconAlt={swapped ? 'Bar chart' : 'Line chart'}
          value={secondaryMetric}
          options={SECONDARY_OPTIONS}
          onChange={onSecondaryChange}
          connectionMetric={secondaryConnectionMetric}
          onPickConnection={onSecondaryPickConnection}
          onRequestPosthogEvent={({ connectionId }) =>
            setPosthogPicker({
              axis: 'secondary',
              connectionId,
              initialEventName:
                secondaryConnectionMetric?.connectionType === 'posthog'
                  ? secondaryConnectionMetric.eventName ?? null
                  : null,
            })
          }
          projectId={view.projectId}
          connectionsOverride={connectionsOverride}
        />
        {projectName && (
          <span className="flex items-center gap-1 text-[10px] border border-stroke rounded-full px-2 py-0.5 text-grey-light leading-tight shrink-0">
            <Cube size={9} weight="bold" />
            {projectName}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {!loading && !error && (
            <span className="text-xs text-grey-light tabular-nums">
              Total:{' '}
              <span className="text-grey-darkest font-semibold">
                {formattedTotalPrimary}
              </span>
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-grey-light hover:text-grey-dark hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors -mr-1">
              <DotsThreeVertical size={18} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onOpenConversions && (
                <DropdownMenuItem
                  onClick={onOpenConversions}
                  className="text-sm gap-2"
                >
                  <Target size={13} weight="bold" />
                  Configure conversions
                </DropdownMenuItem>
              )}
              {onOpenSettings && (
                <DropdownMenuItem
                  onClick={onOpenSettings}
                  className="text-sm gap-2"
                >
                  <Gear size={13} weight="bold" />
                  Global settings
                </DropdownMenuItem>
              )}
              {onPin && (
                <DropdownMenuItem
                  onClick={() => onPin(view.id)}
                  className="text-sm gap-2"
                >
                  {view.isPinned ? (
                    <><PushPinSlash size={13} weight="bold" />Unpin</>
                  ) : (
                    <><PushPin size={13} weight="bold" />Pin</>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onRefresh}
                disabled={loading}
                className="text-sm gap-2"
              >
                <ArrowsClockwise
                  size={13}
                  weight="bold"
                  className={loading ? 'animate-spin' : ''}
                />
                Refresh
              </DropdownMenuItem>
              {onUntrack && (
                <DropdownMenuItem
                  onClick={() => onUntrack(view.id)}
                  className="text-sm text-destructive focus:text-destructive"
                >
                  Untrack
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chart.
          Heights:
            - fillHeight=true → `flex-1 min-h-[240px]` — the outer
                                p-4 wrapper grows in the parent
                                flex-col, and the inner chart
                                container fills it (`h-full`). Used
                                in the project view's unified grid
                                where the cell height comes from
                                `row-span-N` so the chart adapts
                                cleanly to whichever footprint the
                                view sizing helper picked.
            - default        → `h-[280px] xl:h-[340px]` — fixed
                                heights for non-grid contexts
                                (mobile project body, demo).
            - compact=true   → `h-[200px]` flat, no xl upsize — for
                                narrow containers where the chart
                                shares horizontal room with a
                                sources/users panel on the right.
          Recharts' `ResponsiveContainer` handles bar widths as the
          height shrinks, so we don't need to touch `OverviewChart`'s
          internal `maxBarSize` / segment sizing. */}
      {/* `pr-4 pt-4` — NO left or bottom padding. The Y-axis gutter
          (its `width={36}`) IS the left inset, so adding `pl-4` on top
          pushed the plot ~52 px in and the chart read as more padded
          than the other view bodies (16 px). Dropping the left padding
          lets the axis labels sit at the card edge, lining the plot up
          with everything else. The X-axis labels are the natural
          bottom edge, so no `pb` either. */}
      {/* Composite layout: when a `sourcesSlot` is supplied (the unified
          project_overview block) the chart body + sources panel share
          this grid, sitting UNDER the single header above. The
          `contents`-class wrappers vanish from layout when there's no
          slot, so the standalone chart renders exactly as before. The
          @xl container-query split is driven by the composite's own
          `@container` ancestor (`OverviewComposite`). */}
      <div className={sourcesSlot ? 'grid grid-cols-1 @xl:grid-cols-[1fr_minmax(240px,320px)] gap-4 @xl:min-h-[420px]' : 'contents'}>
      <div className={sourcesSlot ? 'h-[320px] @xl:h-auto flex flex-col min-h-0' : 'contents'}>
      <div
        data-no-dnd="true"
        className={
          fillHeight
            ? 'relative pr-4 pt-4 flex-1 min-h-0 flex flex-col'
            : 'relative pr-4 pt-4'
        }
      >
        {/* fillHeight: `flex-1 min-h-0` — the chart adapts to
            WHATEVER vertical space the parent gives it. The
            previous `min-h-[240px]` forced 240 px minimum, which
            overflowed the card whenever the parent cell was
            shorter than 240 + selector-row + padding (~360 px).
            That happened in two places:
              - standalone `custom_chart` (row-span-2 = 304 px) → bars and X-axis labels rendered BELOW the card edge.
              - any future smaller composite layouts.
            Recharts' `ResponsiveContainer` already has its own
            `minHeight={1} minWidth={1}` guards (see `OverviewChart`)
            so the chart never collapses to 0; we don't need a CSS
            floor on top of that, and the floor was actively
            harmful when the available space was smaller than its
            value. */}
        <div
          className={
            fillHeight
              ? 'relative flex-1 min-h-0'
              : compact
                ? 'relative h-[200px]'
                : 'relative h-[280px] xl:h-[340px]'
          }
        >
          {loading ? (
            <SkeletonBlock className="absolute inset-0" />
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
              <Warning size={18} weight="bold" className="text-amber-500" />
              <p className="text-xs text-grey-light">{error}</p>
            </div>
          ) : primaryUnavailable ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
              <p className="text-sm text-grey-dark">No analytics tool connected yet.</p>
              <p className="text-xs text-grey-light max-w-[320px]">
                Connect Google Analytics or PostHog to see traffic for this project.
              </p>
              <button
                type="button"
                onClick={() => setTrafficPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors mt-1 cursor-pointer"
              >
                <Plugs size={12} weight="bold" />
                Connect analytics
              </button>
            </div>
          ) : chart ? (
            <>
              {/*
                Horizontal-scroll wrapper for mobile. A 7-day daily chart
                squishes to ~40 px per bar on a 350-px-wide phone, which
                is unreadable. We give the chart `min-w-[560px]` (≈80 px
                per bar) and let the parent scroll it horizontally; the
                negative + positive horizontal padding bleeds the
                scroll container to the card's edges so the right-edge
                clip reads as a "scroll for more →" cue.

                Desktop (`md:`) reverts to the existing behaviour
                — `overflow-visible`, no min-width, no negative
                padding — so the responsive container fills the card
                cleanly with no stray scrollbar.
              */}
              <div className="absolute inset-0 overflow-x-auto md:overflow-x-visible -mr-4 md:mr-0 pr-4 md:pr-0">
                <div className="h-full min-w-[560px] md:min-w-0">
                  {/* The `?? 'visitors'` fallback is for the type
                      system only — a null primary always lands in
                      the `primaryUnavailable` empty state above, so
                      this branch never renders with null. */}
                  <OverviewChart
                    data={chart}
                    primaryMetric={primaryMetric ?? 'visitors'}
                    secondaryMetric={secondaryMetric}
                    nowLabel={nowLabel}
                    swapped={swapped}
                    externalHoveredSourceKey={externalHoveredSourceKey}
                    primaryDisplay={primaryDisplay}
                    secondaryDisplay={secondaryDisplay}
                  />
                </div>
              </div>
              {secondaryUnavailable && secondaryMetric && (
                <p className="absolute left-2 bottom-0 text-[11px] text-grey-light">
                  {secondaryMetric === 'bounce_rate' ||
                  secondaryMetric === 'avg_session_sec'
                    ? `${
                        secondaryMetric === 'bounce_rate' ? 'Bounce rate' : 'Avg. session'
                      } requires Google Analytics.`
                    : secondaryMetric === 'conversion_rate'
                      ? 'Configure conversions from the menu to see the rate line.'
                      : 'This overlay is unavailable for the current setup.'}
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
      </div>
      {/* Sources panel — the right grid cell in composite mode; null for
          the standalone chart (the grid wrappers above are then
          `display:contents`, so the body fills the card as before). */}
      {sourcesSlot}
      </div>
    </ViewWrapper>

    {/* Traffic-source picker — only mounted while open. The picker
        calls `useDashboard()`, which throws when no `DashboardProvider`
        is in the tree (the landing-page demo never wraps one). The
        demo never shows the empty-state CTA either, so gating mount on
        `trafficPickerOpen` means the demo never instantiates the
        picker at all. In the real dashboard the BottomDialog's
        open/close transition still plays — it just mounts on first
        open instead of staying mounted from the start.
        `onLinked` triggers a chart refresh so the user sees the newly-
        linked GA/PostHog data without a manual reload. */}
    {trafficPickerOpen && (
      <TrafficConnectionPicker
        projectId={view.projectId}
        open={trafficPickerOpen}
        onOpenChange={setTrafficPickerOpen}
        onLinked={onRefresh}
      />
    )}

    {/* PostHog event picker — only mounted while open (same
        rationale as the traffic picker above). Confirming an event
        commits the fully-populated `ConnectionMetricRef` to the
        right axis via the chart's existing pick-connection
        callbacks. The dialog itself doesn't know about axis —
        we capture that in component state when opening. */}
    {posthogPicker && (
      <PosthogEventPickerDialog
        open
        onOpenChange={open => {
          if (!open) setPosthogPicker(null)
        }}
        connectionId={posthogPicker.connectionId}
        initialEventName={posthogPicker.initialEventName}
        eventsOverride={posthogEventsOverride}
        onConfirm={eventName => {
          const ref: ConnectionMetricRef = {
            connectionId: posthogPicker.connectionId,
            connectionType: 'posthog',
            viewType: 'daily_counter',
            eventName,
          }
          if (posthogPicker.axis === 'primary') {
            onPrimaryPickConnection(ref)
          } else {
            onSecondaryPickConnection(ref)
          }
          setPosthogPicker(null)
        }}
      />
    )}
    </>
  )
}
