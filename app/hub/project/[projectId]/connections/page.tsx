'use client'

/**
 * `[project]/connections` — only the connections RELATED to this
 * project: scoped to it directly, plus Common ones (`projectId ==
 * null` serves every project — its views in this project run through
 * them, so hiding them here would misrepresent what the project
 * uses). The ALL-connections management surface stays at
 * `/hub/connections` (reachable from the icon rail).
 */

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { CardsThree } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionsList } from '@/app/hub/(components)/connections/ConnectionsList'
import { ConnectionDetailModal } from '@/app/hub/(components)/modals/ConnectionDetailModal'
import { BaseView } from '@/app/hub/(components)/views/(components)/BaseView'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'
import { ProjectPageShell } from '@/app/hub/project/(components)/ProjectPageShell'
import { ProjectScrollBody } from '@/app/hub/project/(components)/ProjectScrollBody'
import type { Connection } from '@/types/connection'

export default function ProjectConnectionsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { connections, projects: projectsCtx } = useDashboard()
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)

  const project = projectsCtx.projects.find(p => p.id === projectId)

  const projectConnections = connections.connections.filter(
    c => c.projectId === projectId || c.projectId == null,
  )

  if (!project) return null

  return (
    <ProjectPageShell
      project={project}
      pageLabel="Connections"
      pageIcon={CardsThree}
      showCreateViewButton={false}
      showCreateConnectionButton
      onCreateConnection={() => connections.openModal(null)}
      showDateSelect={false}
      showProjectMenu={false}
    >
      <ProjectScrollBody>
        <ConnectionDetailModal
          connection={selectedConnection}
          onClose={() => {
            setSelectedConnection(null)
            connections.loadConnections()
          }}
        />

        <ViewWrapper>
          <BaseView
            body={
              <ConnectionsList
                connections={projectConnections}
                projects={projectsCtx.projects}
                loading={connections.loading}
                emptyText="No connections serve this project yet."
                onSelect={setSelectedConnection}
                onDelete={connections.deleteConnection}
                onReassign={connections.reassignProject}
                onReloadStripe={connections.reloadStripe}
              />
            }
          />
        </ViewWrapper>
      </ProjectScrollBody>
    </ProjectPageShell>
  )
}
