'use client'

/**
 * 3-dot kebab menu at the top of the project sidebar.
 *   - Refresh all → re-fetches every view on the page at once
 *     (`broadcastViewRefresh`, wired by the caller).
 *   - Edit        → opens `EditProjectDialog` (name + website URL).
 *   - Delete      → opens `DeleteProjectDialog` (type-the-name-to-
 *     confirm alert dialog).
 *
 * Mirrors the pattern in `ViewHeader.tsx` (the per-tile kebab) so
 * project-level and view-level menus read as a family.
 */

import { ArrowsClockwise, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ProjectMenuProps {
  onRefreshAll: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ProjectMenu({ onRefreshAll, onEdit, onDelete }: ProjectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Project options"
        className="flex items-center justify-center w-8 h-8 rounded-full border border-stroke bg-white text-grey-dark shadow-sm hover:bg-black/[0.04] active:bg-black/[0.08] transition-colors"
      >
        <DotsThreeVertical size={16} weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onRefreshAll} className="text-sm gap-2">
          <ArrowsClockwise size={13} weight="bold" />
          Refresh all
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit} className="text-sm gap-2">
          <PencilSimple size={13} weight="bold" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-sm gap-2 text-destructive focus:text-destructive"
        >
          <Trash size={13} weight="bold" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
