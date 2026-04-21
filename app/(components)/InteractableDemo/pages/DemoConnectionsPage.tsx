'use client'

import { Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { useDemoContext } from '../context/DemoContext'
import type { DemoConnection } from '../context/DemoContext'

function ConnectionRow({
  connection,
  onDelete,
}: {
  connection: DemoConnection
  onDelete: () => void
}) {
  return (
    <div className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <ConnectionIcon type={connection.type} size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium truncate">{connection.name}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 shrink-0">
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash size={14} weight="thin" />
        </button>
      </div>
    </div>
  )
}

export function DemoConnectionsPage() {
  const { connections, createConnection, deleteConnection } = useDemoContext()

  return (
    <div className="flex-1 overflow-y-scroll bg-white p-6 pt-12 md:pt-6">
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <Button size="sm" className="gap-1.5" onClick={createConnection}>
          <Plus size={15} weight="thin" />
          Add connection
        </Button>
      </div>

      <div className="space-y-2">
        {connections.map(conn => (
          <ConnectionRow
            key={conn.id}
            connection={conn}
            onDelete={() => deleteConnection(conn.id)}
          />
        ))}
        {connections.length === 0 && (
          <p className="text-sm text-muted-foreground">No connections yet.</p>
        )}
      </div>
    </div>
  )
}
