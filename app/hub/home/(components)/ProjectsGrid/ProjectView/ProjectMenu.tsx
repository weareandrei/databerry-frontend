'use client'

/**
 * 3-dot kebab menu attached to the right side of each project header.
 * Two destinations:
 *   - Edit  → opens `EditProjectDialog` (name + website URL).
 *   - Delete → opens `DeleteProjectDialog` (type-the-name-to-confirm
 *     alert dialog).
 *
 * Mirrors the pattern in `ViewHeader.tsx` (the per-tile kebab) so
 * project-level and view-level menus read as a family. Trigger sized
 * `w-8 h-8 rounded-full` to pair visually with the existing collapse
 * toggle that lives next to it in the same flex row.
 */

import { DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ProjectMenuProps {
  onEdit: () => void
  onDelete: () => void
}

export function ProjectMenu({ onEdit, onDelete }: ProjectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Project options"
        className="flex items-center justify-center w-8 h-8 rounded-full border border-stroke bg-white text-grey-dark shadow-sm hover:bg-black/[0.04] active:bg-black/[0.08] transition-colors"
      >
        <DotsThreeVertical size={16} weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
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
