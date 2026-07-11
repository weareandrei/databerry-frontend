'use client'

/**
 * Single source of truth for the interactable demo on the landing
 * page. Keeps all demo state — projects, folders, views, pinned set,
 * connections, the current page, the global date pill, the chat log,
 * and the "demo doesn't support X" notice — in one provider so demo
 * components prop-drill from here rather than reaching for the real
 * `useDashboard()` / Redux.
 *
 * Why one big provider (not three smaller hooks like before)?
 *   - Cross-cutting mutations need it. Deleting a project must
 *     cascade to its folders + views + pin set; renaming a folder
 *     should keep child folders consistent. With three independent
 *     hooks, those side-effects had nowhere clean to live.
 *   - The demo lives inside *one* `<DemoProvider>` mount on the
 *     landing page. There's no "lazy load" or split-screen scenario
 *     where one slice of demo state would benefit from being
 *     separate. So one provider keeps things simple.
 *
 * Real components must NOT import from this file — the boundary is
 * one-way: demo can import shared tile primitives, but real-mode
 * code (`hub/...`) is provider-free.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  INITIAL_CONNECTIONS,
  INITIAL_FOLDERS,
  INITIAL_PROJECTS,
  type DemoConnection,
  type DemoFolder,
  type DemoProject,
} from '../demoMocks'
import { INITIAL_VIEWS, type DemoView } from './demoSeedViews'
import {
  chartPoints,
  chooseGranularity,
  groupRowsByGranularity,
  lastColumn,
  loadDemoTimeSeries,
  rowsInRange,
  sumColumn,
  type DemoTimeSeriesRow,
} from './demoTimeSeries'
import { shiftPeriod } from '@/utils/dateHelpers'
import { SOURCE_STYLE } from '@/constants/trafficSources'
import type { OverviewChartResponse, PosthogEventDefinition } from '@/lib/api'
import type {
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
} from '@/types/view'

// ─── Types re-exported for callers ────────────────────────────────────────

export type {
  DemoProject,
  DemoFolder,
  DemoConnection,
  DemoView,
}

// Distributive `Omit` for discriminated unions — applies `Omit<…, K>`
// to each constituent of the union before re-uniting. Without this,
// `Omit<DemoView, 'id'>` collapses to a single non-discriminated type
// that drops every kind-specific field (`mockValue`, `chartPoints`,
// `steps`, etc.) because they're not common to every variant.
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

/**
 * Demo surfaces, mirroring the redesigned dashboard's nav:
 *   - `home`        → the global home (pinned row + projects)
 *   - `overview`    → a project's overview (the demo's START surface)
 *   - `agent`       → a project's Ask-agent chat
 *   - `connections` → connections list (global when `currentProjectId`
 *                     is null, the project's when it's set)
 *   - `overview` / `agent` (and project-scoped `connections`)
 *     use the unified demo sidebar + page headers.
 */
export type DemoPage = 'home' | 'overview' | 'agent' | 'connections'

export interface DemoChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type DateMode = 'daily' | 'weekly' | 'monthly'

export interface DemoGlobalDate {
  mode: DateMode
  /** ISO yyyy-mm-dd. */
  from: string
  /** ISO yyyy-mm-dd. */
  to: string
}

// ─── Initial mock global date — last 7 days ending "today" ───────────────

const TODAY_ISO = '2026-04-08'
const WEEK_AGO_ISO = '2026-04-02'

const INITIAL_DATE: DemoGlobalDate = {
  mode: 'daily',
  from: WEEK_AGO_ISO,
  to: TODAY_ISO,
}

// ─── Time-series → view derivation ───────────────────────────────────────
//
// Once the demo CSV is loaded, every view that backs onto a numeric
// metric gets its `mockValue` / `chartTotal` / `chartPoints` recomputed
// from the rows inside the user's selected date range. This is what
// makes the date pill in `DemoTopBar` actually do something — flipping
// from "last 7 days" to "last 30 days" walks every tile to a fresh
// number that's been summed (or last-valued, for instantaneous metrics
// like MRR) over the new range.
//
// Views NOT in the switch keep their seed data verbatim — meetings /
// top-customers / funnel / users are list-shaped and date-range
// filtering for them isn't useful at the demo's scale (the hand-
// crafted 3-row meeting list, 10-row top-customer list, etc. would
// either render the same or empty out depending on the range, neither
// being illustrative).

function deriveView(
  v: DemoView,
  range: DemoGlobalDate,
  rows: DemoTimeSeriesRow[],
): DemoView {
  // No CSV loaded yet — leave the seed values in place so the demo
  // shows reasonable static numbers during the initial fetch instead
  // of an all-zero state.
  if (rows.length === 0) return v
  // `mode` is no longer read here — `chartPoints` auto-picks bucket
  // size from the range (see `chooseGranularity`). The pill's mode
  // value remains a cosmetic label for the date selector itself.
  const { from, to } = range

  // Discriminated-union ergonomics — same trick the mutation
  // callbacks below (`renameView`, `togglePin`) use. Spreading a
  // `DemoView` widens TS's inferred shape past the discriminator,
  // so to add `mockValue`/`chartTotal`/etc. we coerce through
  // `unknown` after the spread.
  const cast = <T,>(o: T): DemoView => o as unknown as DemoView

  switch (v.id) {
    // ── Acme value tiles ─────────────────────────────────────────────
    case 'view-acme-mrr':
      // MRR is instantaneous — show the latest value within the range,
      // not the sum (summing monthly recurring revenue across days
      // would be nonsensical).
      return cast({ ...v, mockValue: String(lastColumn(rows, from, to, 'acme_mrr_cents')) })
    case 'view-acme-signups':
      return cast({ ...v, mockValue: String(sumColumn(rows, from, to, 'acme_signups')) })
    case 'view-acme-payments':
      return cast({ ...v, mockValue: String(sumColumn(rows, from, to, 'acme_payments')) })
    case 'view-acme-ga-active':
      // GA realtime metric — instantaneous, take the latest. The "ga
      // active right now" reading is a snapshot, never additive.
      return cast({
        ...v,
        mockValue: String(lastColumn(rows, from, to, 'acme_ga_active_now')),
      })
    case 'view-acme-ga-sessions':
      return cast({ ...v, mockValue: String(sumColumn(rows, from, to, 'acme_ga_sessions')) })
    // ── Acme chart tile ──────────────────────────────────────────────
    case 'view-acme-gross': {
      if (v.kind !== 'chart') return v
      const total = sumColumn(rows, from, to, 'acme_gross_cents')
      // `chartPoints` auto-buckets daily / weekly / monthly based on
      // the range size — see `chooseGranularity` in demoTimeSeries.ts.
      // A 30-day range gets ~5 weekly bars instead of 30 daily bars,
      // which keeps the chart readable on the demo card's narrow frame.
      const points = chartPoints(rows, from, to, 'acme_gross_cents')
      return cast({ ...v, mockValue: String(total), chartTotal: total, chartPoints: points })
    }
    // ── Side value tiles ─────────────────────────────────────────────
    case 'view-side-pageviews':
      return cast({ ...v, mockValue: String(sumColumn(rows, from, to, 'side_pageviews')) })
    case 'view-side-gross':
      return cast({ ...v, mockValue: String(sumColumn(rows, from, to, 'side_gross_cents')) })
    case 'view-side-dashboard-events':
      return cast({
        ...v,
        mockValue: String(sumColumn(rows, from, to, 'side_dashboard_events')),
      })
    case 'view-side-ga-users':
      return cast({ ...v, mockValue: String(sumColumn(rows, from, to, 'side_ga_users')) })
    default:
      return v
  }
}

// Per-source colours — pulled from `trafficSources.ts`'s `SOURCE_STYLE`
// table at module load so we don't duplicate brand colours. Every key
// here is also a real production source key, so the demo's chart
// renders with the same colour the real dashboard would use for the
// same source. `SOURCE_STYLE` lookups can theoretically be undefined
// for an unknown key; the fallback `''` would render an empty colour
// (recharts then defaults to its own palette), but in practice every
// key below is in `SOURCE_STYLE` — the `??` is belt-and-braces.
const SOURCE_COLOR = (key: string): string =>
  SOURCE_STYLE[key]?.color ?? ''

/**
 * Build an `OverviewChartResponse` for a project from the CSV rows
 * inside the selected range. Granularity is auto-picked by
 * `groupRowsByGranularity` so a 30-day range collapses to ~5 weekly
 * buckets instead of 30 cramped daily ones — readable at any range
 * size without the user having to tweak a "bucket size" knob.
 *
 * Within each bucket, source breakdowns sum across the bucket's
 * rows (e.g. weekly bucket = 7 days of organic visitors summed).
 * The secondary metric (`acme_conversion_pct`) averages across the
 * bucket, since it's a rate not a count.
 *
 * Wire shape stays identical to what the real backend produces, so
 * `<ViewCardOverviewChart>` consumes this verbatim.
 */
/**
 * Per-day source values for a given project. Always returned in the
 * project's canonical source order so callers can iterate without
 * worrying about Side vs Acme having different sets.
 */
interface DaySources {
  total: number
  sources: { key: string; label: string; value: number }[]
}

function visitorsForDay(r: DemoTimeSeriesRow, projectId: string): DaySources {
  if (projectId === 'proj-acme') {
    const organic     = r.acme_visitors_organic
    const direct      = r.acme_visitors_direct
    const reddit      = r.acme_visitors_reddit
    const x           = r.acme_visitors_x
    const producthunt = r.acme_visitors_producthunt
    return {
      total: organic + direct + reddit + x + producthunt,
      sources: [
        { key: 'organic',     label: 'Organic',     value: organic },
        { key: 'direct',      label: 'Direct',      value: direct },
        { key: 'reddit',      label: 'Reddit',      value: reddit },
        { key: 'x',           label: 'x.com',       value: x },
        { key: 'producthunt', label: 'ProductHunt', value: producthunt },
      ],
    }
  }
  // proj-side
  const organic = r.side_visitors_organic
  const direct  = r.side_visitors_direct
  const reddit  = r.side_visitors_reddit
  return {
    total: organic + direct + reddit,
    sources: [
      { key: 'organic', label: 'Organic', value: organic },
      { key: 'direct',  label: 'Direct',  value: direct },
      { key: 'reddit',  label: 'Reddit',  value: reddit },
    ],
  }
}

/**
 * Per-day primary metric value. The CSV only carries per-source data
 * for `visitors`; the other three primaries (pageviews / conversions /
 * revenue) get a single per-day total that the chart distributes
 * across sources proportionally to the visitor split.
 *
 * Why distribute proportionally instead of leaving the bar
 * un-stacked: keeping the same visual stack shape across primary
 * choices means the chart re-skins on metric change instead of
 * fundamentally changing layout, which is a much smoother UX.
 * Source attribution for revenue / conversions in production
 * comes from the backend (which has the real per-source data);
 * the demo doesn't, so a proportional fake is the honest workaround.
 */
function primaryTotalForDay(
  r: DemoTimeSeriesRow,
  projectId: string,
  metric: OverviewPrimaryMetric,
): number {
  const isAcme = projectId === 'proj-acme'
  switch (metric) {
    case 'visitors':
      return visitorsForDay(r, projectId).total
    case 'pageviews':
      // Synthetic — visitor count × ~1.7 pages-per-session. The
      // multiplier is just plausible-shape SaaS behaviour, not a
      // hard claim. Side has a literal `side_pageviews` column we
      // prefer when available.
      if (!isAcme) return r.side_pageviews
      return Math.round(visitorsForDay(r, projectId).total * 1.7)
    case 'conversions':
      // Acme has `payment_completed` events; Side reuses dashboard
      // events as a proxy (the demo's Side project has no real
      // conversion column — the picker's "Conversions" choice still
      // needs to land on *something*).
      return isAcme ? r.acme_payments : r.side_dashboard_events
    case 'revenue':
      return isAcme ? r.acme_gross_cents : r.side_gross_cents
  }
}

/**
 * Per-day secondary metric value (the overlay line on top of the
 * stacked bars). Returns `null` for an unsupported (metric, project)
 * combo so `<ViewCardOverviewChart>` hides the line cleanly.
 */
function secondaryValueForDay(
  r: DemoTimeSeriesRow,
  projectId: string,
  metric: OverviewSecondaryMetric,
): number | null {
  if (metric === null) return null
  const isAcme = projectId === 'proj-acme'
  switch (metric) {
    case 'conversion_rate':
      // Acme has it directly; Side gets a synthetic value derived
      // from events ÷ visitors so the line tracks something
      // plausible (and doesn't sit at a flat 0).
      if (isAcme) return r.acme_conversion_pct
      {
        const visitors = visitorsForDay(r, projectId).total
        if (visitors === 0) return 0
        const rate = (r.side_dashboard_events / visitors) * 100
        return Math.round(rate * 10) / 10
      }
    case 'bounce_rate':
      // Synthetic — bounce roughly anti-correlates with conversion,
      // so we use `60 - conversion*4` clamped to a 25-55% band. Side
      // gets a flatter synthetic line.
      if (isAcme) {
        const v = 60 - r.acme_conversion_pct * 4
        return Math.max(25, Math.min(55, Math.round(v * 10) / 10))
      }
      return 48 + Math.round(((r.side_visitors_reddit % 7) - 3) * 10) / 10
    case 'avg_session_sec':
      // Synthetic — visitors lighten the per-session time when
      // traffic spikes (more new visitors = lower dwell). Range
      // 90-240s.
      if (isAcme) {
        const base = 160 - (r.acme_visitors_reddit / 30)
        return Math.max(90, Math.min(240, Math.round(base)))
      }
      return Math.max(60, Math.min(180, 120 + (r.side_visitors_organic % 60) - 30))
    case 'revenue':
      return isAcme ? r.acme_gross_cents : r.side_gross_cents
  }
}

// ─── Demo PostHog events ──────────────────────────────────────────────────
//
// Catalogue powering the overview chart's "PostHog → Event count"
// cascade option: pick one of these and the chart plots its per-bucket
// count. Counts are synthetic — each event fires at `rate` × that day's
// visitors, so the series stays date-aware (it moves when you change the
// range) and the events keep realistic relative magnitudes (sign-ups
// common, plan upgrades rare). Purely a demo affordance; real mode pulls
// the event list + counts from the user's PostHog connection.
const DEMO_EVENT_RATES: { name: string; rate: number }[] = [
  { name: 'signed_up',            rate: 0.14 },
  { name: 'payment_succeeded',    rate: 0.035 },
  { name: 'checkout_started',     rate: 0.06 },
  { name: 'subscription_started', rate: 0.022 },
  { name: 'trial_started',        rate: 0.048 },
  { name: 'project_created',      rate: 0.09 },
  { name: 'feature_activated',    rate: 0.31 },
  { name: 'invite_sent',          rate: 0.018 },
  { name: 'upgraded_plan',        rate: 0.011 },
]

const DEMO_EVENT_RATE = new Map(DEMO_EVENT_RATES.map(e => [e.name, e.rate]))

/** The demo's PostHog event definitions, in the shape the real event
 *  picker (`<PosthogEventPickerDialog>` / `<PosthogEventList>`) expects. */
export const DEMO_POSTHOG_EVENTS: PosthogEventDefinition[] = DEMO_EVENT_RATES.map(
  (e, i) => ({
    id: `demo-evt-${i}`,
    name: e.name,
    // Rough 30-day volume = rate × ~1,450 avg daily visitors × 30 days.
    volume_30_day: Math.round(e.rate * 1450 * 30),
    computed_volume: Math.round(e.rate * 1450 * 30),
    last_seen_at: '2026-04-08T11:30:00Z',
    last_url: null,
  }),
)

/** Synthetic per-day count for one PostHog event — `rate × visitors`,
 *  so it tracks traffic and stays date-aware. Unknown events fall back
 *  to a modest 5% rate so a stray ref never zeroes the chart. */
function eventCountForDay(
  r: DemoTimeSeriesRow,
  projectId: string,
  eventName: string,
): number {
  const rate = DEMO_EVENT_RATE.get(eventName) ?? 0.05
  return Math.round(visitorsForDay(r, projectId).total * rate)
}

export function buildOverviewChart(
  projectId: string,
  range: DemoGlobalDate,
  rows: DemoTimeSeriesRow[],
  primary: OverviewPrimaryMetric,
  secondary: OverviewSecondaryMetric,
  // When set, the corresponding axis plots a PostHog event's per-bucket
  // count instead of the predefined metric — mirrors the real chart's
  // `primaryConnectionMetric` / `secondaryConnectionMetric` override.
  primaryEventName: string | null = null,
  secondaryEventName: string | null = null,
): OverviewChartResponse | null {
  if (rows.length === 0) return null
  if (projectId !== 'proj-acme' && projectId !== 'proj-side') return null

  const { from, to } = range
  const { groups } = groupRowsByGranularity(rows, from, to)
  if (groups.length === 0) return null

  // Per-day primary / secondary value providers. When an event name is
  // set for an axis, that axis plots the PostHog event's count; otherwise
  // it uses the predefined metric. Event counts are always summed across
  // a bucket (like revenue), never averaged.
  const primaryOfDay = (r: DemoTimeSeriesRow): number =>
    primaryEventName
      ? eventCountForDay(r, projectId, primaryEventName)
      : primaryTotalForDay(r, projectId, primary)
  const secondaryOfDay = (r: DemoTimeSeriesRow): number | null =>
    secondaryEventName
      ? eventCountForDay(r, projectId, secondaryEventName)
      : secondaryValueForDay(r, projectId, secondary)
  const secondaryIsSum = secondaryEventName != null || secondary === 'revenue'
  const hasSecondary = secondaryEventName != null || secondary !== null

  const buckets = groups.map(g => {
    // Bucket-wide primary total = sum of per-day primary values.
    // Bucket-wide visitor split = sum of per-day source values.
    // We then SCALE the per-source split to the primary total so
    // `bySource` always sums exactly to `total` regardless of which
    // primary metric the user picked.
    const primaryTotal = g.rows.reduce((s, r) => s + primaryOfDay(r), 0)
    const visitorSplit = g.rows.reduce<Record<string, { label: string; value: number }>>(
      (acc, r) => {
        const day = visitorsForDay(r, projectId)
        for (const s of day.sources) {
          if (!acc[s.key]) acc[s.key] = { label: s.label, value: 0 }
          acc[s.key].value += s.value
        }
        return acc
      },
      {},
    )
    const visitorsTotal = Object.values(visitorSplit).reduce((s, v) => s + v.value, 0)

    // Order matters — production renders bySource in array order, so
    // we keep the canonical project order from `visitorsForDay`.
    const sourceOrder = visitorsForDay(g.rows[0]!, projectId).sources.map(s => s.key)
    const bySource = sourceOrder.map(key => {
      const share = visitorsTotal > 0 ? visitorSplit[key]!.value / visitorsTotal : 0
      return {
        source: key,
        label: visitorSplit[key]!.label,
        color: SOURCE_COLOR(key),
        // For `visitors`, this collapses to the original per-source
        // count (share × total = original value). For other primaries,
        // it's the proportional attribution explained in
        // `primaryTotalForDay`.
        value: Math.round(primaryTotal * share),
      }
    })

    // Secondary value: rates / averages need to be AVG-over-bucket,
    // not summed (summing a percentage across days is meaningless).
    // Counts (revenue, event counts) are summed.
    const secondaryValues = g.rows
      .map(r => secondaryOfDay(r))
      .filter((v): v is number => v != null)
    let secondaryBucket: number | null = null
    if (secondaryValues.length > 0) {
      if (secondaryIsSum) {
        secondaryBucket = secondaryValues.reduce((s, v) => s + v, 0)
      } else {
        secondaryBucket =
          secondaryValues.reduce((s, v) => s + v, 0) / secondaryValues.length
        secondaryBucket = Math.round(secondaryBucket * 10) / 10
      }
    }

    return {
      label: g.label,
      total: primaryTotal,
      bySource,
      secondary: secondaryBucket,
    }
  })

  // Top-level secondary total — same aggregation rule as the per-
  // bucket value (sum for revenue / event counts, average for rates).
  let totalSecondary: number | null = null
  if (hasSecondary) {
    const all = rowsInRange(rows, from, to)
      .map(r => secondaryOfDay(r))
      .filter((v): v is number => v != null)
    if (all.length > 0) {
      totalSecondary = secondaryIsSum
        ? all.reduce((s, v) => s + v, 0)
        : Math.round((all.reduce((s, v) => s + v, 0) / all.length) * 10) / 10
    }
  }

  return {
    buckets,
    totalPrimary: buckets.reduce((s, b) => s + b.total, 0),
    totalSecondary,
    trafficProvider: 'posthog',
  }
}

// ─── Context shape ────────────────────────────────────────────────────────

interface DemoContextValue {
  /**
   * The demo's outer container element. Used as the portal target for
   * `<BottomDialog container={…} />` so the demo's bottom-sheets render
   * inside the demo surface instead of escaping to the actual viewport
   * bottom. Set via a callback ref from `<DemoContent>`'s root div;
   * null until that ref runs on first mount, then stable.
   */
  dialogContainer: HTMLElement | null
  setDialogContainer: (el: HTMLElement | null) => void

  // Navigation
  pageOpen: DemoPage
  currentProjectId: string | null
  goToPage: (page: DemoPage, projectId?: string | null) => void

  // Global date pill (mock)
  globalDate: DemoGlobalDate
  setGlobalDateMode: (mode: DateMode) => void
  setGlobalDateRange: (from: string, to: string) => void
  shiftGlobalPeriod: (direction: 1 | -1) => void

  // Entities
  projects: DemoProject[]
  folders: DemoFolder[]
  /**
   * Views with their numeric mock data REPLACED by values derived
   * from the CSV time series for the current `globalDate` range. The
   * date pill driving these derivations means the demo's tile
   * numbers change as the user picks a different range — sums for
   * additive metrics (signups / pageviews / etc.), latest-in-range
   * for instantaneous ones (MRR, GA realtime). Mutations operate
   * on raw view state internally and the derived array recomputes.
   */
  views: DemoView[]
  connections: DemoConnection[]
  pinnedViewIds: string[]
  /**
   * Raw demo time-series rows for the project, exposed so consumers
   * (currently `<DemoProjectView>`) can build the overview chart
   * inline with their own `primaryMetric` / `secondaryMetric` state.
   * Empty array until the CSV finishes loading; callers should
   * short-circuit on `timeSeries.length === 0` and fall back to a
   * static snapshot (`MOCK_OVERVIEW_CHARTS`) for the brief load gap.
   *
   * This used to be a pre-computed `overviewCharts: Record<projectId,
   * OverviewChartResponse>` here, built with fixed `'visitors' + null`
   * metrics. Trouble: the metric pickers in
   * `<ViewCardOverviewChart>` had nowhere to go — picking "Revenue"
   * still showed visitor counts, because the context never saw the
   * picker state. Moving the build to the consumer (via `useMemo`
   * depending on the local picker state) fixes it: each project view
   * computes the chart for its OWN picker selection.
   */
  timeSeries: DemoTimeSeriesRow[]

  // Mutations — projects
  createProject: (name: string) => string
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void

  // Mutations — folders
  createFolder: (name: string, projectId: string, parentId?: string | null) => string
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void

  // Mutations — views
  // `DistributiveOmit` distributes over the discriminated union so
  // each kind's specific payload (mockValue / chartTotal / steps /
  // etc.) survives the omit. Plain `Omit<DemoView, 'id'>` collapses
  // to a wide intersection that drops every kind-specific field.
  createView: (input: DistributiveOmit<DemoView, 'id'>) => string
  renameView: (id: string, name: string) => void
  deleteView: (id: string) => void
  togglePin: (viewId: string) => void

  // Mutations — connections
  createConnection: (type: string, name: string, projectId?: string | null) => string
  deleteConnection: (id: string) => void

  // Chat
  chat: DemoChatMessage[]
  sendChatMessage: (content: string) => void
  clearChat: () => void
  /**
   * Append a message to the chat WITHOUT the simulated reply round-
   * trip — used by `<DemoAgentBody>` to drop scripted-conversation
   * messages directly (typing animation handles the user side, the
   * scripted assistant reply lands here too). Distinct from
   * `sendChatMessage`, which always inserts the user message AND
   * fires a 600 ms-delayed assistant reply from `PRECONFIGURED_QA`.
   */
  pushChatMessage: (role: 'user' | 'assistant', content: string) => void

  // Notice
  notice: string | null
  showNotice: (message: string) => void
  dismissNotice: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

// ─── ID helper — `${prefix}-${nanoSec}` is unique enough for the demo ─

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // The demo's outer container element — populated by <DemoContent>'s
  // callback ref. Lives in state (not a useRef) so consumers like
  // <BottomDialog container={…}> re-render once the ref resolves.
  const [dialogContainer, setDialogContainer] = useState<HTMLElement | null>(null)

  // Navigation — opens on home, matching `/hub/home`.
  const [pageOpen, setPageOpen] = useState<DemoPage>('home')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

  // Date pill
  const [globalDate, setGlobalDate] = useState<DemoGlobalDate>(INITIAL_DATE)

  // Entities
  const [projects, setProjects] = useState<DemoProject[]>(INITIAL_PROJECTS)
  const [folders, setFolders] = useState<DemoFolder[]>(INITIAL_FOLDERS)
  // `rawViews` is the editable source of truth that mutations
  // (rename/delete/pin/createView) operate on. The exported `views`
  // (further down) is `rawViews.map(deriveView(...))` — every numeric
  // mock value re-computed from the CSV time series for the current
  // `globalDate`.
  const [rawViews, setRawViews] = useState<DemoView[]>(INITIAL_VIEWS)
  const [connections, setConnections] = useState<DemoConnection[]>(INITIAL_CONNECTIONS)

  // ─── Time-series CSV ──────────────────────────────────────────────────
  // Loaded once on mount (cached at module level — see
  // `loadDemoTimeSeries()`). Until the fetch resolves we have an empty
  // array; `deriveView` and `buildOverviewChart` short-circuit on that
  // and the demo renders the seed/static numbers as a fallback so
  // there's never a flash of zeroes.
  const [timeSeries, setTimeSeries] = useState<DemoTimeSeriesRow[]>([])
  useEffect(() => {
    let alive = true
    void loadDemoTimeSeries().then(rows => {
      if (alive) setTimeSeries(rows)
    })
    return () => {
      alive = false
    }
  }, [])

  // Chat
  const [chat, setChat] = useState<DemoChatMessage[]>([])

  // Notice
  const [notice, setNotice] = useState<string | null>(null)

  // ─── Navigation ────────────────────────────────────────────────────────
  const goToPage = useCallback((page: DemoPage, projectId: string | null = null) => {
    setPageOpen(page)
    // The caller decides scoping: project surfaces pass a project id (so
    // the sidebar shows), home + global connections pass null.
    setCurrentProjectId(projectId)
  }, [])

  // ─── Date ──────────────────────────────────────────────────────────────
  //
  // Mode and range are coupled both ways so picking either pill in
  // `<DemoTopBar>` produces a visible change:
  //   - Picking a MODE auto-selects a range whose auto-granularity
  //     matches: daily → last 7 d, weekly → last 30 d, monthly → last
  //     90 d. (Bare-mode toggle without a matching range was a no-op
  //     visually because `chartPoints`'s auto-bucketing reads off the
  //     range, not the mode label.)
  //   - Picking a RANGE auto-derives the mode from the same
  //     `chooseGranularity` logic, so the mode pill's label always
  //     mirrors what the chart is actually doing.
  // Real dashboard treats mode + range as independent dimensions
  // (mode = bucket granularity, range = period); for the demo we
  // collapse them so the two pills can't drift out of sync — gives a
  // simpler "picking either one makes things change" UX.
  const setGlobalDateMode = useCallback((mode: DateMode) => {
    setGlobalDate(() => {
      const to = TODAY_ISO
      // ISO-date math via Date arithmetic — safe for all reasonable
      // demo ranges (we never cross year boundaries by enough to
      // worry about leap-year DST etc.).
      const back = (n: number) => {
        const d = new Date(`${to}T00:00:00Z`)
        d.setUTCDate(d.getUTCDate() - n)
        return d.toISOString().slice(0, 10)
      }
      const from =
        mode === 'daily'   ? back(6)   // 7 days inclusive
        : mode === 'weekly' ? back(29) // 30 days inclusive
        : back(89)                       // 90 days inclusive (monthly)
      return { mode, from, to }
    })
  }, [])
  const setGlobalDateRange = useCallback((from: string, to: string) => {
    setGlobalDate(() => {
      // Derive the displayed mode from the picked range so the mode
      // pill's label stays honest. `chooseGranularity` returns
      // `'day' | 'week' | 'month'`; map onto the demo's three modes.
      const g = chooseGranularity(from, to)
      const mode: DateMode =
        g === 'day' ? 'daily' : g === 'week' ? 'weekly' : 'monthly'
      return { mode, from, to }
    })
  }, [])

  const shiftGlobalPeriod = useCallback((direction: 1 | -1) => {
    setGlobalDate(prev => {
      const { from, to } = shiftPeriod(prev.mode, prev.from, prev.to, direction)
      if (from > TODAY_ISO) return prev
      return {
        ...prev,
        from,
        to: to > TODAY_ISO ? TODAY_ISO : to,
      }
    })
  }, [])

  // ─── Project mutations ─────────────────────────────────────────────────
  const createProject = useCallback((name: string): string => {
    const id = uid('proj')
    setProjects(prev => [...prev, { id, name, websiteUrl: null }])
    return id
  }, [])
  const renameProject = useCallback((id: string, name: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))
  }, [])
  const deleteProject = useCallback((id: string) => {
    // Cascade: drop the project's folders + views first, then the project.
    setFolders(prev => prev.filter(f => f.projectId !== id))
    setRawViews(prev => prev.filter(v => v.projectId !== id))
    setProjects(prev => prev.filter(p => p.id !== id))
    // If the user was viewing this project, route home.
    setCurrentProjectId(curr => curr === id ? null : curr)
    setPageOpen(p => (currentProjectId === id ? 'home' : p))
  }, [currentProjectId])

  // ─── Folder mutations ──────────────────────────────────────────────────
  const createFolder = useCallback(
    (name: string, projectId: string, parentId: string | null = null): string => {
      const id = uid('fld')
      setFolders(prev => [...prev, { id, name, projectId, parentId }])
      return id
    },
    [],
  )
  const renameFolder = useCallback((id: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))
  }, [])
  const deleteFolder = useCallback((id: string) => {
    // Cascade: collect this folder + all descendants, drop their views too.
    setFolders(prev => {
      const ids = collectFolderIds(id, prev)
      // Drop views housed in those folders.
      setRawViews(vs => vs.filter(v => !v.folderId || !ids.has(v.folderId)))
      return prev.filter(f => !ids.has(f.id))
    })
  }, [])

  // ─── View mutations ────────────────────────────────────────────────────
  // Each mutation that uses spread on a `DemoView` casts the result
  // through `unknown` to coerce back to the discriminated union —
  // see `togglePin` below for the rationale.
  const createView = useCallback(
    (input: DistributiveOmit<DemoView, 'id'>): string => {
      const id = uid('view')
      const newView = { id, ...input } as unknown as DemoView
      setRawViews(prev => [...prev, newView])
      return id
    },
    [],
  )
  const renameView = useCallback((id: string, name: string) => {
    setRawViews(prev =>
      prev.map(v =>
        v.id === id ? ({ ...v, name } as unknown as DemoView) : v,
      ),
    )
  }, [])
  const deleteView = useCallback((id: string) => {
    setRawViews(prev => prev.filter(v => v.id !== id))
  }, [])
  const togglePin = useCallback((viewId: string) => {
    // Discriminated-union ergonomics: spread (`{...v, pinned: !pinned}`)
    // widens TypeScript's inferred element type because the compiler
    // can't see the spread is identity-except-`pinned`. The double cast
    // (`as unknown as DemoView`) is the safest way to coerce — going
    // through `unknown` bypasses TS's "are these compatible?" check
    // while still producing the right runtime value.
    setRawViews(prev =>
      prev.map(v =>
        v.id === viewId
          ? ({ ...v, pinned: !v.pinned } as unknown as DemoView)
          : v,
      ),
    )
  }, [])

  // ─── Connection mutations ──────────────────────────────────────────────
  const createConnection = useCallback(
    (type: string, name: string, projectId: string | null = null): string => {
      const id = uid('conn')
      setConnections(prev => [...prev, { id, name, type, projectId }])
      return id
    },
    [],
  )
  const deleteConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id))
  }, [])

  // ─── Chat — resolved to a preconfigured Q&A list ──────────────────────
  const sendChatMessage = useCallback((content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    const userMsg: DemoChatMessage = { id: uid('msg'), role: 'user', content: trimmed }
    setChat(prev => [...prev, userMsg])
    // Mock latency so the typing indicator gets a moment.
    setTimeout(() => {
      const reply = answerFor(trimmed)
      const assistantMsg: DemoChatMessage = { id: uid('msg'), role: 'assistant', content: reply }
      setChat(prev => [...prev, assistantMsg])
    }, 600)
  }, [])
  const clearChat = useCallback(() => setChat([]), [])

  // Drop a single message into the chat directly. Used by the
  // scripted-conversation auto-play in `<DemoAgentBody>` — the
  // typing animation runs locally inside that component, then this
  // pushes the result. We don't reuse `sendChatMessage` for the
  // scripted side because that one always pairs the user message
  // with a `PRECONFIGURED_QA`-matched assistant reply on its own
  // timeline, which would race the scripted reply.
  const pushChatMessage = useCallback(
    (role: 'user' | 'assistant', content: string) => {
      setChat(prev => [...prev, { id: uid('msg'), role, content }])
    },
    [],
  )

  // ─── Notice ────────────────────────────────────────────────────────────
  const showNotice = useCallback((message: string) => setNotice(message), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  // ─── Derived state ─────────────────────────────────────────────────────
  //
  // `views` exposed to consumers is the date-aware overlay: each raw
  // seed view passes through `deriveView` which replaces `mockValue` /
  // `chartTotal` / `chartPoints` with values aggregated from the CSV
  // for the current `globalDate` range. When the CSV hasn't loaded yet
  // (or a view has no derivation specified), the seed value passes
  // through unchanged — see `deriveView`'s short-circuit.
  const views = useMemo(
    () => rawViews.map(v => deriveView(v, globalDate, timeSeries)),
    [rawViews, globalDate, timeSeries],
  )

  // `pinnedViewIds` keys off the raw set, not the derived one — the
  // `pinned` flag never differs between raw and derived (`deriveView`
  // only touches numeric fields), and depending on `views` would
  // re-create this array every time the date range moved.
  const pinnedViewIds = useMemo(
    () => rawViews.filter(v => v.pinned).map(v => v.id),
    [rawViews],
  )

  const value: DemoContextValue = {
    dialogContainer,
    setDialogContainer,
    pageOpen,
    currentProjectId,
    goToPage,
    globalDate,
    setGlobalDateMode,
    setGlobalDateRange,
    shiftGlobalPeriod,
    projects,
    folders,
    views,
    connections,
    pinnedViewIds,
    timeSeries,
    createProject,
    renameProject,
    deleteProject,
    createFolder,
    renameFolder,
    deleteFolder,
    createView,
    renameView,
    deleteView,
    togglePin,
    createConnection,
    deleteConnection,
    chat,
    sendChatMessage,
    clearChat,
    pushChatMessage,
    notice,
    showNotice,
    dismissNotice,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemoContext(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemoContext must be used within DemoProvider')
  return ctx
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function collectFolderIds(rootId: string, all: DemoFolder[]): Set<string> {
  const ids = new Set<string>([rootId])
  // Iterate until no new descendants are added (handles nested folders).
  let added = true
  while (added) {
    added = false
    for (const f of all) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        added = true
      }
    }
  }
  return ids
}

// ─── Preconfigured Q&A — caller will fill in the list ────────────────────
//
// The user said "you'll provide the Q&A list later". Until then, the
// list is empty: typing anything yields the fallback. The plumbing
// (typing → user bubble → 600 ms → assistant reply) works either way,
// and adding pairs is just dropping `{ q, a }` entries here.
//
// Match is case-insensitive, exact (after `.trim()`). A fuzzier match
// (substring etc.) would surprise users when their typo "matches"
// something unrelated — exact string is simpler + more predictable.

export interface DemoQA {
  q: string
  a: string
}

export const PRECONFIGURED_QA: DemoQA[] = [
  // TODO — author Q&A pairs here.
]

/**
 * Two-turn scripted conversation the `playDemo` action drops into
 * the chat. Chosen to showcase what the Agent does in the smallest
 * possible thread: a revenue question that exercises Stripe-style
 * data, then a follow-up that hops to a different connected tool
 * (PostHog / Google Analytics) — so the visitor sees ONE agent
 * routing to MULTIPLE underlying sources, which is the actual
 * value prop. Replies are markdown-friendly (the real `ChatMessage`
 * renderer handles bold + bullets).
 */
export const DEMO_SCRIPT: DemoQA[] = [
  {
    q: "How's my revenue this week?",
    a: "**$4,832 this week** (Apr 1 – Apr 7) — up **18%** from last week.\n\nThe biggest day was Wednesday at **$1,240**. Source: Stripe on your main project.",
  },
  {
    q: 'And what about traffic — any spike worth knowing about?',
    a: "**12,847 pageviews** this week (Google Analytics), up **6%** vs. last week.\n\nWednesday's session count spiked too — likely the same audience that drove the revenue bump.",
  },
]

function answerFor(content: string): string {
  const match = PRECONFIGURED_QA.find(
    pair => pair.q.toLowerCase() === content.toLowerCase().trim(),
  )
  if (match) return match.a
  return "Sorry — this is a demo. Try one of the preconfigured questions below."
}
