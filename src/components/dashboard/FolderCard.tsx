'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Folder, DotsThreeVertical } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Folder as FolderType } from '@/types/folder'

interface FolderCardProps {
  folder: FolderType
  onDelete: (id: string) => void
  onCreateSubfolder: (parentId: string) => void
  onClick?: (id: string) => void
}

export function FolderCard({ folder, onDelete, onCreateSubfolder, onClick }: FolderCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const folderLabel = (
    <>
      <Folder size={16} weight="thin" className="text-muted-foreground shrink-0" />
      <span className="text-sm font-medium truncate">{folder.name}</span>
    </>
  )

  return (
    <>
      <div className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        {onClick ? (
          <button
            onClick={() => onClick(folder.id)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            {folderLabel}
          </button>
        ) : (
          <Link
            href={`/hub/folder/${folder.id}`}
            className="flex items-center gap-2.5 flex-1 min-w-0"
          >
            {folderLabel}
          </Link>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground shrink-0">
            <DotsThreeVertical size={16} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onCreateSubfolder(folder.id)} className="text-sm">
              New subfolder
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmOpen(true)}
              className="text-sm text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all the contents of the folder as well. Are you sure you want to
              proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(folder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
