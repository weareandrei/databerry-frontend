'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretRight, Folder, FolderOpen, DotsThree } from '@phosphor-icons/react'
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
  const pathname = usePathname()
  const { folders: foldersCtx } = useDashboard()

  const children = foldersCtx.getChildFolders(folder.id)
  const isActive = pathname === `/folder/${folder.id}`
  const hasChildren = children.length > 0

  return (
    <div className="relative">
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md pr-1 transition-colors',
          isActive ? 'bg-accent' : 'hover:bg-accent',
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {/* Expand arrow */}
        <button
          onClick={() => setIsOpen(v => !v)}
          className="flex items-center justify-center w-4 h-4 shrink-0 text-muted-foreground"
        >
          {hasChildren ? (
            <motion.span
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.15 }}
              className="flex"
            >
              <CaretRight size={12} weight="thin" />
            </motion.span>
          ) : null}
        </button>

        {/* Folder link */}
        <Link
          href={`/hub/folder/${folder.id}`}
          className="flex items-center gap-2 flex-1 py-1.5 text-sm text-muted-foreground min-w-0"
        >
          {isOpen ? (
            <FolderOpen size={14} weight="thin" className="shrink-0" />
          ) : (
            <Folder size={14} weight="thin" className="shrink-0" />
          )}
          <span className="truncate">{folder.name}</span>
        </Link>

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground shrink-0">
            <DotsThree size={14} weight="thin" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onClick={() => foldersCtx.openModal(folder.id)} className="text-sm">
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
      </div>

      {/* Children with vertical line */}
      <AnimatePresence initial={false}>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative overflow-hidden"
          >
            {/* Vertical indicator line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-border"
              style={{ left: `${20 + depth * 16}px` }}
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
