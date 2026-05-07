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

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowsClockwise,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ViewWrapper } from './ViewWrapper'
import { OverviewChart } from './OverviewChart'
import type { OverviewChartResponse } from '@/lib/api'
import { bucketLabelForNow } from '@/utils/overviewBucketLabel'
import type {
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
  ProjectOverviewChartConfig,
  View,
} from '@/types/view'

const PRIMARY_OPTIONS: { value: OverviewPrimaryMetric; label: string }[] = [
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

function readConfig(view: View): ProjectOverviewChartConfig {
  const cfg = view.config as Partial<ProjectOverviewChartConfig>
  return {
    primaryMetric: cfg.primaryMetric ?? 'visitors',
    secondaryMetric: cfg.secondaryMetric ?? null,
  }
}

function MetricDropdown<T extends string | null>({
  label,
  value,
  options,
  onChange,
  colorDot,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
  colorDot?: string
}) {
  const current = options.find(o => o.value === value) ?? options[0]
  return (
    <div className="flex items-center gap-2">
      <p className="text-[11px] uppercase tracking-wider text-grey-light font-medium">{label}</p>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors cursor-pointer">
          {colorDot && (
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: colorDot }}
            />
          )}
          <span>{current.label}</span>
          <CaretDown size={9} weight="bold" className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          {options.map(o => (
            <DropdownMenuItem
              key={String(o.value)}
              onClick={() => onChange(o.value)}
              className="gap-2 text-sm"
            >
              <span className="w-4 shrink-0">
                {o.value === value && <Check size={12} weight="bold" />}
              </span>
              <span>{o.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
  primaryMetric: OverviewPrimaryMetric
  secondaryMetric: OverviewSecondaryMetric
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
}

export function ViewCardOverviewChart({
  view,
  dateFrom,
  dateTo,
  mode,
  primaryMetric,
  secondaryMetric,
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
}: ViewCardOverviewChartProps) {
  // `nowTick` bumps once per minute so the "now" reference line advances to
  // the next bucket when the wall clock crosses an hour/day boundary without
  // requiring a refetch. Purely visual — this is the only state the
  // component owns; data + selected metrics live above.
  const [nowTick, setNowTick] = useState(0)

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

  const onPrimaryChange = (next: OverviewPrimaryMetric) =>
    onMetricChange({ primaryMetric: next, secondaryMetric })
  const onSecondaryChange = (next: OverviewSecondaryMetric) =>
    onMetricChange({ primaryMetric, secondaryMetric: next })

  const primaryUnavailable = chart?.primaryUnavailable ?? false
  const secondaryUnavailable = chart?.secondaryUnavailable ?? false
  const totalPrimary = chart?.totalPrimary ?? 0

  return (
    <ViewWrapper variant={chromeless ? 'borderless' : 'borderless'}>
      {/* Metric selectors row — replaces the standard header for this composite view.
          When a projectName is passed (pinned views on Home), a small project pill
          sits after the metric dropdowns so the user can see which project the
          card came from. On a project page the pill is omitted (the project
          context is already obvious from the route).

          Note: the wrapper above always renders `borderless` regardless of
          `chromeless` — this composite tile has its own bespoke layout that
          doesn't use the standard view-card border + shadow chrome. The prop
          is accepted for API uniformity with the rest of the tile components. */}
      <div className="px-4 pt-3.5 pb-3 flex items-center gap-4 flex-wrap shrink-0">
        <MetricDropdown
          label="Primary"
          value={primaryMetric}
          options={PRIMARY_OPTIONS}
          onChange={onPrimaryChange}
        />
        <MetricDropdown
          label="Overlay"
          value={secondaryMetric}
          options={SECONDARY_OPTIONS}
          onChange={onSecondaryChange}
          colorDot={secondaryMetric ? '#F46719' : undefined}
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
                {totalPrimary.toLocaleString()}
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

      {/* Chart */}
      <div className="relative p-4">
        <div className="relative h-[280px] xl:h-[340px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <ArrowsClockwise
                size={20}
                weight="bold"
                className="text-muted-foreground animate-spin"
              />
            </div>
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
              <Link
                href="/hub/connections"
                className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors mt-1"
              >
                <Plugs size={12} weight="bold" />
                Connect analytics
              </Link>
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
              <div className="absolute inset-0 overflow-x-auto md:overflow-x-visible -mx-4 md:mx-0 px-4 md:px-0">
                <div className="h-full min-w-[560px] md:min-w-0">
                  <OverviewChart
                    data={chart}
                    primaryMetric={primaryMetric}
                    secondaryMetric={secondaryMetric}
                    nowLabel={nowLabel}
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
    </ViewWrapper>
  )
}
