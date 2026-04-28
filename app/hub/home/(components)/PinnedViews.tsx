'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { PushPin, ArrowsClockwise } from '@phosphor-icons/react'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardOverviewChart } from '@/app/hub/(components)/view/ViewCardOverviewChart'
import { ViewCardOverviewSources } from '@/app/hub/(components)/view/ViewCardOverviewSources'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { ALGORITHM, IntegrationReauthError } from '@/lib/api'
import type { RootState } from '@/store'
import type { View } from '@/types/view'
import type { Project } from '@/types/project'

// Pairs pinned composite views by projectId so each project's chart + sources
// render side-by-side (same layout as the project page). Order is stable in
// the order the first composite appears in `pins`, so user-arranged pins keep
// their intended position.
function groupCompositesByProject(
  composites: View[],
): { projectId: string; chart?: View; sources?: View }[] {
  const byProject = new Map<string, { projectId: string; chart?: View; sources?: View }>()
  for (const v of composites) {
    const key = v.projectId
    if (!byProject.has(key)) byProject.set(key, { projectId: key })
    const bucket = byProject.get(key)!
    if (v.type === 'project_overview') bucket.chart = v
    else if (v.type === 'project_overview_sources') bucket.sources = v
  }
  return Array.from(byProject.values())
}

// Stripe data is now stored in Supabase (see stripe/sync), so every Stripe
// view type — manual or OAuth Connect — is "live" in the sense that the
// /stripe/views/live-value endpoint is fast (Supabase read, not Stripe API).
// We previously only refreshed `stripe_revenue_today` for `stripe_manual`;
// that distinction collapses now.
const STRIPE_LIVE_TYPES = ['stripe_revenue_today', 'stripe_gross_today', 'stripe_gross']
const CALENDLY_LIVE_TYPES = ['calendly_meetings_today']
const GA_LIVE_TYPES = ['ga_active_users', 'ga_users_today', 'ga_sessions_today', 'ga_pageviews_today']

function usePinnedLiveValue(view: View, dateFrom: string, dateTo: string) {
  const isStripeLive =
    (view.connectionType === 'stripe_manual' || view.connectionType === 'stripe') &&
    STRIPE_LIVE_TYPES.includes(view.type)
  const isCalendlyLive = view.connectionType === 'calendly' && CALENDLY_LIVE_TYPES.includes(view.type)
  const isGALive = view.connectionType === 'google_analytics' && GA_LIVE_TYPES.includes(view.type)
  const isPosthogLive = view.connectionType === 'posthog'
  const isLive = isStripeLive || isCalendlyLive || isGALive || isPosthogLive

  const [liveValue, setLiveValue] = useState<string | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  // Keep the typed error so ViewCard can render the inline reconnect prompt
  // when the OAuth refresh token is dead (`IntegrationReauthError`) instead
  // of the generic "Fetch failed" badge.
  const [liveError, setLiveError] = useState<string | IntegrationReauthError | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!isLive || !view.connectionId) return
    setLiveLoading(true)
    setLiveError(null)
    let req: Promise<{ value: string | null; unavailable?: boolean }>
    if (isStripeLive) req = ALGORITHM.getStripeManualLiveValue(view.connectionId, view.type, dateFrom, dateTo)
    else if (isCalendlyLive) req = ALGORITHM.getCalendlyLiveValue(view.connectionId, view.type, dateFrom, dateTo)
    else if (isPosthogLive) req = ALGORITHM.getPosthogLiveValue(view.connectionId, view.id, dateFrom, dateTo)
    else req = ALGORITHM.getGoogleAnalyticsLiveValue(view.connectionId, view.type, dateFrom, dateTo)
    req
      .then(res => setLiveValue(res.unavailable ? null : res.value))
      .catch(err => {
        if (err instanceof IntegrationReauthError) setLiveError(err)
        else setLiveError(err instanceof Error ? err.message : 'Failed to fetch')
      })
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
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)

  // Composite "project overview" views (chart + sources) are full-width cards
  // and don't fit the 140px pinned grid — they get their own row above the
  // regular pins, mirroring the layout used on the Project page. Regular
  // single-metric pins use the existing tile grid.
  const compositePins = pins.filter(
    p => p.type === 'project_overview' || p.type === 'project_overview_sources',
  )
  const regularPins = pins.filter(
    p => p.type !== 'project_overview' && p.type !== 'project_overview_sources',
  )

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
        <div className="p-5 flex flex-col gap-6">
          {compositePins.length > 0 && (
            // Composite row: groups each project's chart + sources pair into
            // a 5:2 layout (chart : sources) on xl+, stacking on smaller
            // screens. Standalone Sources is capped to roughly its paired
            // width — without the cap it would stretch across the full row,
            // which dwarfs the panel's content (a list of small chips).
            // Standalone Chart keeps the full row width — it's the wide one
            // and benefits from the extra space.
            <div className="flex flex-col gap-6">
              {groupCompositesByProject(compositePins).map(group => {
                const projectName = projects.find(p => p.id === group.projectId)?.name
                const both = !!(group.chart && group.sources)
                if (both) {
                  return (
                    <div
                      key={group.projectId}
                      className="grid grid-cols-1 xl:grid-cols-[5fr_2fr] gap-4"
                    >
                      <ViewCardOverviewChart
                        key={group.chart!.id}
                        view={group.chart!}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        mode={mode}
                        projectName={projectName}
                        onPin={unpinView}
                      />
                      <ViewCardOverviewSources
                        key={group.sources!.id}
                        view={group.sources!}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        projectName={projectName}
                        onPin={unpinView}
                      />
                    </div>
                  )
                }
                if (group.chart) {
                  return (
                    <ViewCardOverviewChart
                      key={group.chart.id}
                      view={group.chart}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      mode={mode}
                      projectName={projectName}
                      onPin={unpinView}
                    />
                  )
                }
                // Standalone Sources/Users — left-aligned, capped at the
                // paired-state width (2/7 of the row ≈ 28%, with a sensible
                // floor for narrower laptop widths so the card stays usable).
                return (
                  <div
                    key={group.projectId}
                    className="w-full xl:max-w-[28%] xl:min-w-[300px]"
                  >
                    <ViewCardOverviewSources
                      key={group.sources!.id}
                      view={group.sources!}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      projectName={projectName}
                      onPin={unpinView}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {regularPins.length > 0 && (
            <div
              className="grid gap-y-6 gap-x-4 grid-flow-dense grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6"
              style={{ gridAutoRows: '140px' }}
            >
              {regularPins.map(pin => {
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
      )}
    </div>
  )
}

export default PinnedViews
