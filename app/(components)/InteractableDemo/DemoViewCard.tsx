'use client'

import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import type { DemoView, DemoConnection } from './context/DemoContext'
import type { View as RealView } from '@/types/view'

export function toRealView(v: DemoView, conn: DemoConnection | undefined): RealView {
  return {
    id: v.id,
    name: v.name,
    projectId: 'demo',
    folderId: v.folderId,
    connectionId: v.connectionId,
    connectionType: v.mockMeetings !== undefined ? 'calendly' : (conn?.type ?? 'custom'),
    type: v.chartPoints
      ? 'stripe_gross_today'
      : v.mockMeetings !== undefined
        ? 'calendly_meetings_list'
        : 'custom',
    config: {},
    value: v.mockValue,
    isPinned: v.pinned,
    userId: 'demo',
    createdAt: '',
  }
}

interface DemoViewCardProps {
  view: DemoView
  connection: DemoConnection | undefined
  onDelete: () => void
}

export function DemoViewCard({ view, connection, onDelete }: DemoViewCardProps) {
  const realView = toRealView(view, connection)

  if (view.chartPoints) {
    return (
      <ViewCardChart
        view={realView}
        onUntrack={onDelete}
        points={view.chartPoints}
        loading={false}
        error={null}
        total={view.chartTotal ?? null}
      />
    )
  }

  if (view.mockMeetings !== undefined) {
    return (
      <ViewCardList
        view={realView}
        onUntrack={onDelete}
        meetings={view.mockMeetings}
        loading={false}
        error={null}
      />
    )
  }

  return <ViewCard view={realView} onUntrack={onDelete} />
}
