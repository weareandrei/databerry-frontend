'use client'

/**
 * Project-scope pill rendered next to a connection's name.
 *
 * Doubles as the dropdown trigger that lets the user reassign the
 * connection to a different project (or "Common" — shared across all
 * of the user's projects). Previously the trigger was a separate 14
 * px ⇄ icon next to the row's trash button: too discreet, users
 * couldn't find it. Folding the affordance into the badge means the
 * thing that LOOKS clickable now actually is — with a small caret
 * hint to signal "this opens a menu". Clicks `stopPropagation` so
 * the row's onClick (open detail modal) doesn't also fire.
 *
 * Shared between the main Connections list and the mobile-only MCP
 * Connections page, which otherwise would have re-implemented the
 * pill (and drifted out of sync).
 */

import { CaretDown, Check, Cube } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Connection } from '@/types/connection'
import type { Project } from '@/types/project'

interface ProjectScopePillProps {
  connection: Connection
  projectName: string
  projects: Project[]
  onReassign: (projectId: string | null) => void
}

export function ProjectScopePill({
  connection,
  projectName,
  projects,
  onReassign,
}: ProjectScopePillProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={e => e.stopPropagation()}
        className="flex items-center gap-1 text-[10px] border border-stroke rounded-full px-2 py-0.5 text-subtle leading-tight shrink-0 hover:bg-surface hover:text-foreground transition-colors cursor-pointer aria-expanded:bg-surface aria-expanded:text-foreground"
        title="Click to reassign to a different project"
      >
        <Cube size={9} weight="bold" />
        <span>{projectName}</span>
        <CaretDown size={9} weight="bold" className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onClick={e => e.stopPropagation()}
        className="min-w-[220px]"
      >
        <DropdownMenuItem
          onClick={e => {
            e.stopPropagation()
            onReassign(null)
          }}
          className="gap-2 text-sm"
        >
          <span className="w-4 shrink-0">
            {connection.projectId == null && <Check size={12} weight="bold" />}
          </span>
          <span className="flex-1">Common (shared)</span>
        </DropdownMenuItem>
        {projects.map(p => (
          <DropdownMenuItem
            key={p.id}
            onClick={e => {
              e.stopPropagation()
              onReassign(p.id)
            }}
            className="gap-2 text-sm"
          >
            <span className="w-4 shrink-0">
              {connection.projectId === p.id && <Check size={12} weight="bold" />}
            </span>
            <Cube size={12} weight="bold" className="shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{p.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
