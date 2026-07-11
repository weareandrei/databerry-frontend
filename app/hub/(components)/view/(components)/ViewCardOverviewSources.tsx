'use client'

/**
 * Composite "project overview — sources / countries" tile. Two-tab
 * (Sources, Countries) panel that sits next to the overview chart on
 * desktop, or below it on mobile / inside the pinned-views card.
 *
 * Props-only data path — the component owns the active tab + the
 * pin/unpin/refresh menu, but the per-tab data + loading state come
 * from the caller. Real callers feed `useOverviewSourcesData()`
 * through this prop set; demo callers pass static mock data.
 *
 * Users tab was retired in favour of Countries (more scannable; works
 * without PostHog person-identification). Per-user depth lives in
 * the standalone `posthog_users` view type.
 */

import { useState } from 'react'
import {
  ArrowsClockwise,
  Cube,
  DotsThreeVertical,
  Plugs,
  PushPin,
  PushPinSlash,
  Warning,
} from '@phosphor-icons/react'
import { SkeletonRows } from './ViewSkeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ViewWrapper } from './ViewWrapper'
import { OverviewSourcesPanel } from './OverviewSourcesPanel'
import { OverviewCountriesPanel } from './OverviewCountriesPanel'
import { OverviewPagesPanel } from './OverviewPagesPanel'
import { TrafficConnectionPicker } from '../../modals/(components)/TrafficConnectionPicker'
import type { OverviewSource, OverviewCountry, OverviewPage } from '@/lib/api'
import type { ProjectOverviewSourcesConfig, View } from '@/types/view'

type Tab = 'sources' | 'countries' | 'pages'

/**
 * Default for the OPTIONAL pages tab state — demo callers (and any
 * older call sites) that don't pass `pages` render the tab with a
 * quiet empty state instead of crashing on a missing prop.
 */
const EMPTY_PAGES_STATE: {
  data: OverviewPage[] | null
  loading: boolean
  error: string | null
  provider?: 'google_analytics' | 'posthog' | null
  fetched: boolean
} = { data: [], loading: false, error: null, provider: 'posthog', fetched: true }

function readConfig(view: View): ProjectOverviewSourcesConfig {
  const cfg = view.config as Partial<ProjectOverviewSourcesConfig>
  return {
    sourcesLimit: cfg.sourcesLimit ?? 10,
  }
}

// Per-tab fetch state. Each tab's fetch is owned by the caller (real
// → `useOverviewSourcesData`, demo → static mock); this component
// just renders whatever it's given. Loading/error are tracked
// independently per tab so switching never flashes the sibling tab's
// spinner.
interface TabState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Only meaningful for 'countries' — caller signals why the list is empty. */
  provider?: 'google_analytics' | 'posthog' | null
  /** True once a fetch has at least been attempted. */
  fetched: boolean
}

interface ViewCardOverviewSourcesProps {
  view: View
  dateFrom: string
  dateTo: string
  /**
   * Currently-active tab. Lifted into the caller so the data hook
   * can fire only the correct fetch (lazy-on-activation pattern).
   * Demo passes whichever tab is most useful as the default and
   * keeps it stable.
   */
  tab: Tab
  onTabChange: (next: Tab) => void
  /**
   * Per-tab fetch state. Real mode threads `useOverviewSourcesData`
   * through; demo mode hands in static mock results with
   * `loading: false`, `fetched: true`.
   */
  sources: TabState<OverviewSource[]>
  countries: TabState<OverviewCountry[]>
  /** Optional so demo/static callers don't have to mock it. */
  pages?: TabState<OverviewPage[]>
  /** Refresh handlers — refresh acts on the active tab only. */
  onRefreshSources: () => void
  onRefreshCountries: () => void
  onRefreshPages?: () => void
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
  /**
   * When true, the wrapper renders without its own border + shadow.
   * Same `chromeless` knob `ViewCard` etc. expose for nested layouts.
   */
  chromeless?: boolean
  /**
   * Cross-component hover bridge — fires when a source row enters or
   * leaves hover. The composite project_overview pair lifts a single
   * `hoveredSourceKey` into shared state and passes the matching key
   * down to `<ViewCardOverviewChart externalHoveredSourceKey>` so the
   * chart highlights the segments belonging to that source. `null`
   * on mouse leave clears the highlight.
   *
   * Only the Sources tab fires this — Countries has no chart-segment
   * counterpart on the left. Optional so non-composite callers
   * (mobile project body, pinned tile) don't have to plumb a no-op.
   */
  onSourceHover?: (sourceKey: string | null) => void
  /**
   * Composite mode — when true the panel drops its OWN 3-dots menu
   * (Pin / Refresh / Untrack). In the unified project_overview block
   * those live in the shared header's single menu and act on BOTH
   * halves at once, so a second menu here would be redundant. The tabs
   * (Sources / Countries / Pages) stay — they're this panel's own
   * sub-navigation, not view-level actions.
   */
  hideMenu?: boolean
}

export function ViewCardOverviewSources({
  view,
  tab,
  onTabChange,
  sources,
  countries,
  pages = EMPTY_PAGES_STATE,
  onRefreshSources,
  onRefreshCountries,
  onRefreshPages,
  projectName,
  onUntrack,
  onPin,
  chromeless = false,
  onSourceHover,
  hideMenu = false,
}: ViewCardOverviewSourcesProps) {
  // Suppress unused-prop lint — `chromeless` is accepted for API
  // uniformity but the wrapper below is always borderless (this
  // composite tile is meant to nest inside a larger layout chunk
  // already, same as `ViewCardOverviewChart`).
  void chromeless

  const config = readConfig(view)
  const refresh = () => {
    if (tab === 'sources') onRefreshSources()
    else if (tab === 'countries') onRefreshCountries()
    else onRefreshPages?.()
  }

  const activeLoading =
    tab === 'sources'
      ? sources.loading
      : tab === 'countries'
        ? countries.loading
        : pages.loading

  // Opens the in-place picker for the "no analytics tool connected"
  // empty states inside the tabs (sources empty, countries empty,
  // and the GA-not-supported countries variant). On link, refresh
  // BOTH tabs since the new connection could power either.
  const [trafficPickerOpen, setTrafficPickerOpen] = useState(false)
  const handleConnectClick = () => setTrafficPickerOpen(true)
  const handleLinked = () => {
    onRefreshSources()
    onRefreshCountries()
    onRefreshPages?.()
  }

  return (
    <>
    <ViewWrapper variant="borderless">
      {/* Bespoke inline header — replaces <ViewHeader compact>. The tab
          buttons own the left side; the actions dropdown sits on the right.
          Mirrors ViewCardOverviewChart's custom header layout so both
          composite-overview cards feel consistent. */}
      <div className="flex items-center justify-between gap-1 px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <TabButton active={tab === 'sources'} onClick={() => onTabChange('sources')}>
            Sources
          </TabButton>
          <TabButton active={tab === 'countries'} onClick={() => onTabChange('countries')}>
            Countries
          </TabButton>
          <TabButton active={tab === 'pages'} onClick={() => onTabChange('pages')}>
            Pages
          </TabButton>
          {/* Project pill — only when the card is rendered away from its own
              project page (e.g. pinned on Home). On the project page projectName
              is not passed, so this is silently skipped. */}
          {projectName && (
            <span className="flex items-center gap-1 text-[10px] border border-stroke rounded-full px-2 py-0.5 text-subtle leading-tight shrink-0">
              <Cube size={9} weight="bold" />
              {projectName}
            </span>
          )}
        </div>

        {!hideMenu && (
        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-subtle hover:text-muted-foreground hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors -mr-1">
              <DotsThreeVertical size={18} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {onPin && (
                <DropdownMenuItem
                  onClick={() => onPin(view.id)}
                  className="text-sm gap-2"
                >
                  {view.isPinned
                    ? <><PushPinSlash size={13} weight="bold" />Unpin</>
                    : <><PushPin size={13} weight="bold" />Pin</>
                  }
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={refresh}
                disabled={activeLoading}
                className="text-sm gap-2"
              >
                <ArrowsClockwise
                  size={13}
                  weight="bold"
                  className={activeLoading ? 'animate-spin' : ''}
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
        )}
      </div>

      <div data-no-dnd="true" className="p-4 min-w-0">
        {tab === 'sources' &&
          renderSources(sources, config.sourcesLimit ?? 10, handleConnectClick, onSourceHover)}
        {tab === 'countries' && renderCountries(countries, handleConnectClick)}
        {tab === 'pages' && renderPages(pages, handleConnectClick)}
      </div>
    </ViewWrapper>

    {/* Traffic-source picker — only mounted while open.
        See ViewCardOverviewChart for the rationale: the picker
        calls `useDashboard()` which throws outside a
        DashboardProvider (the demo doesn't wrap one), and the demo
        never shows the empty-state CTAs that open this picker. */}
    {trafficPickerOpen && (
      <TrafficConnectionPicker
        projectId={view.projectId}
        open={trafficPickerOpen}
        onOpenChange={setTrafficPickerOpen}
        onLinked={handleLinked}
      />
    )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Rendering helpers — kept out of the component body so the tab switch reads
// cleanly. Each helper consumes its own fetch state and returns the right
// loading / error / empty / data variant.
// ────────────────────────────────────────────────────────────────────────────

function renderSources(
  state: TabState<OverviewSource[]>,
  pageSize: number,
  onConnectClick: () => void,
  onSourceHover?: (sourceKey: string | null) => void,
): React.ReactElement {
  if (state.error) return <ErrorState message={state.error} />
  if (state.loading || !state.fetched) return <LoadingState />

  // No provider connected at all → the connect CTA. When a provider IS
  // connected but returned no rows (e.g. no traffic recorded for the
  // day), fall through to `<OverviewSourcesPanel>`, which renders its
  // own "No sources recorded for this range." message. Previously any
  // empty result showed the "No analytics tool connected yet." CTA,
  // which was wrong for a live connection with zero traffic. Mirrors the
  // provider-gated pattern the Countries / Pages tabs already use.
  if (state.provider == null && (!state.data || state.data.length === 0)) {
    return <NoConnectionState onConnectClick={onConnectClick} />
  }

  return (
    <OverviewSourcesPanel
      sources={state.data ?? []}
      pageSize={pageSize}
      onSourceHover={onSourceHover}
    />
  )
}

function renderCountries(
  state: TabState<OverviewCountry[]>,
  onConnectClick: () => void,
): React.ReactElement {
  if (state.error) return <ErrorState message={state.error} />
  if (state.loading || !state.fetched) return <LoadingState />

  // GA is explicitly unsupported (its country dimension uses display
  // names not ISO codes — flag rendering would be ambiguous). Surface
  // a tailored CTA so users understand *why* the tab is empty.
  if (state.provider === 'google_analytics') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-6 px-4">
        <p className="text-sm text-muted-foreground">
          Country breakdown requires PostHog.
        </p>
        <p className="text-xs text-subtle max-w-[280px]">
          Google Analytics&apos; country dimension uses display names rather
          than ISO codes, which makes flag rendering ambiguous. Connect a
          PostHog project to see country-level traffic.
        </p>
        <button
          type="button"
          onClick={onConnectClick}
          className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface transition-colors mt-1 cursor-pointer"
        >
          <Plugs size={12} weight="bold" />
          Connect PostHog
        </button>
      </div>
    )
  }

  // No provider at all (e.g. Common/unscoped with nothing connected).
  if (state.provider == null && (!state.data || state.data.length === 0)) {
    return <NoConnectionState onConnectClick={onConnectClick} />
  }

  return <OverviewCountriesPanel countries={state.data ?? []} />
}

function renderPages(
  state: TabState<OverviewPage[]>,
  onConnectClick: () => void,
): React.ReactElement {
  if (state.error) return <ErrorState message={state.error} />
  if (state.loading || !state.fetched) return <LoadingState />

  // No provider at all → same connect CTA as the sibling tabs.
  // (Unlike Countries, Pages works on BOTH providers — GA via
  // `pagePath`, PostHog via `$pathname` — so there's no
  // GA-unsupported special case.)
  if (state.provider == null && (!state.data || state.data.length === 0)) {
    return <NoConnectionState onConnectClick={onConnectClick} />
  }

  return <OverviewPagesPanel pages={state.data ?? []} />
}

// ── Sub-components for the three non-data states ───────────────────────────

function LoadingState() {
  return <SkeletonRows count={5} rowClassName="h-9" />
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 text-center py-6">
      <Warning size={18} weight="bold" className="text-amber-500" />
      <p className="text-xs text-subtle">{message}</p>
    </div>
  )
}

interface NoConnectionStateProps {
  /** Click handler for the "Connect analytics" CTA. Lifted to the
   *  parent so it can open the in-place `TrafficConnectionPicker`. */
  onConnectClick: () => void
}

// Shown only when NO traffic provider is connected for the project.
// Not to be confused with a connected provider that recorded no
// traffic for the range — that case renders each panel's own quiet
// "No … recorded for this range." message instead.
function NoConnectionState({ onConnectClick }: NoConnectionStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center py-6 px-4">
      <p className="text-sm text-muted-foreground">No analytics tool connected yet.</p>
      <p className="text-xs text-subtle max-w-[280px]">
        Connect Google Analytics or PostHog to see where your traffic is coming
        from.
      </p>
      <button
        type="button"
        onClick={onConnectClick}
        className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface transition-colors mt-1 cursor-pointer"
      >
        <Plugs size={12} weight="bold" />
        Connect analytics
      </button>
    </div>
  )
}

// ── Inline tab button — two-button segmented control matching the app's
//    design language (no shadcn tabs primitive in this repo). The underline
//    sits inside the padding so the active tab's baseline stays flush with
//    its siblings. -mb-px absorbs the (implicit) content-area top border.
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-sm leading-tight pb-2 transition-colors cursor-pointer -mb-px ${
        active
          ? 'text-foreground font-semibold border-b-2 border-foreground'
          : 'text-subtle hover:text-muted-foreground border-b-2 border-transparent'
      }`}
    >
      {children}
    </button>
  )
}
