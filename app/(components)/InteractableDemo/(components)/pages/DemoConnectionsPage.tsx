'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { useDemoContext } from '../context/DemoContext'
import { DemoCreateConnectionModal } from '../DemoCreateConnectionModal'
import { DemoDashboardHeader } from '../DemoDashboardHeader'
import type { DemoConnection } from '../context/DemoContext'

function ConnectionRow({
  connection,
  onDelete,
}: {
  connection: DemoConnection
  onDelete: () => void
}) {
  return (
    <div className="group flex items-center justify-between gap-2 rounded-lg border border-stroke bg-white px-3 py-2.5 transition-colors hover:bg-hover-fill/40">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <ConnectionIcon type={connection.type} size={16} className="text-muted-foreground" />
        <span className="truncate text-sm font-medium">{connection.name}</span>
      </div>
      <div className="shrink-0 md:opacity-0 md:group-hover:opacity-100">
        <button
          type="button"
          onClick={onDelete}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
          title="Delete"
        >
          <Trash size={14} weight="regular" />
        </button>
      </div>
    </div>
  )
}

export function DemoConnectionsPage() {
  const { connections, currentProjectId, deleteConnection } = useDemoContext()
  const [createOpen, setCreateOpen] = useState(false)

  const scopedConnections = useMemo(() => {
    if (!currentProjectId) return connections
    return connections.filter(
      c => c.projectId === currentProjectId || c.projectId === null,
    )
  }, [connections, currentProjectId])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DemoDashboardHeader />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-lg font-semibold text-foreground">Connections</h1>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary/90 md:h-10 md:px-4 md:text-sm"
              >
                <Plus size={14} weight="bold" />
                Add connection
              </button>
            </div>

            <div className="space-y-2">
              {scopedConnections.map(conn => (
                <ConnectionRow
                  key={conn.id}
                  connection={conn}
                  onDelete={() => deleteConnection(conn.id)}
                />
              ))}
              {scopedConnections.length === 0 && (
                <p className="px-1 py-4 text-sm text-subtle">
                  No connections yet — click Add connection to start.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <DemoCreateConnectionModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
