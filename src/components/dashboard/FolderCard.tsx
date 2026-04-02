'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Folder, DotsThreeVertical } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
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
}

export function FolderCard({ folder }: FolderCardProps) {
  const { folders: foldersCtx } = useDashboard()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <div className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <Link
          href={`/folder/${folder.id}`}
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <Folder size={16} weight="thin" className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{folder.name}</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground shrink-0">
            <DotsThreeVertical size={16} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => foldersCtx.openModal(folder.id)}
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all the contents of the folder as well. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => foldersCtx.deleteFolder(folder.id)}
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
