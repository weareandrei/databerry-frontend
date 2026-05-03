'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowsClockwise,
  Cube,
  DotsThreeVertical,
  Gear,
  PushPin,
  PushPinSlash,
  Warning,
} from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ViewWrapper } from './ViewWrapper'
import { OverviewSourcesPanel } from './OverviewSourcesPanel'
import { OverviewUsersPanel } from './OverviewUsersPanel'
import { PROJECT_OVERVIEW, type OverviewSource, type OverviewUser } from '@/lib/api'
import type { ProjectOverviewSourcesConfig, View } from '@/types/view'

type Tab = 'sources' | 'users'

function readConfig(view: View): ProjectOverviewSourcesConfig {
  const cfg = view.config as Partial<ProjectOverviewSourcesConfig>
  return {
    sourcesLimit: cfg.sourcesLimit ?? 10,
  }
}

// Per-tab fetch state. Each tab fetches lazily on first activation; subsequent
// visits re-use the cached data. Loading/error are tracked independently so
// switching tabs never flashes the sibling tab's spinner.
interface TabState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Only meaningful for 'users' — backend tells us why the list is empty. */
  provider?: 'google_analytics' | 'posthog' | null
  /** True once a fetch has at least been attempted. */
  fetched: boolean
}

function initialState<T>(): TabState<T> {
  return { data: null, loading: false, error: null, fetched: false }
}

interface ViewCardOverviewSourcesProps {
  view: View
  dateFrom: string
  dateTo: string
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
}

export function ViewCardOverviewSources({
  view,
  dateFrom,
  dateTo,
  projectName,
  onUntrack,
  onPin,
}: ViewCardOverviewSourcesProps) {
  const config = readConfig(view)
  const [tab, setTab] = useState<Tab>('sources')
  const [sources, setSources] = useState<TabState<OverviewSource[]>>(initialState)
  const [users, setUsers] = useState<TabState<OverviewUser[]>>(initialState)
  // Refresh ticks are per-tab so refreshing Sources doesn't invalidate Users'
  // cache and vice-versa.
  const [sourcesTick, setSourcesTick] = useState(0)
  const [usersTick, setUsersTick] = useState(0)

  // ── Sources fetch (runs when tab becomes 'sources' the first time, on
  //    range changes while visible, or when its refresh tick bumps). ────
  // The view's `sourcesLimit` config is *not* sent as the API limit any
  // more — instead it controls the panel's local page size. We always
  // ask for the backend default (100) so pagination has something to
  // page through. Switching `sourcesLimit` therefore doesn't invalidate
  // the cached data, only the pager's view of it.
  useEffect(() => {
    if (tab !== 'sources') return
    let cancelled = false
    setSources(s => ({ ...s, loading: true, error: null }))
    PROJECT_OVERVIEW.getSources(view.projectId, dateFrom, dateTo)
      .then(res => {
        if (cancelled) return
        setSources({ data: res.sources, loading: false, error: null, fetched: true })
      })
      .catch(err => {
        if (cancelled) return
        setSources({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load sources',
          fetched: true,
        })
      })
    return () => {
      cancelled = true
    }
  }, [tab, view.projectId, dateFrom, dateTo, sourcesTick])

  // ── Users fetch (same lazy+refresh pattern). ────────────────────────────
  useEffect(() => {
    if (tab !== 'users') return
    let cancelled = false
    setUsers(s => ({ ...s, loading: true, error: null }))
    PROJECT_OVERVIEW.getUsers(view.projectId, dateFrom, dateTo, 100)
      .then(res => {
        if (cancelled) return
        setUsers({
          data: res.users,
          loading: false,
          error: null,
          provider: res.provider,
          fetched: true,
        })
      })
      .catch(err => {
        if (cancelled) return
        setUsers({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load users',
          fetched: true,
        })
      })
    return () => {
      cancelled = true
    }
  }, [tab, view.projectId, dateFrom, dateTo, usersTick])

  // Refresh acts on the active tab only — matches the user's mental model
  // ("refresh what I'm looking at") and avoids an unnecessary round-trip to
  // the idle tab.
  const refresh = () => {
    if (tab === 'sources') setSourcesTick(t => t + 1)
    else setUsersTick(t => t + 1)
  }

  const activeLoading = tab === 'sources' ? sources.loading : users.loading

  return (
    <ViewWrapper variant="borderless">
      {/* Bespoke inline header — replaces <ViewHeader compact>. The tab
          buttons own the left side; the actions dropdown sits on the right.
          Mirrors ViewCardOverviewChart's custom header layout so both
          composite-overview cards feel consistent. */}
      <div className="flex items-center justify-between gap-1 px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <TabButton active={tab === 'sources'} onClick={() => setTab('sources')}>
            Sources
          </TabButton>
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
            Users
          </TabButton>
          {/* Project pill — only when the card is rendered away from its own
              project page (e.g. pinned on Home). On the project page projectName
              is not passed, so this is silently skipped. */}
          {projectName && (
            <span className="flex items-center gap-1 text-[10px] border border-stroke rounded-full px-2 py-0.5 text-grey-light leading-tight shrink-0">
              <Cube size={9} weight="bold" />
              {projectName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-grey-light hover:text-grey-dark hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors -mr-1">
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
      </div>

      <div className="p-4 min-w-0">
        {tab === 'sources'
          ? renderSources(sources, config.sourcesLimit ?? 10)
          : renderUsers(users)
        }
      </div>
    </ViewWrapper>
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
): React.ReactElement {
  if (state.error) return <ErrorState message={state.error} />
  if (state.loading || !state.fetched) return <LoadingState />
  if (!state.data || state.data.length === 0) return <NoTrafficState />
  return <OverviewSourcesPanel sources={state.data} pageSize={pageSize} />
}

function renderUsers(state: TabState<OverviewUser[]>): React.ReactElement {
  if (state.error) return <ErrorState message={state.error} />
  if (state.loading || !state.fetched) return <LoadingState />

  // GA is explicitly unsupported in this pass — surface a tailored CTA
  // rather than the generic "no traffic source" state so users know *why*
  // the tab is empty and what to do about it.
  if (state.provider === 'google_analytics') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-6 px-4">
        <p className="text-sm text-grey-dark">
          User-level breakdown requires PostHog.
        </p>
        <p className="text-xs text-grey-light max-w-[280px]">
          Google Analytics doesn&apos;t expose the per-user session data needed
          for this view. Connect a PostHog project to see individual visitors.
        </p>
        <Link
          href="/hub/settings"
          className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors"
        >
          <Gear size={12} weight="bold" />
          Set up in Settings
        </Link>
      </div>
    )
  }

  // No provider at all (e.g. Common/unscoped with nothing connected).
  if (state.provider == null && (!state.data || state.data.length === 0)) {
    return <NoTrafficState />
  }

  return <OverviewUsersPanel users={state.data ?? []} />
}

// ── Sub-components for the three non-data states ───────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-6">
      <ArrowsClockwise
        size={18}
        weight="bold"
        className="text-muted-foreground animate-spin"
      />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 text-center py-6">
      <Warning size={18} weight="bold" className="text-amber-500" />
      <p className="text-xs text-grey-light">{message}</p>
    </div>
  )
}

function NoTrafficState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center py-6">
      <p className="text-sm text-grey-dark">No traffic source connected.</p>
      <Link
        href="/hub/settings"
        className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors"
      >
        <Gear size={12} weight="bold" />
        Set up in Settings
      </Link>
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
          ? 'text-grey-darkest font-semibold border-b-2 border-grey-darkest'
          : 'text-grey-light hover:text-grey-dark border-b-2 border-transparent'
      }`}
    >
      {children}
    </button>
  )
}
