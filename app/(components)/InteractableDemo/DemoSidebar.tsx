'use client'

/**
 * Demo sidebar — mirrors the real sidebar's nav surface but at a
 * smaller scale. Single-column desktop sidebar; mobile burger reveals
 * a top-down curtain (same pattern the demo had before, kept
 * verbatim).
 *
 * Nav items: Home / Settings / Agent / Connections.
 * Below the nav, a "Projects" section lists each demo project; tapping
 * a project switches to its dedicated project page in the demo. Each
 * project row has a caret to expand the folder list inline.
 *
 * "All folders" was removed in this pass — it was a flat folder
 * explorer that didn't match the real product (which navigates folders
 * inside a project view). Folder navigation now happens in-place
 * inside `<DemoProjectView>`.
 */

import { useState } from 'react'
import { useMobileBreakpoint } from '@/hooks/useMobileBreakpoint'
import {
  House,
  SquaresFour,
  Gear,
  CaretRight,
  Folder,
  FolderOpen,
  DotsThree,
  List,
  X,
  Cube,
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
import type { DemoFolder, DemoPage, DemoProject } from './context/DemoContext'
import type { Icon } from '@phosphor-icons/react'

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
  onNavigate?: () => void
}

/**
 * Folder row inside a project's expanded folder list. Tapping the
 * label routes to the project's view (the real sidebar drills
 * straight into the folder view, but on the demo we keep things
 * simpler — the folder list is just a visual hint, the project
 * page handles navigation).
 */
function DemoSidebarFolderItem({ folder, depth = 0, onNavigate }: DemoSidebarFolderItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { folders, deleteFolder, goToPage } = useDemoContext()

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
            goToPage('project', folder.projectId)
            onNavigate?.()
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
              <DemoSidebarFolderItem
                key={child.id}
                folder={child}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ProjectRowProps {
  project: DemoProject
  onNavigate?: () => void
}

/**
 * One project row in the sidebar. Tapping the name routes to the
 * project view; tapping the caret expands the folder list inline.
 * The two-button layout matches the real sidebar.
 */
function ProjectRow({ project, onNavigate }: ProjectRowProps) {
  const { folders, goToPage } = useDemoContext()
  const [isExpanded, setIsExpanded] = useState(false)
  const projectFolders = folders.filter(
    f => f.projectId === project.id && f.parentId === null,
  )
  const hasFolders = projectFolders.length > 0

  return (
    <div>
      <div className="group flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
        <button
          onClick={() => {
            goToPage('project', project.id)
            onNavigate?.()
          }}
          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
        >
          <Cube size={14} weight="thin" className="shrink-0" />
          <span className="truncate">{project.name}</span>
        </button>
        {hasFolders && (
          <button
            onClick={e => {
              e.stopPropagation()
              setIsExpanded(v => !v)
            }}
            className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground shrink-0"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
              className="flex"
            >
              <CaretRight size={12} weight="thin" />
            </motion.span>
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && hasFolders && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: '18px' }} />
              {projectFolders.map(folder => (
                <DemoSidebarFolderItem
                  key={folder.id}
                  folder={folder}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DemoSidebarContents({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  const { pageOpen, goToPage, projects } = useDemoContext()

  const handleNav = (page: DemoPage) => {
    goToPage(page)
    onNavigate?.()
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" onClick={onNavigate}>
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
          <div className="w-6 h-6 rounded-full bg-muted" />
          <div className="flex-1 min-w-0">
            <div className="h-2.5 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>

      <nav className="px-2 space-y-0.5" onClick={e => e.stopPropagation()}>
        <DemoNavItem page="home" label="Home" icon={House} current={pageOpen} onClick={handleNav} />
        {/* Agent moved OUT of the sidebar — it now lives as a
            Dashboard/Agent mode switch at the top of the home page,
            mirroring the real `/hub/home` dashboard. The sidebar
            slot is freed up and the agent surface is reachable in
            one click from the page where users actually land. */}
        <DemoNavItem page="connections" label="Connections" icon={SquaresFour} current={pageOpen} onClick={handleNav} />
        <DemoNavItem page="settings" label="Settings" icon={Gear} current={pageOpen} onClick={handleNav} />
      </nav>

      <Separator className="my-3" />

      {/* Projects label + list. Same affordance the real sidebar offers
          — clicking a project routes to its page; the caret expands
          the folder list inline. */}
      <div className="px-2 mb-1">
        <span className="block px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Projects
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-1 space-y-0.5" onClick={e => e.stopPropagation()}>
        {projects.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet</p>
        ) : (
          projects.map(project => (
            <ProjectRow
              key={project.id}
              project={project}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function DemoSidebar() {
  const isMobile = useMobileBreakpoint()
  const [isOpen, setIsOpen] = useState(false)

  if (!isMobile) {
    return (
      <aside className="flex flex-col w-48 border-r shrink-0">
        <DemoSidebarContents />
      </aside>
    )
  }

  return (
    <>
      {/* Mobile burger */}
      <button
        className="absolute top-2 left-2 z-50 p-1.5 rounded-md hover:bg-accent"
        onClick={() => setIsOpen(v => !v)}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={18} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <List size={18} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Mobile curtain — absolute within the demo card's relative container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="absolute inset-0 z-40 bg-background rounded-lg flex flex-col overflow-hidden"
          >
            <div className="pt-10 flex flex-col flex-1 overflow-hidden">
              <DemoSidebarContents onNavigate={() => setIsOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
