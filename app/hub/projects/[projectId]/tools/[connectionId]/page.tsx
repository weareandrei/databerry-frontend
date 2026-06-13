'use client'

/**
 * `[project]/tools/[connectionId]` — every view in this project fed
 * by one specific connection (the "My tools" rows in the project
 * sidebar). Auto-positioned, no folders — those are Overview-only.
 */

import { useParams } from 'next/navigation'
import { ProjectFilteredViews } from '../../(components)/ProjectFilteredViews'
import { useDashboard } from '@/contexts/DashboardContext'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'

export default function ProjectToolPage() {
  const params = useParams()
  const connectionId = params.connectionId as string
  const { projects: projectsCtx, connections: connectionsCtx } = useDashboard()
  const project = projectsCtx.projects.find(p => p.id === (params.projectId as string))
  const connection = connectionsCtx.connections.find(c => c.id === connectionId)
  if (!project) return null

  const title = connection
    ? (CONNECTION_DISPLAY_NAMES[connection.type] ?? connection.name)
    : 'Tool'

  return (
    <ProjectFilteredViews
      project={project}
      title={title}
      filter={v => v.connectionId === connectionId}
      emptyText="No views are using this connection in this project yet."
    />
  )
}
