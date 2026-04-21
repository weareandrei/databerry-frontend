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

function usePinnedLiveValue(view: View, selectedDate: string) {
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
    let req: Promise<{ value: string }>
    if (isStripeManualLive) req = ALGORITHM.getStripeManualLiveValue(view.connectionId, view.type, selectedDate)
    else if (isCalendlyLive) req = ALGORITHM.getCalendlyLiveValue(view.connectionId, view.type, selectedDate)
    else if (isPosthogLive) req = ALGORITHM.getPosthogLiveValue(view.connectionId, view.id, selectedDate)
    else req = ALGORITHM.getGoogleAnalyticsLiveValue(view.connectionId, view.type, selectedDate)
    req
      .then(res => setLiveValue(res.value))
      .catch(err => setLiveError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setLiveLoading(false))
  }, [view.connectionId, view.type, isLive, selectedDate, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    if (isLive && view.connectionId) setRefreshTick(t => t + 1)
  }, [isLive, view.connectionId])

  return { liveValue: isLive ? liveValue : null, liveLoading, liveError, refresh: isLive ? refresh : undefined }
}

function PinnedViewCard({
  view,
  projectName,
  selectedDate,
  onUnpin,
}: {
  view: View
  projectName?: string
  selectedDate: string
  onUnpin: (id: string) => void
}) {
  const { liveValue, liveLoading, liveError, refresh } = usePinnedLiveValue(view, selectedDate)
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
  const selectedDate = useSelector((s: RootState) => s.ui.globalDateFrom)

  return (
    <div className="shrink-0 rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
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
                selectedDate={selectedDate}
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
