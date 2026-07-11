'use client'

/**
 * Shared connections list — the rows used by BOTH the workspace
 * connections page (`/hub/connections`, all connections) and the
 * project-scoped one (`/hub/project/[id]/connections`). Extracted
 * because the two pages had drifted into ~80 duplicated lines of
 * row markup.
 *
 * Each row: type icon, name + project-scope pill, type/date caption,
 * hover-revealed actions (optional Stripe re-sync menu + delete).
 * Clicking the row opens the caller's detail surface.
 */

import { ArrowsClockwise, DotsThreeVertical, Trash } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { ProjectScopePill } from '@/app/hub/connections/(components)/ProjectScopePill'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import type { Connection } from '@/types/connection'
import type { Project } from '@/types/project'

const isStripeType = (type: string) => type === 'stripe' || type === 'stripe_manual'

interface ConnectionsListProps {
  connections: Connection[]
  projects: Project[]
  loading: boolean
  emptyText: string
  onSelect: (connection: Connection) => void
  onDelete: (connectionId: string) => void
  onReassign: (connectionId: string, projectId: string | null) => void
  /** When provided, Stripe rows get a 3-dots menu with a
   *  "Refresh data from Stripe" action. */
  onReloadStripe?: (connectionId: string) => void
}

export function ConnectionsList({
  connections,
  projects,
  loading,
  emptyText,
  onSelect,
  onDelete,
  onReassign,
  onReloadStripe,
}: ConnectionsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
      </div>
    )
  }
  if (connections.length === 0) {
    return <p className="text-sm text-subtle px-4 py-5">{emptyText}</p>
  }
  return (
    <div className="divide-y divide-stroke">
      {connections.map(connection => (
        <ConnectionRow
          key={connection.id}
          connection={connection}
          projects={projects}
          onSelect={onSelect}
          onDelete={onDelete}
          onReassign={onReassign}
          onReloadStripe={onReloadStripe}
        />
      ))}
    </div>
  )
}

interface ConnectionRowProps {
  connection: Connection
  projects: Project[]
  onSelect: (connection: Connection) => void
  onDelete: (connectionId: string) => void
  onReassign: (connectionId: string, projectId: string | null) => void
  onReloadStripe?: (connectionId: string) => void
}

function ConnectionRow({
  connection,
  projects,
  onSelect,
  onDelete,
  onReassign,
  onReloadStripe,
}: ConnectionRowProps) {
  // null projectId == "Common" (shared across every project the user
  // owns). Type-specific pills (GA property, Vercel project) live in
  // the detail modal — the row shows exactly one badge: the scope.
  const projectName = connection.projectId
    ? (projects.find(p => p.id === connection.projectId)?.name ?? 'Project')
    : 'Common'

  return (
    <div
      onClick={() => onSelect(connection)}
      className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-surface"
    >
      <div className="flex items-center gap-3 min-w-0">
        <ConnectionIcon type={connection.type} size={20} className="text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground truncate">{connection.name}</p>
            <ProjectScopePill
              connection={connection}
              projectName={projectName}
              projects={projects}
              onReassign={id => onReassign(connection.id, id)}
            />
          </div>
          <p className="text-xs text-subtle">
            {CONNECTION_DISPLAY_NAMES[connection.type] ?? connection.type} · Connected{' '}
            {new Date(connection.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onReloadStripe && isStripeType(connection.type) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={e => e.stopPropagation()}
              // `md:opacity-0 md:group-hover:opacity-100` keeps the
              // desktop hover-reveal behaviour but always shows the
              // button on mobile (no hover on touch).
              // `aria-expanded:opacity-100` covers the open-menu-
              // without-cursor case.
              className="md:opacity-0 md:group-hover:opacity-100 aria-expanded:opacity-100 flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded text-subtle hover:text-foreground transition-colors cursor-pointer"
              title="More actions"
            >
              <DotsThreeVertical size={16} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={e => {
                  e.stopPropagation()
                  onReloadStripe(connection.id)
                }}
                className="gap-2 text-sm"
              >
                <ArrowsClockwise size={12} weight="bold" />
                <span>Refresh data from Stripe</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          onClick={e => {
            e.stopPropagation()
            onDelete(connection.id)
          }}
          className="md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded text-subtle hover:text-destructive transition-colors cursor-pointer"
          title="Delete"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
