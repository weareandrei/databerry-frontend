'use client'

/**
 * Demo connections page — shows the list of mock connections with a
 * trash button per row + an "Add connection" CTA that opens the
 * mock-only `<DemoCreateConnectionModal>`.
 *
 * Connections-row chrome is visually similar to the real
 * `/hub/connections` layout but at smaller scale. Tapping a row is
 * a no-op in the demo (the real ConnectionDetailModal pulls from
 * `useDashboard()` and isn't worth porting just for the demo).
 */

import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { useDemoContext } from '../context/DemoContext'
import { DemoCreateConnectionModal } from '../DemoCreateConnectionModal'
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
      {/*
        Always-visible trash on mobile (no hover events on touch).
        `md:opacity-0 md:group-hover:opacity-100` keeps the desktop
        hover-reveal style.
      */}
      <div className="md:opacity-0 md:group-hover:opacity-100 shrink-0">
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
  const { connections, deleteConnection } = useDemoContext()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto bg-background p-3 pt-8 md:pt-3">
      <div className="rounded-xl border bg-card overflow-hidden shadow-card">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
          <h1 className="text-sm font-bold text-foreground">Connections</h1>
          <Button
            size="sm"
            className="rounded-full gap-1 px-3 h-7"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={11} weight="bold" />
            <span className="text-xs">Add connection</span>
          </Button>
        </div>

        <div className="p-3 space-y-2">
          {connections.map(conn => (
            <ConnectionRow
              key={conn.id}
              connection={conn}
              onDelete={() => deleteConnection(conn.id)}
            />
          ))}
          {connections.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-2">
              No connections yet — click <span className="font-medium">Add connection</span> to start.
            </p>
          )}
        </div>
      </div>

      <DemoCreateConnectionModal
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}
