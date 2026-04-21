'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { House, PlugsConnected, List, X, Robot, CaretDown, Plus, Cube } from '@phosphor-icons/react'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarUserProfile } from './SidebarUserProfile'
import { SidebarFolderItem } from './SidebarFolderItem'
import { useDashboard } from '@/contexts/DashboardContext'

function SectionHeader({
  label,
  collapsed,
  onToggle,
  action,
}: {
  label: string
  collapsed: boolean
  onToggle: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="w-full flex items-center justify-between pl-5 pr-5 mb-1 text-sm text-grey-dark">
      <span
        onClick={onToggle}
        className="flex-1 text-left cursor-pointer hover:text-grey-darkest transition-colors"
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {action}
        <motion.span
          onClick={onToggle}
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
          className="cursor-pointer hover:text-grey-darkest transition-colors"
        >
          <CaretDown size={11} weight="bold" />
        </motion.span>
      </div>
    </div>
  )
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const { folders: foldersCtx, projects: projectsCtx } = useDashboard()
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false)
  const [projectsCollapsed, setProjectsCollapsed] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (id: string) => setExpandedProjects(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-semibold tracking-[0.05em]" onClick={onNavigate}>
      <div className="px-3 pt-3 pb-7">
        <SidebarUserProfile />
      </div>

      {/* Workspace section */}
      <div className="mb-9">
        <SectionHeader
          label="Workspace"
          collapsed={workspaceCollapsed}
          onToggle={() => setWorkspaceCollapsed(v => !v)}
        />
        <AnimatePresence initial={false}>
          {!workspaceCollapsed && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden px-2 space-y-0.5"
            >
              <SidebarNavItem href="/hub/home" label="Home" icon={House} />
              <SidebarNavItem href="/hub/agent-chat" label="Ask AI" icon={Robot} />
              <SidebarNavItem href="/hub/connections" label="Connections" icon={PlugsConnected} />
            </motion.nav>
          )}
        </AnimatePresence>
      </div>

      {/* Projects section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <SectionHeader
          label="Projects"
          collapsed={projectsCollapsed}
          onToggle={() => setProjectsCollapsed(v => !v)}
          action={
            <button
              onClick={e => {
                e.stopPropagation()
                projectsCtx.openModal()
              }}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-stroke text-grey-dark hover:text-grey-darkest transition-colors"
              style={{ boxShadow: '1px 1px 4px rgba(0,0,0,0.08)' }}
            >
              <Plus size={10} weight="bold" />
            </button>
          }
        />
        <AnimatePresence initial={false}>
          {!projectsCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-y-auto px-2 space-y-0.5"
            >
              {projectsCtx.projects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-grey-light">No projects yet</p>
              ) : (
                projectsCtx.projects.map(project => {
                  const projectFolders = foldersCtx.folders.filter(
                    f => f.projectId === project.id && f.parentId === null
                  )
                  const isExpanded = expandedProjects.has(project.id)
                  const hasFolders = projectFolders.length > 0

                  return (
                    <div key={project.id}>
                      {/* Project row — styled like a nav item */}
                      <button
                        onClick={() => toggleProject(project.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer text-grey-dark hover:bg-hover-fill hover:text-grey-darkest"
                      >
                        <Cube size={16} weight="bold" className="shrink-0" />
                        <span className="flex-1 text-left truncate">{project.name}</span>
                        {hasFolders && (
                          <motion.span
                            animate={{ rotate: isExpanded ? 0 : -90 }}
                            transition={{ duration: 0.15 }}
                            className="flex shrink-0 text-grey-dark"
                          >
                            <CaretDown size={11} weight="bold" />
                          </motion.span>
                        )}
                      </button>

                      {/* Expanded folders with vertical guide bar */}
                      <AnimatePresence initial={false}>
                        {isExpanded && hasFolders && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="relative overflow-hidden"
                          >
                            <div className="absolute top-0 bottom-0 w-px bg-stroke" style={{ left: '22px' }} />
                            <div className="pl-2">
                              {projectFolders.map(folder => (
                                <SidebarFolderItem key={folder.id} folder={folder} />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 screen sticky top-0 shrink-0">
        <SidebarContents />
      </aside>

      {/* Mobile burger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg hover:bg-black/5"
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
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <List size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Mobile curtain */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden fixed inset-0 z-40 flex flex-col overflow-hidden"
            style={{ background: '#F4F1F1' }}
          >
            <div className="pt-14 flex flex-col flex-1 overflow-hidden">
              <SidebarContents onNavigate={() => setIsOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
