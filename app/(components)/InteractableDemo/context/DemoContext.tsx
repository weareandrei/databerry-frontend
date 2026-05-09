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
  MOCK_OVERVIEW_CHARTS,
  type DemoConnection,
  type DemoFolder,
  type DemoProject,
} from '../demoMocks'
import { INITIAL_VIEWS, type DemoView } from './demoSeedViews'
import {
  avgColumn,
  chartPoints,
  groupRowsByGranularity,
  lastColumn,
  loadDemoTimeSeries,
  sumColumn,
  type DemoTimeSeriesRow,
} from './demoTimeSeries'
import type { OverviewChartResponse } from '@/lib/api'

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

export type DemoPage = 'home' | 'project' | 'connections' | 'settings' | 'agent-chat'

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

// Per-project overview-chart palette — must stay in sync with
// `DEMO_SOURCE_COLOR` in `demoMocks.ts`. Inlined here (not imported)
// because we'd otherwise create a circular dep: `demoMocks` already
// owns the static `MOCK_OVERVIEW_CHARTS` and importing back from it
// would close the loop.
const ACME_PALETTE = {
  organic:  '#FB923C',
  direct:   '#F46719',
  referral: '#94A3B8',
} as const
const SIDE_PALETTE = {
  direct:   '#F46719',
  organic:  '#FB923C',
  social:   '#CBD5E1',
} as const

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
function buildOverviewChart(
  projectId: string,
  range: DemoGlobalDate,
  rows: DemoTimeSeriesRow[],
): OverviewChartResponse | null {
  if (rows.length === 0) return null
  const { from, to } = range
  const { groups } = groupRowsByGranularity(rows, from, to)
  if (groups.length === 0) return null

  const sumOver = (rs: DemoTimeSeriesRow[], col: keyof DemoTimeSeriesRow): number =>
    rs.reduce((s, r) => s + (typeof r[col] === 'number' ? (r[col] as number) : 0), 0)
  const avgOver = (rs: DemoTimeSeriesRow[], col: keyof DemoTimeSeriesRow): number =>
    rs.length === 0 ? 0 : sumOver(rs, col) / rs.length

  if (projectId === 'proj-acme') {
    const buckets = groups.map(g => {
      const organic  = sumOver(g.rows, 'acme_visitors_organic')
      const direct   = sumOver(g.rows, 'acme_visitors_direct')
      const referral = sumOver(g.rows, 'acme_visitors_referral')
      return {
        label: g.label,
        total: organic + direct + referral,
        bySource: [
          { source: 'organic',  label: 'Organic',  color: ACME_PALETTE.organic,  value: organic },
          { source: 'direct',   label: 'Direct',   color: ACME_PALETTE.direct,   value: direct },
          { source: 'referral', label: 'Referral', color: ACME_PALETTE.referral, value: referral },
        ],
        // Conversion is a rate — average across the bucket's days,
        // not sum (summing percentages would be meaningless).
        secondary: avgOver(g.rows, 'acme_conversion_pct'),
      }
    })
    return {
      buckets,
      totalPrimary: buckets.reduce((s, b) => s + b.total, 0),
      totalSecondary: avgColumn(rows, from, to, 'acme_conversion_pct'),
      trafficProvider: 'posthog',
    }
  }

  if (projectId === 'proj-side') {
    const buckets = groups.map(g => {
      const direct  = sumOver(g.rows, 'side_visitors_direct')
      const organic = sumOver(g.rows, 'side_visitors_organic')
      const social  = sumOver(g.rows, 'side_visitors_social')
      return {
        label: g.label,
        total: direct + organic + social,
        bySource: [
          { source: 'direct',  label: 'Direct',  color: SIDE_PALETTE.direct,  value: direct },
          { source: 'organic', label: 'Organic', color: SIDE_PALETTE.organic, value: organic },
          { source: 'social',  label: 'Social',  color: SIDE_PALETTE.social,  value: social },
        ],
        // Side has no secondary metric in seed data — keep it `null`
        // so `<ViewCardOverviewChart>` shows the secondary picker as
        // "None" (matches real-mode behaviour for projects without a
        // conversion-rate signal).
        secondary: null,
      }
    })
    return {
      buckets,
      totalPrimary: buckets.reduce((s, b) => s + b.total, 0),
      totalSecondary: null,
      trafficProvider: 'posthog',
    }
  }

  return null
}

// ─── Context shape ────────────────────────────────────────────────────────

interface DemoContextValue {
  // Navigation
  pageOpen: DemoPage
  currentProjectId: string | null
  goToPage: (page: DemoPage, projectId?: string | null) => void

  // Global date pill (mock)
  globalDate: DemoGlobalDate
  setGlobalDateMode: (mode: DateMode) => void
  setGlobalDateRange: (from: string, to: string) => void

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
   * Per-project overview chart data, also derived from the CSV.
   * Keyed by `projectId`; falls back to the static
   * `MOCK_OVERVIEW_CHARTS` snapshot when the CSV hasn't loaded yet.
   * `<DemoProjectView>` reads this instead of pulling the static
   * mock directly.
   */
  overviewCharts: Record<string, OverviewChartResponse | null>

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
  // Navigation
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
    setCurrentProjectId(page === 'project' ? projectId : null)
  }, [])

  // ─── Date ──────────────────────────────────────────────────────────────
  const setGlobalDateMode = useCallback((mode: DateMode) => {
    setGlobalDate(d => ({ ...d, mode }))
  }, [])
  const setGlobalDateRange = useCallback((from: string, to: string) => {
    setGlobalDate(d => ({ ...d, from, to }))
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

  // Overview-chart data per project — derived from the same time
  // series. Falls back to the static `MOCK_OVERVIEW_CHARTS` snapshot
  // until the CSV resolves so consumers never see a flash of empty
  // charts on first paint.
  const overviewCharts = useMemo<Record<string, OverviewChartResponse | null>>(() => {
    if (timeSeries.length === 0) {
      return {
        'proj-acme': MOCK_OVERVIEW_CHARTS['proj-acme'] ?? null,
        'proj-side': MOCK_OVERVIEW_CHARTS['proj-side'] ?? null,
      }
    }
    return {
      'proj-acme': buildOverviewChart('proj-acme', globalDate, timeSeries),
      'proj-side': buildOverviewChart('proj-side', globalDate, timeSeries),
    }
  }, [timeSeries, globalDate])

  const value: DemoContextValue = {
    pageOpen,
    currentProjectId,
    goToPage,
    globalDate,
    setGlobalDateMode,
    setGlobalDateRange,
    projects,
    folders,
    views,
    connections,
    pinnedViewIds,
    overviewCharts,
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

function answerFor(content: string): string {
  const match = PRECONFIGURED_QA.find(
    pair => pair.q.toLowerCase() === content.toLowerCase().trim(),
  )
  if (match) return match.a
  return "Sorry — this is a demo. Try one of the preconfigured questions below."
}
