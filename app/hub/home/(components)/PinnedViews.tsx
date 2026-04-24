'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { PushPin, ArrowsClockwise } from '@phosphor-icons/react'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { ALGORITHM } from '@/lib/api'
import type { RootState } from '@/store'
import type { View } from '@/types/view'
import type { Project } from '@/types/project'

const STRIPE_MANUAL_LIVE_TYPES = ['stripe_revenue_today']
const CALENDLY_LIVE_TYPES = ['calendly_meetings_today']
const GA_LIVE_TYPES = ['ga_active_users', 'ga_users_today', 'ga_sessions_today', 'ga_pageviews_today']

function usePinnedLiveValue(view: View, dateFrom: string, dateTo: string) {
  const isStripeManualLive = view.connectionType === 'stripe_manual' && STRIPE_MANUAL_LIVE_TYPES.includes(view.type)
  const isCalendlyLive = view.connectionType === 'calendly' && CALENDLY_LIVE_TYPES.includes(view.type)
  const isGALive = view.connectionType === 'google_analytics' && GA_LIVE_TYPES.includes(view.type)
  const isPosthogLive = view.connectionType === 'posthog'
  const isLive = isStripeManualLive || isCalendlyLive || isGALive || isPosthogLive

  const [liveValue, setLiveValue] = useState<string | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!isLive || !view.connectionId) return
    setLiveLoading(true)
    setLiveError(null)
    let req: Promise<{ value: string | null; unavailable?: boolean }>
    if (isStripeManualLive) req = ALGORITHM.getStripeManualLiveValue(view.connectionId, view.type, dateFrom, dateTo)
    else if (isCalendlyLive) req = ALGORITHM.getCalendlyLiveValue(view.connectionId, view.type, dateFrom, dateTo)
    else if (isPosthogLive) req = ALGORITHM.getPosthogLiveValue(view.connectionId, view.id, dateFrom, dateTo)
    else req = ALGORITHM.getGoogleAnalyticsLiveValue(view.connectionId, view.type, dateFrom, dateTo)
    req
      .then(res => setLiveValue(res.unavailable ? null : res.value))
      .catch(err => setLiveError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setLiveLoading(false))
  }, [view.connectionId, view.type, isLive, dateFrom, dateTo, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    if (isLive && view.connectionId) setRefreshTick(t => t + 1)
  }, [isLive, view.connectionId])

  return { liveValue: isLive ? liveValue : null, liveLoading, liveError, refresh: isLive ? refresh : undefined }
}

function PinnedViewCard({
  view,
  projectName,
  dateFrom,
  dateTo,
  onUnpin,
}: {
  view: View
  projectName?: string
  dateFrom: string
  dateTo: string
  onUnpin: (id: string) => void
}) {
  const { liveValue, liveLoading, liveError, refresh } = usePinnedLiveValue(view, dateFrom, dateTo)
  return (
    <ViewCard
      view={view}
      projectName={projectName}
      liveValue={liveValue}
      liveLoading={liveLoading}
      liveError={liveError}
      onRefresh={refresh}
      refreshing={liveLoading}
      onPin={() => onUnpin(view.id)}
      isPinned={true}
      // No onUntrack — hides the "Untrack" (delete) item; use "Unpin" instead
    />
  )
}

interface PinnedViewsProps {
  pins: View[]
  unpinView: (id: string) => void
  loading?: boolean
  projects?: Project[]
}

const PinnedViews = ({ pins, unpinView, loading = false, projects = [] }: PinnedViewsProps) => {
  const dateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const dateTo = useSelector((s: RootState) => s.ui.globalDateTo)

  // NOTE: no `overflow-hidden` on the wrapper. `overflow: hidden` on an
  // ancestor establishes a containing block for `position: sticky` children —
  // the sticky header then tries to stick relative to this wrapper instead of
  // the viewport, which breaks the intended "pin under the top bar"
  // behaviour. `ProjectView` doesn't clip, so it works; we match that here.
  // The rounded corners are preserved by giving the sticky header its own
  // `rounded-t-xl` so its `bg-main` doesn't paint past the wrapper's border.
  return (
    <div className="shrink-0 rounded-xl border border-stroke bg-white shadow-card">
      <SectionHeader
        icon={
          <span
            className="flex items-center justify-center rounded-full bg-white border border-stroke p-2"
            style={{ boxShadow: '2px 2px 5px rgba(0,0,0,0.05)' }}
          >
            <PushPin size={14} weight="bold" className="text-grey-darkest" />
          </span>
        }
        title={<span className="text-base font-bold text-grey-darkest">Pinned</span>}
        // Flush against the bottom of the global top bar (which has its own
        // `border-b` acting as the divider between the two sticky rows).
        // `rounded-t-xl` replaces the removed wrapper clip so the header's
        // top corners stay rounded when the section is at rest inside its
        // wrapper; once stuck, the corners sit against the page bg (same
        // colour as the header's `bg-main`), so they're visually neutral.
        className="sticky top-[74px] left-0 z-[10] rounded-t-xl"
      />
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
        </div>
      ) : pins.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-5">
          Pin a view to keep it here for quick access.
        </p>
      ) : (
        <div
          className="p-5 grid gap-y-6 gap-x-4 grid-flow-dense grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6"
          style={{ gridAutoRows: '140px' }}
        >
          {pins.map(pin => {
            const projectName = projects.find(p => p.id === pin.projectId)?.name
            return (
              <PinnedViewCard
                key={pin.id}
                view={pin}
                projectName={projectName}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onUnpin={unpinView}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PinnedViews
