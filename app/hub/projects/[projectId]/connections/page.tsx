'use client'

/**
 * `[project]/connections` — only the connections RELATED to this
 * project: scoped to it directly, plus Common ones (`projectId ==
 * null` serves every project — its views in this project run through
 * them, so hiding them here would misrepresent what the project
 * uses). The ALL-connections management surface stays at
 * `/hub/connections` (reachable from the icon rail).
 *
 * Per the layout spec this page renders NO search/date chrome. Rows
 * come from the shared `<ConnectionsList>` (same component as the
 * workspace page) so clicking a row opens the same detail surface.
 */

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, SquaresFour } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionsList } from '@/app/hub/(components)/connections/ConnectionsList'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { ConnectionDetailModal } from '@/app/hub/(components)/modals/ConnectionDetailModal'
import type { Connection } from '@/types/connection'

export default function ProjectConnectionsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const router = useRouter()
  const { connections, projects: projectsCtx } = useDashboard()
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)

  const project = projectsCtx.projects.find(p => p.id === projectId)

  const projectConnections = connections.connections.filter(
    c => c.projectId === projectId || c.projectId == null,
  )

  if (!project) return null

  return (
    <>
      <MobileTopBar
        variant="project"
        projectName={`${project.name} — Connections`}
        onBack={() => router.push('/hub/home')}
      />
      <div className="flex-1 overflow-y-auto md:overflow-visible md:flex-none px-4 pt-4 pb-8 md:px-4 md:pt-4 md:pb-4 md:max-w-[1600px] flex flex-col">
        <ConnectionDetailModal
          connection={selectedConnection}
          onClose={() => {
            setSelectedConnection(null)
            connections.loadConnections()
          }}
        />

        <div className="flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
          <div className="hidden md:block">
            <SectionHeader
              icon={
                <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
                  <SquaresFour size={14} weight="bold" className="text-grey-darkest" />
                </span>
              }
              title={
                <span className="text-base font-bold text-grey-darkest">Connections</span>
              }
              rightSlot={
                <Button
                  className="rounded-full gap-1.5 px-4 bg-brand hover:bg-brand/90 text-white"
                  // Opens the same create-connection flow as the main
                  // page; the modal's own scope picker decides which
                  // project the new connection lands on.
                  onClick={() => connections.openModal(null)}
                >
                  <Plus size={14} weight="bold" />
                  Add connection
                </Button>
              }
              className="bg-main"
            />
          </div>

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
        </div>
      </div>
    </>
  )
}
