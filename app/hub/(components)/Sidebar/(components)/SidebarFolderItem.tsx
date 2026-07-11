'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretDown, Folder, DotsThree, PencilSimple } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { RenameFolderDialog } from '@/app/hub/(components)/folder/(components)/RenameFolderDialog'
import type { Folder as FolderType } from '@/types/folder'

interface SidebarFolderItemProps {
  folder: FolderType
  depth?: number
  /**
   * Navigate-to-project handler, threaded down from `Sidebar.tsx` so
   * children of `SidebarFolderItem` (nested subfolders) can navigate
   * without each one wiring its own dispatch + router. Clicking the
   * folder name calls `onNavigate(projectId, folderId)` to land on
   * `/hub/home` with that project + folder pre-opened. Clicking the
   * caret keeps the existing local-only "expand my children"
   * behaviour.
   */
  onNavigate?: (projectId: string, folderId: string) => void
  /**
   * The folder currently open in the body (from the route). When it
   * matches this row, the row renders ACTIVE — the same soft-grey fill
   * the project sidebar's nav rows use, so a folder opened from the
   * body grid and one opened from here look identical.
   */
  activeFolderId?: string | null
  /**
   * Folder ids on the path from the root down to the active folder.
   * Rows in this set auto-expand so the active (possibly nested)
   * folder is revealed without the user hunting for it.
   */
  expandedPath?: Set<string>
}

export function SidebarFolderItem({
  folder,
  depth = 0,
  onNavigate,
  activeFolderId = null,
  expandedPath,
}: SidebarFolderItemProps) {
  const [isOpen, setIsOpen] = useState(expandedPath?.has(folder.id) ?? false)
  // Auto-open when this folder sits on the path to the active one
  // (e.g. a deep link / sidebar nav into a nested folder). Never
  // auto-CLOSES — the user can still collapse it.
  useEffect(() => {
    if (expandedPath?.has(folder.id)) setIsOpen(true)
  }, [expandedPath, folder.id])
  // Rename dialog mounted at this level so each folder row owns its
  // own dialog state — the dropdown trigger that opens it is also at
  // this level. Same pattern `FolderCard` uses in the project body.
  const [renameOpen, setRenameOpen] = useState(false)
  const { folders: foldersCtx } = useDashboard()

  const children = foldersCtx.getChildFolders(folder.id)
  const hasChildren = children.length > 0
  const isActive = folder.id === activeFolderId

  return (
    <div className="relative">
      {/*
        Outer is a `<div>` (not a button) to allow two sibling
        interactive children — the name "navigate" button and the
        caret "expand my subfolders" button. Same pattern the project
        row uses one level up.
      */}
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md pr-3 transition-colors border',
          isActive
            ? 'bg-black/[0.06] border-transparent'
            : 'border-transparent hover:bg-hover-fill',
        )}
        style={{ paddingLeft: `${26 + depth * 14}px` }}
      >
        {/* Folder name — navigates */}
        <button
          onClick={() => onNavigate?.(folder.projectId, folder.id)}
          className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer text-left"
        >
          <span className={cn('shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground')}>
            <Folder size={13} weight="bold" />
          </span>
          <span
            className={cn(
              'flex-1 py-1.5 text-sm min-w-0 truncate',
              isActive ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {folder.name}
          </span>
        </button>

        {/* Context menu — shown on hover */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center justify-center w-5 h-5 rounded text-subtle hover:text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
            onClick={e => e.stopPropagation()}
          >
            <DotsThree size={14} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem
              onClick={() => setRenameOpen(true)}
              className="text-sm gap-2"
            >
              <PencilSimple size={13} weight="bold" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => foldersCtx.openModal(folder.id, folder.projectId)}
              className="text-sm"
            >
              New subfolder
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => foldersCtx.deleteFolder(folder.id)}
              className="text-sm text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/*
          Expand caret — only when has children. Same hover treatment
          as the project-row arrow + the view-tile 3-dots, so all
          three interactive icon-buttons in the sidebar/view header
          family read alike.
        */}
        {hasChildren && (
          <button
            onClick={e => {
              e.stopPropagation()
              setIsOpen(v => !v)
            }}
            aria-label={isOpen ? 'Collapse subfolders' : 'Expand subfolders'}
            className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-subtle hover:text-muted-foreground hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors -mr-1"
          >
            <motion.span
              animate={{ rotate: isOpen ? 0 : -90 }}
              transition={{ duration: 0.15 }}
              className="flex"
            >
              <CaretDown size={11} weight="bold" />
            </motion.span>
          </button>
        )}
      </div>

      {/* Children with vertical guide bar */}
      <AnimatePresence initial={false}>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative overflow-hidden"
          >
            <div
              className="absolute top-0 bottom-0 w-px bg-stroke"
              style={{ left: `${24 + depth * 14}px` }}
            />
            {children.map(child => (
              <SidebarFolderItem
                key={child.id}
                folder={child}
                depth={depth + 1}
                onNavigate={onNavigate}
                activeFolderId={activeFolderId}
                expandedPath={expandedPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename dialog — same component the project-body folder
          cards use. Mounted unconditionally so its close animation
          plays cleanly even after the folder name updates in
          state. */}
      <RenameFolderDialog
        folder={folder}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onRename={newName => foldersCtx.renameFolder(folder.id, newName)}
      />
    </div>
  )
}
