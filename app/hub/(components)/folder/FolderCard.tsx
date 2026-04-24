'use client'

import { useState } from 'react'
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
import { ViewWrapper } from '@/app/hub/(components)/view/ViewWrapper'
import type { Folder as FolderType } from '@/types/folder'

interface FolderCardProps {
  folder: FolderType
  onDelete: (id: string) => void
  onCreateSubfolder: (parentId: string, projectId: string) => void
  onClick?: (id: string) => void
}

export function FolderCard({ folder, onDelete, onCreateSubfolder, onClick }: FolderCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <ViewWrapper>
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <button
            onClick={() => onClick?.(folder.id)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
          >
            <Folder size={16} weight="bold" className="text-grey-dark shrink-0" />
            <span className="text-sm font-medium text-grey-dark truncate">{folder.name}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-grey-light hover:text-grey-dark hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors shrink-0 -mr-1">
              <DotsThreeVertical size={18} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
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
      </ViewWrapper>

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
