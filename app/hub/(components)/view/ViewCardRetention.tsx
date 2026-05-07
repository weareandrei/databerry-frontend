'use client'

import { useState } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import { ConnectionMissingError, type PosthogRetentionRow } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'
import type { View } from '@/types/view'

// Pure-CSS heatmap. We avoid pulling in a chart lib for what's essentially
// a small table — Tailwind's emerald scale gives us a clean 8-step gradient.
// Mapping retention% to color: <10% → bg-emerald-50, ≥80% → bg-emerald-600.
function colorForPct(pct: number): string {
  if (pct >= 0.8) return 'bg-emerald-600 text-white'
  if (pct >= 0.6) return 'bg-emerald-500 text-white'
  if (pct >= 0.45) return 'bg-emerald-400 text-emerald-900'
  if (pct >= 0.3) return 'bg-emerald-300 text-emerald-900'
  if (pct >= 0.2) return 'bg-emerald-200 text-emerald-900'
  if (pct >= 0.1) return 'bg-emerald-100 text-emerald-900'
  if (pct > 0) return 'bg-emerald-50 text-emerald-900'
  // Distinguish a true zero (cohort had no returns) from a missing future
  // cell — caller passes `null` for the latter, handled separately.
  return 'bg-grey-light text-muted-foreground'
}

const fmtPct = (v: number) => `${(v * 100).toFixed(v >= 1 ? 0 : v >= 0.1 ? 0 : 1)}%`

// "Apr 23" / "Apr 23 → Apr 29" depending on period; concise enough to fit
// the leftmost column without wrapping.
function formatCohortLabel(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface ViewCardRetentionProps {
  view: View
  onUntrack?: (id: string) => void
  cohorts: PosthogRetentionRow[] | null
  periodLabel: 'day' | 'week' | null
  loading: boolean
  error: ViewResourceError | null
  /**
   * @deprecated Card always renders retention now (PostHog backend
   * serves any date range). Kept on the props for backward
   * compatibility; remove once existing call sites stop passing it.
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
}

export function ViewCardRetention({
  view,
  onUntrack,
  cohorts,
  periodLabel,
  loading,
  error,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
  chromeless = false,
}: ViewCardRetentionProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing

  // Column count = max returns array length across cohorts (the matrix is
  // rectangular per the backend; this is just defensive).
  const colCount = cohorts?.reduce((max, c) => Math.max(max, c.returns.length), 0) ?? 0
  const colHeader = periodLabel === 'week' ? 'Week' : 'Day'

  return (
    <>
      <ViewWrapper className="w-full" variant={chromeless ? 'borderless' : 'default'}>
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
        />

        <div className="px-4 pb-4 mt-2">
          {loading ? (
            <div className="flex items-center gap-1.5 py-3">
              <ArrowsClockwise size={13} weight="bold" className="text-muted-foreground animate-spin" />
              <span className="text-xs text-muted-foreground">Loading retention…</span>
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
            <FetchErrorBadge message="Couldn't load retention" />
          ) : !cohorts || cohorts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Not enough activity yet — retention needs at least one full cohort period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left font-medium pr-2">Cohort</th>
                    <th className="text-right font-medium pr-2">Size</th>
                    {Array.from({ length: colCount }).map((_, i) => (
                      <th key={i} className="text-center font-medium tabular-nums min-w-[44px]">
                        {colHeader} {i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map(row => (
                    <tr key={row.startDate}>
                      <td className="text-left pr-2 tabular-nums whitespace-nowrap">
                        {formatCohortLabel(row.startDate)}
                      </td>
                      <td className="text-right pr-2 tabular-nums">{row.size}</td>
                      {row.returns.map((retained, k) => {
                        if (retained == null) {
                          return (
                            <td
                              key={k}
                              className="text-center text-muted-foreground/60 py-1 rounded"
                            >
                              —
                            </td>
                          )
                        }
                        const pct = row.size > 0 ? retained / row.size : 0
                        return (
                          <td
                            key={k}
                            className={`text-center tabular-nums py-1 rounded ${colorForPct(pct)}`}
                            title={`${retained} of ${row.size} users`}
                          >
                            {fmtPct(pct)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
