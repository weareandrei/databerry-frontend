'use client'

import { useState } from 'react'
import { FolderSimple, DotsThreeVertical, PencilSimple } from '@phosphor-icons/react'
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
import { BaseWidget } from '@/app/hub/(components)/widgets/(components)/BaseWidget'
import { RenameFolderDialog } from './RenameFolderDialog'
import type { Folder as FolderType } from '@/types/folder'

interface FolderCardProps {
  folder: FolderType
  onDelete: (id: string) => void
  onCreateSubfolder: (parentId: string, projectId: string) => void
  /**
   * Optional rename handler. When provided, the dropdown shows a
   * Rename item that opens the inline rename dialog. Optional so
   * read-only consumers (none today) can drop the affordance without
   * a forked component.
   */
  onRename?: (folderId: string, newName: string) => void | Promise<void>
  onClick?: (id: string) => void
}

export function FolderCard({
  folder,
  onDelete,
  onCreateSubfolder,
  onRename,
  onClick,
}: FolderCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)

  return (
    <>
      <BaseWidget radius="lg" compact className="w-fit">
        <div className="flex items-center justify-between gap-1.5 px-2.5 py-2">
          <button
            onClick={() => onClick?.(folder.id)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer"
          >
            <FolderSimple size={14} weight="bold" className="text-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">{folder.name}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-5 h-5 rounded cursor-pointer text-subtle hover:bg-hover-fill transition-colors shrink-0">
              <DotsThreeVertical size={16} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onRename && (
                <DropdownMenuItem
                  onClick={() => setRenameOpen(true)}
                  className="text-sm gap-2"
                >
                  <PencilSimple size={13} weight="bold" />
                  Rename
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onCreateSubfolder(folder.id, folder.projectId)}
                className="text-sm"
              >
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
      </BaseWidget>

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

      {/* Mounted unconditionally even when `onRename` is undefined so
          the Suspense boundaries don't churn — the dialog just stays
          closed and contributes nothing to the rendered tree. */}
      {onRename && (
        <RenameFolderDialog
          folder={folder}
          open={renameOpen}
          onOpenChange={setRenameOpen}
          onRename={newName => onRename(folder.id, newName)}
        />
      )}
    </>
  )
}
