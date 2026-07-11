'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CaretLeft,
  CardsThree,
  CreditCard,
  Folder,
  Gear,
  Plus,
  SignOut,
} from '@phosphor-icons/react'
import { CollapsibleSectionHeader } from '@/app/hub/(components)/Sidebar/(components)/CollapsibleSectionHeader'
import {
  AskAgentNavIcon,
  ConnectionsNavIcon,
  OverviewNavIcon,
  TimelineNavIcon,
} from '@/app/hub/(components)/Sidebar/(components)/SidebarWorkspaceIcons'
import { DASHBOARD_SIDEBAR_WIDTH_CLASS } from '@/app/hub/(components)/layout/DashboardSidebar'
import { cn } from '@/lib/utils'
import { DemoProjectSelect } from './DemoProjectSelect'
import { useDemoContext } from './context/DemoContext'
import type { DemoPage } from './context/DemoContext'

const UNSUPPORTED = "This feature isn't available in the demo."

function CollapsibleSection({
  label,
  action,
  children,
  defaultCollapsed = false,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
  defaultCollapsed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  return (
    <div className="mb-6">
      <CollapsibleSectionHeader
        label={label}
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        action={action}
      />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-1.5 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavRow({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors',
        active
          ? 'bg-hover-fill text-foreground'
          : 'text-foreground hover:bg-hover-fill/70',
      )}
    >
      <span className="flex shrink-0 items-center">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}

export function DemoDashboardSidebar() {
  const {
    projects,
    folders,
    pageOpen,
    currentProjectId,
    goToPage,
    showNotice,
    createFolder,
  } = useDemoContext()

  const project = currentProjectId
    ? projects.find(p => p.id === currentProjectId) ?? null
    : null

  const rootFolders = project
    ? folders.filter(f => f.projectId === project.id && f.parentId === null)
    : []

  const isProjectPage = (page: DemoPage) =>
    pageOpen === page && currentProjectId === project?.id

  const scrollToTimeline = () => {
    if (pageOpen !== 'overview' || !project) {
      goToPage('overview', project?.id ?? null)
      requestAnimationFrame(() => {
        document.getElementById('project-timeline')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
      return
    }
    document.getElementById('project-timeline')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 h-full',
        DASHBOARD_SIDEBAR_WIDTH_CLASS,
        'bg-gradient-to-bl from-surface to-[#F9F9FA]',
      )}
    >
      <div className="shrink-0 px-3 pt-5 pb-4">
        <DemoProjectSelect />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        <button
          type="button"
          onClick={() => goToPage('home')}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-subtle transition-colors hover:bg-hover-fill/70 hover:text-muted-foreground cursor-pointer',
            pageOpen === 'home' && 'bg-hover-fill/50',
          )}
        >
          <CaretLeft size={14} weight="regular" className="shrink-0" />
          <span>All projects</span>
        </button>

        {project ? (
          <div className="mt-6">
            <CollapsibleSection label="Workspace">
              <NavRow
                active={isProjectPage('overview')}
                onClick={() => goToPage('overview', project.id)}
                icon={<OverviewNavIcon />}
                label="Overview"
              />
              <NavRow
                active={isProjectPage('connections')}
                onClick={() => goToPage('connections', project.id)}
                icon={<ConnectionsNavIcon />}
                label="Connections"
              />
              <NavRow
                active={false}
                onClick={scrollToTimeline}
                icon={<TimelineNavIcon />}
                label="Timeline"
              />
              <NavRow
                active={isProjectPage('agent')}
                onClick={() => goToPage('agent', project.id)}
                icon={<AskAgentNavIcon />}
                label="Ask agent"
              />
            </CollapsibleSection>

            <CollapsibleSection
              label="Folders"
              action={
                <button
                  onClick={e => {
                    e.stopPropagation()
                    const name = window.prompt('New folder name')?.trim()
                    if (name) createFolder(name, project.id, null)
                  }}
                  aria-label="New folder"
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-stroke bg-white text-muted-foreground transition-colors hover:text-foreground"
                  style={{ boxShadow: '1px 1px 4px rgba(0,0,0,0.08)' }}
                >
                  <Plus size={10} weight="bold" />
                </button>
              }
            >
              {rootFolders.length === 0 ? (
                <p className="px-3 py-2 text-xs text-subtle font-normal">No folders yet</p>
              ) : (
                rootFolders.map(folder => (
                  <NavRow
                    key={folder.id}
                    active={false}
                    onClick={() => goToPage('overview', project.id)}
                    icon={<Folder size={16} weight="regular" />}
                    label={folder.name}
                  />
                ))
              )}
            </CollapsibleSection>
          </div>
        ) : (
          <div className="mt-0.5">
            <NavRow
              active={pageOpen === 'connections' && !currentProjectId}
              onClick={() => goToPage('connections', null)}
              icon={<CardsThree size={16} weight="regular" />}
              label="Connections"
            />
          </div>
        )}
      </nav>

      <div className="shrink-0 space-y-2 px-3 pb-5">
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => showNotice(UNSUPPORTED)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-hover-fill/70"
          >
            <Gear size={16} weight="regular" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={() => showNotice(UNSUPPORTED)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-hover-fill/70"
          >
            <CreditCard size={16} weight="regular" />
            <span>Subscription</span>
          </button>
          <button
            type="button"
            onClick={() => showNotice(UNSUPPORTED)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-hover-fill/70 hover:text-destructive"
          >
            <SignOut size={16} weight="regular" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
