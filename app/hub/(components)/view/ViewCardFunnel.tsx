'use client'

import { useState } from 'react'
import { ArrowsClockwise, ArrowDown } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import { ConnectionMissingError, type PosthogFunnelStep } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'
import type { View } from '@/types/view'

// Shared formatter so step counts and drop-off counts are consistent.
const fmt = new Intl.NumberFormat('en-US')
const fmtPct = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`

function FunnelBar({
  step,
  startCount,
  prevCount,
  isFirst,
}: {
  step: PosthogFunnelStep
  startCount: number
  prevCount: number
  isFirst: boolean
}) {
  // Bar width is `count / startCount`, clamped to [3%, 100%] so the visual
  // doesn't disappear on near-zero conversion (still want to read the label
  // even if the bar is barely there).
  const widthPct = startCount > 0 ? Math.max(3, (step.count / startCount) * 100) : 0
  const dropOff = isFirst ? 0 : prevCount - step.count

  return (
    <div className="flex flex-col gap-1">
      {!isFirst && (
        <div className="flex items-center gap-1.5 pl-2 text-xs text-muted-foreground">
          <ArrowDown size={11} weight="bold" />
          <span className="tabular-nums">
            {fmtPct(step.conversionFromPrev)} from previous · {fmt.format(dropOff)} dropped
          </span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="w-32 shrink-0 truncate text-sm font-medium" title={step.name}>
          {step.name}
        </div>
        <div className="flex-1 relative h-7 bg-black/[0.04] rounded-md overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-brand/15 border-r-2 border-brand transition-[width]"
            style={{ width: `${widthPct}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <span className="text-xs font-medium tabular-nums">{fmt.format(step.count)}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {fmtPct(step.conversionFromStart)}
            </span>
          </div>
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
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  onConnectionAssigned?: (updated: View) => void
}

export function ViewCardFunnel({
  view,
  onUntrack,
  steps,
  loading,
  error,
  historical = false,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
}: ViewCardFunnelProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing
  const startCount = steps?.[0]?.count ?? 0

  return (
    <>
      <ViewWrapper className="w-full">
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

        <div className="px-4 pb-4 mt-2 flex flex-col gap-3">
          {historical ? (
            <p className="text-xs text-muted-foreground py-2">
              Live data only — unavailable for past dates.
            </p>
          ) : loading ? (
            <div className="flex items-center gap-1.5 py-3">
              <ArrowsClockwise size={13} weight="bold" className="text-muted-foreground animate-spin" />
              <span className="text-xs text-muted-foreground">Loading funnel…</span>
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
            <FetchErrorBadge message="Couldn't load funnel" />
          ) : steps && steps.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Funnel needs at least 2 steps. Edit the view to configure.
            </p>
          ) : steps ? (
            steps.map((s, i) => (
              <FunnelBar
                key={`${s.name}-${i}`}
                step={s}
                startCount={startCount}
                prevCount={i === 0 ? s.count : steps[i - 1].count}
                isFirst={i === 0}
              />
            ))
          ) : null}
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
