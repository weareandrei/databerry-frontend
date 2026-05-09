'use client'

/**
 * ViewScopePicker — small dropdown rendered in the Create-View modal's
 * `headerLeft` slot (next to the close button on the right).
 *
 * Acts as the **source of truth** for two things:
 *  1. Which connections show up as enabled bars in the picker.
 *  2. Which `projectId` the new view will be saved to.
 *
 * Special values (encoded in `ViewScope`):
 *  - `'common'`   → `connection.projectId === null`. Bars enable when a
 *                   shared / common connection of the right type exists.
 *                   New view is saved with `projectId = null`.
 *  - `'all'`      → no filter on bars. New view falls back to the
 *                   `defaultProjectId` (the project the modal opened from).
 *  - any project id → exact-match filter on `connection.projectId`. The
 *                   project's name is shown as the trigger label. New
 *                   view is saved with this `projectId`.
 *
 * Initial scope = the project the modal opened from (`defaultProjectId`).
 * If there's no default (e.g. opened from a global "+" button), we
 * default to `'all'`.
 *
 * Visual: small pill, sized to balance against the close button on the
 * right of the dialog header. Reuses the project-icon dot we already
 * use elsewhere for project chips.
 */

import * as React from 'react'
import { CaretDown, GlobeHemisphereWest, FolderOpen, Buildings } from '@phosphor-icons/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/project'

export type ViewScope = { kind: 'common' } | { kind: 'all' } | { kind: 'project'; projectId: string }

export interface ViewScopePickerProps {
  scope: ViewScope
  onScopeChange: (next: ViewScope) => void
  projects: Project[]
  /** Currently-active "opened-from" project, if any. Used to label the
   *  'all' option ("All projects · saves to {name}") so the user knows
   *  where their view will land when they pick All. */
  defaultProjectId: string | null
}

/**
 * Returns the human-readable label for the trigger button. Pulled out
 * because the same logic is used inside the dropdown items (current
 * scope is shown checked).
 */
function scopeLabel(scope: ViewScope, projects: Project[]): string {
  if (scope.kind === 'common') return 'Common'
  if (scope.kind === 'all') return 'All projects'
  const project = projects.find(p => p.id === scope.projectId)
  return project?.name ?? 'Project'
}

function ScopeIcon({ scope }: { scope: ViewScope }) {
  if (scope.kind === 'common') return <GlobeHemisphereWest size={13} weight="bold" />
  if (scope.kind === 'all') return <Buildings size={13} weight="bold" />
  return <FolderOpen size={13} weight="bold" />
}

export function ViewScopePicker({
  scope,
  onScopeChange,
  projects,
  defaultProjectId,
}: ViewScopePickerProps) {
  const defaultProject = projects.find(p => p.id === defaultProjectId)

  const isSelected = (other: ViewScope): boolean => {
    if (scope.kind !== other.kind) return false
    if (scope.kind === 'project' && other.kind === 'project') {
      return scope.projectId === other.projectId
    }
    return true
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          // Sized to match the close-button pill on the right.
          // The dropdown trigger is the only header element with a
          // visible label, so we keep the chrome subtle.
          'inline-flex h-8 max-w-[180px] items-center gap-1.5 rounded-full border border-border/60 bg-background/95 px-2.5 text-[12px] font-medium shadow-sm transition-colors hover:bg-muted',
        )}
      >
        <span className="text-muted-foreground"><ScopeIcon scope={scope} /></span>
        <span className="truncate">{scopeLabel(scope, projects)}</span>
        <CaretDown size={11} className="shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuItem
          onClick={() => onScopeChange({ kind: 'common' })}
          className={cn(isSelected({ kind: 'common' }) && 'bg-muted/60')}
        >
          <GlobeHemisphereWest size={14} className="mr-1 text-muted-foreground" />
          <div className="flex flex-col">
            <span>Common</span>
            <span className="text-[11px] text-muted-foreground">Shared across projects</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onScopeChange({ kind: 'all' })}
          className={cn(isSelected({ kind: 'all' }) && 'bg-muted/60')}
        >
          <Buildings size={14} className="mr-1 text-muted-foreground" />
          <div className="flex flex-col">
            <span>All projects</span>
            <span className="text-[11px] text-muted-foreground">
              {defaultProject
                ? `Saves to ${defaultProject.name}`
                : 'No filter'}
            </span>
          </div>
        </DropdownMenuItem>
        {projects.length > 0 && <DropdownMenuSeparator />}
        {projects.map(project => (
          <DropdownMenuItem
            key={project.id}
            onClick={() =>
              onScopeChange({ kind: 'project', projectId: project.id })
            }
            className={cn(
              isSelected({ kind: 'project', projectId: project.id }) && 'bg-muted/60',
            )}
          >
            <FolderOpen size={14} className="mr-1 text-muted-foreground" />
            <span className="truncate">{project.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Pure helper — returns true when a given connection's `projectId`
 * matches the active scope. Exported so the modal can filter the
 * connection list without round-tripping through this component.
 *
 * Behavior per scope:
 *  - `'all'`     → no filter, every connection passes
 *  - `'common'`  → only `projectId == null` (shared / not project-bound)
 *  - `'project'` → connections scoped to that project **AND** common
 *                  (`projectId == null`) ones, since a "Common"
 *                  connection is by definition usable inside any
 *                  project. Showing only project-exclusive connections
 *                  surprised the user when, say, a single shared
 *                  Stripe key was meant to back views in every project.
 */
export function connectionMatchesScope(
  connection: { projectId?: string | null },
  scope: ViewScope,
): boolean {
  if (scope.kind === 'all') return true
  if (scope.kind === 'common') return connection.projectId == null
  // project scope: project-exclusive + common
  return (
    connection.projectId === scope.projectId || connection.projectId == null
  )
}

/**
 * Returns the `projectId` that should be written when creating a new
 * view under the current scope. Mirrors the user's accepted plan:
 *   - 'common'  → null
 *   - 'project' → that project's id
 *   - 'all'     → the original opened-from project (fallback target)
 */
export function projectIdForScope(
  scope: ViewScope,
  defaultProjectId: string | null,
): string | null {
  if (scope.kind === 'common') return null
  if (scope.kind === 'project') return scope.projectId
  return defaultProjectId
}
