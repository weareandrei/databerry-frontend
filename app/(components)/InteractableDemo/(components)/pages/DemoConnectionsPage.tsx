'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { BaseView } from '@/app/hub/(components)/views/(components)/BaseView'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'
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
    <div className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <ConnectionIcon type={connection.type} size={16} className="text-muted-foreground shrink-0" />
        <span className="truncate text-sm font-medium">{connection.name}</span>
      </div>
      <div className="shrink-0 md:opacity-0 md:group-hover:opacity-100">
        <button
          type="button"
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded text-subtle transition-colors hover:text-destructive md:h-7 md:w-7 cursor-pointer"
          title="Delete"
        >
          <Trash size={14} weight="bold" />
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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
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

          <ViewWrapper>
            <BaseView
              body={
                scopedConnections.length > 0 ? (
                  <div className="divide-y divide-stroke">
                    {scopedConnections.map(conn => (
                      <ConnectionRow
                        key={conn.id}
                        connection={conn}
                        onDelete={() => deleteConnection(conn.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-5 text-sm text-subtle">
                    No connections yet — click Add connection to start.
                  </p>
                )
              }
            />
          </ViewWrapper>
        </div>
      </div>

      <DemoCreateConnectionModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
