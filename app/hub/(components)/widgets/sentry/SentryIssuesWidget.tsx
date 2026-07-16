'use client'

/**
 * Sentry errors-list view. Wide 2×2 list tile (same footprint as
 * `<CustomerListWidget>` and the Calendly meetings list) showing
 * the org's unresolved issues over a user-picked period, sorted by
 * either recency or frequency.
 *
 * Filters live INSIDE the tile, not on the global date pill: the
 * tile's "what's broken right now" question lives in a different
 * mental space from the dashboard's revenue/users period. Two
 * dropdowns in the header sub-row (period + sort) drive both the
 * fetch and the persisted `view.config` so the choice survives
 * reloads.
 *
 * Persistence: dropdown changes call `ALGORITHM.updateView({ config:
 * { ...prev, period, sort } })` (with optimistic local state) — same
 * pattern `<OverviewChartWidget>` uses for its primary / secondary
 * metric pickers.
 */

import { useState } from 'react'
import {
  ArrowSquareOut,
  CaretDown,
  Warning,
} from '@phosphor-icons/react'
import { SkeletonRows } from '../(components)/WidgetSkeleton'
import { BaseWidget } from '../(components)/BaseWidget'
import { WidgetTileHeader } from '../(components)/WidgetTileHeader'
import { FetchErrorBadge } from '../live-value/LiveValueWidget'
import { ReassignConnectionDialog } from '../(components)/ReassignConnectionDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConnectionMissingError, type SentryIssue } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'
import type {
  SentryIssuesPeriod,
  SentryIssuesSort,
} from '@/app/hub/(components)/widgets/data/useSentryIssues'
import type { Widget } from '@/types/widget'

const PERIOD_LABELS: Record<SentryIssuesPeriod, string> = {
  '24h': 'Last 24 hours',
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}
const PERIOD_OPTIONS: SentryIssuesPeriod[] = ['24h', '7d', '30d', '90d']

const SORT_LABELS: Record<SentryIssuesSort, string> = {
  recent:   'Recent',
  frequent: 'Most frequent',
}
const SORT_OPTIONS: SentryIssuesSort[] = ['recent', 'frequent']

const fmt = new Intl.NumberFormat('en-US')

/**
 * Per-level dot — Sentry colour-codes errors by severity. Levels we
 * care about: `error` / `fatal` (red), `warning` (amber), `info` /
 * `debug` (slate). Anything unknown gets the slate fallback so the
 * UI doesn't break when Sentry adds a new level we haven't seen.
 */
function levelColor(level: string): string {
  switch (level) {
    case 'fatal':
    case 'error':   return 'bg-rose-500'
    case 'warning': return 'bg-amber-500'
    case 'info':
    case 'debug':   return 'bg-slate-400'
    default:        return 'bg-slate-400'
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function IssueRow({ issue }: { issue: SentryIssue }) {
  return (
    <a
      href={issue.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 py-2.5 border-b border-stroke last:border-b-0 hover:bg-hover-fill transition-colors -mx-4 px-4"
    >
      <span
        className={`shrink-0 mt-1.5 inline-block w-1.5 h-1.5 rounded-full ${levelColor(
          issue.level,
        )}`}
        aria-label={`level: ${issue.level}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {issue.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <span className="font-medium text-muted-foreground">{fmt.format(parseInt(issue.count, 10) || 0)}</span>
          <span>events</span>
          <span aria-hidden>·</span>
          <span>last seen {timeAgo(issue.lastSeen)}</span>
        </div>
      </div>
      <ArrowSquareOut
        size={12}
        weight="bold"
        className="shrink-0 mt-1 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors"
      />
    </a>
  )
}

interface SentryIssuesWidgetProps {
  view: Widget
  onUntrack?: (id: string) => void
  issues: SentryIssue[] | null
  loading: boolean
  error: ViewResourceError | null
  /** Current filter values — usually read from `view.config` via
   *  `readSentryFilters(view)` by the caller. */
  period: SentryIssuesPeriod
  sort: SentryIssuesSort
  /** Fired when the user picks a different filter. Caller persists
   *  via `ALGORITHM.updateView` (the change handler below does it). */
  onFiltersChange?: (next: { period: SentryIssuesPeriod; sort: SentryIssuesSort }) => void
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  onConnectionAssigned?: (updated: Widget) => void
  chromeless?: boolean
  dense?: boolean
}

export function SentryIssuesWidget({
  view,
  onUntrack,
  issues,
  loading,
  error,
  period,
  sort,
  onFiltersChange,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
  chromeless = false,
  dense = false,
}: SentryIssuesWidgetProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  // Local optimistic copy so the dropdown UI updates instantly even
  // while the persistent `updateView` PATCH is in flight. Mirrors
  // `OverviewChartWidget`'s primary/secondary metric handling.
  const [localPeriod, setLocalPeriod] = useState<SentryIssuesPeriod>(period)
  const [localSort, setLocalSort] = useState<SentryIssuesSort>(sort)

  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing

  // `persist` is purely a local-state + caller-hook update. The real
  // renderer (`WidgetRenderer`) supplies an `onFiltersChange` that
  // PATCHes `view.config` via `ALGORITHM.updateView`; the demo passes
  // a no-op so picker changes show up visually without hitting the
  // (unauthenticated) demo backend. Keeping the API call out of this
  // card means demo + real share the same component without a
  // `readOnly` flag.
  const persist = (next: {
    period: SentryIssuesPeriod
    sort: SentryIssuesSort
  }) => {
    setLocalPeriod(next.period)
    setLocalSort(next.sort)
    onFiltersChange?.(next)
  }

  return (
    <>
      <BaseWidget
        className="col-span-2 row-span-2"
        variant={chromeless ? 'borderless' : 'default'}
        header={
          <WidgetTileHeader
            name={view.name}
            connectionType={view.connectionType}
            connectionLabel="Sentry"
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
            view={view}
            onUpdated={onConnectionAssigned}
          />
        }
        body={
          <>
            <div data-no-dnd="true" className="px-4 pt-1 pb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-stroke bg-white px-2 py-1 text-xs text-foreground hover:bg-hover-fill transition-colors">
                  {PERIOD_LABELS[localPeriod]}
                  <CaretDown size={9} weight="bold" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {PERIOD_OPTIONS.map(p => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => persist({ period: p, sort: localSort })}
                      className="text-sm"
                    >
                      {PERIOD_LABELS[p]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span aria-hidden>·</span>

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-stroke bg-white px-2 py-1 text-xs text-foreground hover:bg-hover-fill transition-colors">
                  {SORT_LABELS[localSort]}
                  <CaretDown size={9} weight="bold" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {SORT_OPTIONS.map(s => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => persist({ period: localPeriod, sort: s })}
                      className="text-sm"
                    >
                      {SORT_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div data-no-dnd="true" className="flex-1 overflow-y-auto min-h-0 px-4 pb-3">
              {loading ? (
                <SkeletonRows count={5} rowClassName="h-9" />
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
                <div className="py-2"><FetchErrorBadge message="Couldn't load errors" /></div>
              ) : issues && issues.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                  <Warning size={18} weight="bold" className="text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">
                    No unresolved errors in this period.
                  </p>
                </div>
              ) : issues ? (
                issues.map(i => <IssueRow key={i.id} issue={i} />)
              ) : null}
            </div>
          </>
        }
      />

      <ReassignConnectionDialog
        view={view}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onAssigned={onConnectionAssigned}
      />
    </>
  )
}
