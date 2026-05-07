'use client'

/**
 * Composite "project overview — sources / users" tile. Two-tab
 * (Sources, Users) panel that sits next to the overview chart on
 * desktop, or below it on mobile / inside the pinned-views card.
 *
 * Props-only data path — the component owns the active tab + the
 * pin/unpin/refresh menu, but the per-tab data + loading state come
 * from the caller. Real callers feed `useOverviewSourcesData()`
 * through this prop set; demo callers pass static mock data.
 */

import Link from 'next/link'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ViewWrapper } from './ViewWrapper'
import { OverviewSourcesPanel } from './OverviewSourcesPanel'
import { OverviewUsersPanel } from './OverviewUsersPanel'
import type { OverviewSource, OverviewUser } from '@/lib/api'
import type { ProjectOverviewSourcesConfig, View } from '@/types/view'

type Tab = 'sources' | 'users'

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
  /** Only meaningful for 'users' — caller signals why the list is empty. */
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
  users: TabState<OverviewUser[]>
  /** Refresh handlers — refresh acts on the active tab only. */
  onRefreshSources: () => void
  onRefreshUsers: () => void
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
  /**
   * When true, the wrapper renders without its own border + shadow.
   * Same `chromeless` knob `ViewCard` etc. expose for nested layouts.
   */
  chromeless?: boolean
}

export function ViewCardOverviewSources({
  view,
  tab,
  onTabChange,
  sources,
  users,
  onRefreshSources,
  onRefreshUsers,
  projectName,
  onUntrack,
  onPin,
  chromeless = false,
}: ViewCardOverviewSourcesProps) {
  // Suppress unused-prop lint — `chromeless` is accepted for API
  // uniformity but the wrapper below is always borderless (this
  // composite tile is meant to nest inside a larger layout chunk
  // already, same as `ViewCardOverviewChart`).
  void chromeless

  const config = readConfig(view)
  const refresh = () => {
    if (tab === 'sources') onRefreshSources()
    else onRefreshUsers()
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
          <TabButton active={tab === 'sources'} onClick={() => onTabChange('sources')}>
            Sources
          </TabButton>
          <TabButton active={tab === 'users'} onClick={() => onTabChange('users')}>
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
          href="/hub/connections"
          className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors mt-1"
        >
          <Plugs size={12} weight="bold" />
          Connect PostHog
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
    <div className="flex flex-col items-center justify-center gap-2 text-center py-6 px-4">
      <p className="text-sm text-grey-dark">No analytics tool connected yet.</p>
      <p className="text-xs text-grey-light max-w-[280px]">
        Connect Google Analytics or PostHog to see where your traffic is coming
        from.
      </p>
      <Link
        href="/hub/connections"
        className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors mt-1"
      >
        <Plugs size={12} weight="bold" />
        Connect analytics
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
