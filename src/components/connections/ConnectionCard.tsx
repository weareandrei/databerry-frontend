'use client'

import {
  ChartLine,
  CreditCard,
  Bug,
  GitBranch,
  XLogo,
  RedditLogo,
  EnvelopeSimple,
  PlugsConnected,
  PushPin,
  Trash,
} from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { cn } from '@/lib/utils'
import type { Connection } from '@/types/connection'

const TYPE_ICONS: Record<string, React.ElementType> = {
  posthog: ChartLine,
  stripe: CreditCard,
  sentry: Bug,
  github: GitBranch,
  x: XLogo,
  reddit: RedditLogo,
  gmail: EnvelopeSimple,
  custom: PlugsConnected,
}

interface ConnectionCardProps {
  connection: Connection
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  const { connections: connectionsCtx } = useDashboard()
  const Icon = TYPE_ICONS[connection.type] ?? PlugsConnected

  return (
    <div className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Icon size={16} weight="thin" className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{connection.name}</span>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
        <button
          onClick={() => connectionsCtx.togglePin(connection.id)}
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground transition-colors',
            connection.isPinned && 'opacity-100 text-foreground'
          )}
          title={connection.isPinned ? 'Unpin' : 'Pin'}
        >
          <PushPin size={14} weight={connection.isPinned ? 'fill' : 'thin'} />
        </button>
        <button
          onClick={() => connectionsCtx.deleteConnection(connection.id)}
          className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash size={14} weight="thin" />
        </button>
      </div>
    </div>
  )
}
