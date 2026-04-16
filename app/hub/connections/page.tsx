'use client'

import { Suspense } from 'react'
import { PlugsConnected, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionIcon } from '@/components/connections/ConnectionIcon'
import { DashboardSectionWrapper } from '@/components/dashboard/shared/DashboardSectionWrapper'
import { useOAuthCallback } from '@/hooks/useOAuthCallback'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import type { Connection } from '@/types/connection'

function OAuthCallbacks() {
  useOAuthCallback('stripe')
  useOAuthCallback('calendly')
  return null
}

function ConnectionList({
  connections,
  onDelete,
}: {
  connections: Connection[]
  onDelete: (id: string) => void
}) {
  if (connections.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-grey-light">No connections in this project yet.</p>
    )
  }

  return (
    <div className="divide-y divide-stroke">
      {connections.map(connection => (
        <div
          key={connection.id}
          className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-main transition-colors"
        >
          <div className="flex items-center gap-3">
            <ConnectionIcon type={connection.type} size={20} className="text-grey-dark shrink-0" />
            <div>
              <p className="text-sm font-medium text-grey-dark">{connection.name}</p>
              <p className="text-xs text-grey-light">
                {CONNECTION_DISPLAY_NAMES[connection.type] ?? connection.type} · Connected{' '}
                {new Date(connection.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDelete(connection.id)}
            className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded text-grey-light hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash size={14} weight="bold" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function ConnectionsPage() {
  const { connections, projects } = useDashboard()

  // Group connections by project
  const byProject = projects.projects.map(project => ({
    project,
    connections: connections.connections.filter(c => c.projectId === project.id),
  }))

  const unassigned = connections.connections.filter(c => !c.projectId)

  return (
    <div className="p-8">
      <Suspense>
        <OAuthCallbacks />
      </Suspense>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your connected services and API keys.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => connections.openModal(null)}>
          <PlugsConnected size={15} weight="bold" />
          Add connection
        </Button>
      </div>

      {connections.connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <PlugsConnected size={32} weight="bold" className="text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No connections yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a connection to start pulling in data from external services.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {byProject.map(({ project, connections: projectConns }) => (
            <DashboardSectionWrapper
              key={project.id}
              icon={<PlugsConnected size={14} weight="bold" />}
              title={
                <span className="text-sm font-semibold">
                  Connections — {project.name}
                </span>
              }
            >
              <ConnectionList
                connections={projectConns}
                onDelete={connections.deleteConnection}
              />
            </DashboardSectionWrapper>
          ))}

          {unassigned.length > 0 && (
            <DashboardSectionWrapper
              icon={<PlugsConnected size={14} weight="bold" />}
              title={<span className="text-sm font-semibold">Connections — Unassigned</span>}
            >
              <ConnectionList
                connections={unassigned}
                onDelete={connections.deleteConnection}
              />
            </DashboardSectionWrapper>
          )}
        </div>
      )}
    </div>
  )
}
