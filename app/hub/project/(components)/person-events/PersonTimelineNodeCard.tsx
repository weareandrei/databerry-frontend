'use client'

import type { TimelineRenderNodeProps } from '@/components/TimelineView'
import {
  isPageDwell,
  type PersonTimelineNodeData,
} from '../personPageSessions'
import { PageDwellCard } from './PageDwellCard'
import { PersonEventCard } from './PersonEventCard'

export function PersonTimelineNodeCard({
  data,
  expanded,
  onToggle,
  primarySpan,
}: {
  data: PersonTimelineNodeData
  expanded: boolean
  onToggle: () => void
  primarySpan: number
}) {
  if (isPageDwell(data)) {
    return (
      <PageDwellCard
        session={data}
        expanded={expanded}
        onToggle={onToggle}
        primarySpan={primarySpan}
      />
    )
  }
  return <PersonEventCard ev={data.event} expanded={expanded} onToggle={onToggle} />
}

export function renderPersonTimelineNode(props: TimelineRenderNodeProps<PersonTimelineNodeData>) {
  return (
    <PersonTimelineNodeCard
      data={props.node.data}
      expanded={props.expanded}
      onToggle={props.onToggle}
      primarySpan={props.primarySpan}
    />
  )
}
