'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretDown, Folder, DotsThree } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Folder as FolderType } from '@/types/folder'

interface SidebarFolderItemProps {
  folder: FolderType
  depth?: number
}

export function SidebarFolderItem({ folder, depth = 0 }: SidebarFolderItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { folders: foldersCtx } = useDashboard()

  const children = foldersCtx.getChildFolders(folder.id)
  const hasChildren = children.length > 0

  return (
    <div className="relative">
      <div
        onClick={() => hasChildren && setIsOpen(v => !v)}
        className={cn(
          'group flex items-center gap-1 rounded-md pr-3 transition-colors',
          hasChildren ? 'cursor-pointer' : 'cursor-default',
          'hover:bg-hover-fill',
        )}
        style={{ paddingLeft: `${26 + depth * 14}px` }}
      >
        <span className="shrink-0 text-grey-dark">
          <Folder size={13} weight="bold" />
        </span>

        <span className="flex-1 py-1.5 text-sm min-w-0 truncate text-grey-dark">
          {folder.name}
        </span>

        {/* Context menu — shown on hover */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center justify-center w-5 h-5 rounded text-grey-light hover:text-grey-dark shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
            onClick={e => e.stopPropagation()}
          >
            <DotsThree size={14} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
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

        {/* Expand caret — only when has children */}
        {hasChildren && (
          <motion.span
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.15 }}
            className="flex shrink-0 text-grey-dark"
            onClick={e => { e.stopPropagation(); setIsOpen(v => !v) }}
          >
            <CaretDown size={11} weight="bold" />
          </motion.span>
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
              <SidebarFolderItem key={child.id} folder={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
