'use client'

/**
 * Dispatcher tile for the demo. Picks the right `<ViewCard*>` variant
 * for a given `DemoView`'s `kind` and feeds it static mock data plus
 * fake handlers (untrack / pin) wired to the demo context above.
 *
 * Real-mode mirror is `<ViewCardRenderer>` in
 * `app/hub/(components)/view/renderers/`. The two stay close in
 * shape so any tile-level prop the real dispatcher gains can be
 * threaded here too.
 *
 * The composite-overview tiles (`overview-chart` /
 * `overview-sources`) are NOT rendered here — they live on the
 * project view directly because their props are richer (chart
 * payload + tab state etc.). This dispatcher handles the per-tile
 * cases that fit the tile-grid layout.
 */

import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardCustomerList } from '@/app/hub/(components)/view/ViewCardCustomerList'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import { ViewCardFunnel } from '@/app/hub/(components)/view/ViewCardFunnel'
import type { DemoView } from './context/demoSeedViews'
import type { View as RealView } from '@/types/view'

/**
 * Project a `DemoView` into the shape `<ViewCard*>` components
 * expect. The real components only consume a handful of fields
 * (`id`, `name`, `connectionType`, `type`, `value`, `isPinned`,
 * `connectionId`) — we leave the rest as defaults.
 */
function toRealView(v: DemoView): RealView {
  // Surface-level view type — surfaces in tile chrome (e.g. MRR
  // shows the date-range caption when type === 'stripe_mrr').
  let type = 'custom'
  if (v.kind === 'chart') type = v.viewType
  else if (v.kind === 'meetings') type = 'calendly_meetings_list'
  else if (v.kind === 'customers') type = 'stripe_top_customers'
  else if (v.kind === 'funnel') type = 'posthog_funnel'
  else if (v.kind === 'value' && v.viewType) type = v.viewType
  else if (v.kind === 'overview-chart') type = 'project_overview'
  else if (v.kind === 'overview-sources') type = 'project_overview_sources'

  return {
    id: v.id,
    name: v.name,
    projectId: v.projectId,
    folderId: v.folderId,
    connectionId: v.connectionId,
    connectionType: v.connectionType,
    type,
    config: {},
    value:
      v.kind === 'value' || v.kind === 'chart'
        ? v.mockValue ?? null
        : null,
    isPinned: v.pinned,
    userId: 'demo',
    createdAt: '',
  }
}

interface DemoViewCardProps {
  view: DemoView
  onUntrack: () => void
  onPin: () => void
  /**
   * Optional project-name pill rendered next to the tile title.
   * Pinned-views row uses this to disambiguate which project each
   * tile came from (the row mixes tiles from different projects, so
   * "Pageviews" alone is ambiguous between Acme and Side Project).
   * Inside a project page, the project context is already obvious
   * from the surrounding chrome — so the badge is omitted there.
   */
  projectName?: string
}

export function DemoViewCard({ view, onUntrack, onPin, projectName }: DemoViewCardProps) {
  const realView = toRealView(view)
  const handlePin = () => onPin()
  // Every demo tile renders in dense mode — the demo card is much
  // narrower than the real dashboard, so the standard 34 px icon +
  // `text-md` title makes the project pill wrap onto a third line.
  // Real tiles in `/hub/...` pass nothing → `dense` defaults to false
  // → existing dashboard pixels unchanged.
  const dense = true

  switch (view.kind) {
    case 'chart':
      return (
        <ViewCardChart
          view={realView}
          onUntrack={onUntrack}
          onPin={handlePin}
          isPinned={view.pinned}
          points={view.chartPoints}
          loading={false}
          error={null}
          total={view.chartTotal}
          projectName={projectName}
          dense={dense}
        />
      )

    case 'meetings':
      return (
        <ViewCardList
          view={realView}
          onUntrack={onUntrack}
          onPin={handlePin}
          isPinned={view.pinned}
          meetings={view.meetings}
          loading={false}
          error={null}
          projectName={projectName}
          dense={dense}
        />
      )

    case 'customers':
      return (
        <ViewCardCustomerList
          view={realView}
          onUntrack={onUntrack}
          onPin={handlePin}
          isPinned={view.pinned}
          customers={view.customers}
          loading={false}
          error={null}
          projectName={projectName}
          dense={dense}
        />
      )

    case 'funnel':
      return (
        <ViewCardFunnel
          view={realView}
          onUntrack={onUntrack}
          onPin={handlePin}
          isPinned={view.pinned}
          steps={view.steps}
          loading={false}
          error={null}
          projectName={projectName}
          dense={dense}
        />
      )

    case 'value':
    default:
      // The default `<ViewCard>` tile — single number + optional date
      // range caption. Fits everything that doesn't have a richer
      // payload (MRR, PostHog event counters, page views, etc.).
      return (
        <ViewCard
          view={realView}
          onUntrack={onUntrack}
          onPin={handlePin}
          isPinned={view.pinned}
          liveValue={view.kind === 'value' ? view.mockValue : null}
          projectName={projectName}
          dense={dense}
        />
      )
  }
}
