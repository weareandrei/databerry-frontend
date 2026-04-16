'use client'

import { Trash } from '@phosphor-icons/react'
import { ConnectionIcon } from './ConnectionIcon'
import type { Connection } from '@/types/connection'

interface ConnectionCardProps {
  connection: Connection
  onDelete: (id: string) => void
}

export function ConnectionCard({ connection, onDelete }: ConnectionCardProps) {
  return (
    <div className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <ConnectionIcon type={connection.type} size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium truncate">{connection.name}</span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
        <button
          onClick={() => onDelete(connection.id)}
          className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
