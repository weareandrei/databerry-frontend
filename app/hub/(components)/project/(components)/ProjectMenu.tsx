'use client'

/**
 * 3-dot kebab menu for project-level actions (refresh, edit, delete).
 * Styled for the project page header by default; pass `className` to
 * override the trigger chrome.
 */

import { ArrowsClockwise, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ProjectMenuProps {
  onRefreshAll: () => void
  onEdit: () => void
  onDelete: () => void
  className?: string
}

export function ProjectMenu({ onRefreshAll, onEdit, onDelete, className }: ProjectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Project options"
        className={cn(
          'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stroke bg-white text-subtle shadow-sm transition-colors hover:bg-hover-fill/70 lg:h-10 lg:w-10',
          className,
        )}
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
