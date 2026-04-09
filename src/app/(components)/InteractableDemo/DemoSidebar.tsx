'use client'

import { useState } from 'react'
import {
  House,
  Folders,
  PlugsConnected,
  CaretRight,
  Folder,
  FolderOpen,
  DotsThree,
} from '@phosphor-icons/react'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useDemoContext } from './context/DemoContext'
import type { DemoFolder } from './context/DemoContext'
import type { Icon } from '@phosphor-icons/react'

type DemoPage = 'home' | 'connections' | 'explorer'

interface DemoNavItemProps {
  page: DemoPage
  label: string
  icon: Icon
  current: DemoPage
  onClick: (page: DemoPage) => void
}

function DemoNavItem({ page, label, icon: IconComponent, current, onClick }: DemoNavItemProps) {
  const isActive = current === page
  return (
    <button
      onClick={() => onClick(page)}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-sm transition-colors text-left',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <IconComponent size={16} weight="thin" />
      <span>{label}</span>
    </button>
  )
}

interface DemoSidebarFolderItemProps {
  folder: DemoFolder
  depth?: number
}

function DemoSidebarFolderItem({ folder, depth = 0 }: DemoSidebarFolderItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { folders, deleteFolder, setPageOpen, setOpenFolderId } = useDemoContext()

  const children = folders.filter(f => f.parentId === folder.id)
  const hasChildren = children.length > 0

  return (
    <div className="relative">
      <div
        className="group flex items-center gap-1 rounded-md pr-1 transition-colors hover:bg-accent"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
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

        <button
          onClick={() => {
            setOpenFolderId(folder.id)
            setPageOpen('explorer')
          }}
          className="flex items-center gap-2 flex-1 py-1.5 text-sm text-muted-foreground min-w-0 text-left"
        >
          {isOpen ? (
            <FolderOpen size={14} weight="thin" className="shrink-0" />
          ) : (
            <Folder size={14} weight="thin" className="shrink-0" />
          )}
          <span className="truncate">{folder.name}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground shrink-0">
            <DotsThree size={14} weight="thin" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem
              className="text-sm text-destructive focus:text-destructive"
              onClick={() => deleteFolder(folder.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
              className="absolute top-0 bottom-0 w-px bg-border"
              style={{ left: `${20 + depth * 16}px` }}
            />
            {children.map(child => (
              <DemoSidebarFolderItem key={child.id} folder={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DemoSidebar() {
  const { pageOpen, setPageOpen, folders } = useDemoContext()
  const rootFolders = folders.filter(f => f.parentId === null)

  return (
    <aside className="flex flex-col w-48 border-r shrink-0">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
          <div className="w-6 h-6 rounded-full bg-muted" />
          <div className="flex-1 min-w-0">
            <div className="h-2.5 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>

      <nav className="px-2 space-y-0.5">
        <DemoNavItem
          page="home"
          label="Home"
          icon={House}
          current={pageOpen}
          onClick={setPageOpen}
        />
        <DemoNavItem
          page="explorer"
          label="All folders"
          icon={Folders}
          current={pageOpen}
          onClick={setPageOpen}
        />
        <DemoNavItem
          page="connections"
          label="Connections"
          icon={PlugsConnected}
          current={pageOpen}
          onClick={setPageOpen}
        />
      </nav>

      <Separator className="my-3" />

      <div className="flex-1 overflow-y-auto px-1 space-y-0.5">
        {rootFolders.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No folders yet</p>
        ) : (
          rootFolders.map(folder => <DemoSidebarFolderItem key={folder.id} folder={folder} />)
        )}
      </div>
    </aside>
  )
}
