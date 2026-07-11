'use client'

/**
 * Single full-height sidebar for the hub — replaces the old
 * `<IconRail>` + per-project `<ProjectSidebar>` pair. Static on the
 * left; the white body column on the right scrolls independently.
 *
 * Top: project selector dropdown (`<ProjectSelect>`).
 * Middle: global + project-scoped navigation.
 * Bottom: Settings, Subscription, Sign out.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CaretLeft,
  CardsThree,
  CreditCard,
  Gear,
  Plus,
  SignOut,
} from '@phosphor-icons/react'
import { ProjectSelect } from '@/app/hub/(components)/Sidebar/(components)/ProjectSelect'
import { SidebarFolderItem } from '@/app/hub/(components)/Sidebar/(components)/SidebarFolderItem'
import { SidebarNavItem } from '@/app/hub/(components)/Sidebar/(components)/SidebarNavItem'
import {
  AskAgentNavIcon,
  ConnectionsNavIcon,
  OverviewNavIcon,
  TimelineNavIcon,
} from '@/app/hub/(components)/Sidebar/(components)/SidebarWorkspaceIcons'
import { TierPickerSheet } from '@/app/hub/(components)/Sidebar/(components)/TierPickerSheet'
import { CollapsibleSectionHeader } from '@/app/hub/(components)/Sidebar/(components)/CollapsibleSectionHeader'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAccount } from '@/hooks/useAccount'
import { useAuth } from '@/contexts/AuthContext'
import { useTierPickerListener } from '@/hooks/useTierPicker'
import { EVENT, trackEvent } from '@/lib/posthog'
import { cn } from '@/lib/utils'

export const DASHBOARD_SIDEBAR_WIDTH_CLASS = 'w-65'

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

function resolveProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/hub\/project\/([^/]+)/)
  return match ? match[1] : null
}

export function DashboardSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const {
    folders: foldersCtx,
    projects: projectsCtx,
  } = useDashboard()
  const { signOut } = useAuth()
  const { planId } = useAccount()
  const [tierOpen, setTierOpen] = useState(false)

  useTierPickerListener(() => {
    trackEvent(EVENT.TIER_PICKER_OPENED, { source: 'broadcast' })
    setTierOpen(true)
  })

  const projectId = resolveProjectId(pathname)
  const project = projectsCtx.projects.find(p => p.id === projectId) ?? null
  const base = project ? `/hub/project/${project.id}` : null

  const folderMatch = pathname.match(/\/project\/[^/]+\/folder\/([^/]+)/)
  const activeFolderId = folderMatch ? folderMatch[1] : null
  const expandedPath = (() => {
    const set = new Set<string>()
    let cursor = foldersCtx.folders.find(f => f.id === activeFolderId)?.parentId ?? null
    while (cursor) {
      set.add(cursor)
      cursor = foldersCtx.folders.find(f => f.id === cursor)?.parentId ?? null
    }
    return set
  })()

  const isActive = (sub: string) => pathname === `${base}${sub}`
  const isProjectRoot = base != null && (pathname === base || pathname === `${base}/`)

  const rootFolders = project
    ? foldersCtx.folders.filter(f => f.projectId === project.id && f.parentId === null)
    : []

  const scrollToTimeline = () => {
    if (!base) return
    if (isProjectRoot) {
      document.getElementById('project-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    router.push(`${base}#timeline`)
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 h-screen',
        DASHBOARD_SIDEBAR_WIDTH_CLASS,
        'bg-gradient-to-bl from-surface to-[#F9F9FA]',
      )}
    >
      <div className="shrink-0 px-3 pt-5 pb-4">
        <ProjectSelect />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        <Link
          href="/hub/home"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-subtle transition-colors hover:bg-hover-fill/70 hover:text-muted-foreground',
            pathname === '/hub/home' && 'bg-hover-fill/50',
          )}
        >
          <CaretLeft size={14} weight="regular" className="shrink-0" />
          <span>All projects</span>
        </Link>

        {project && base ? (
          <div className="mt-6">
            <CollapsibleSection label="Workspace">
              <NavRow
                active={isProjectRoot}
                onClick={() => router.push(base)}
                icon={<OverviewNavIcon />}
                label="Overview"
              />
              <NavRow
                active={isActive('/connections')}
                onClick={() => router.push(`${base}/connections`)}
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
                active={isActive('/agent-chat')}
                onClick={() => router.push(`${base}/agent-chat`)}
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
                    foldersCtx.openModal(null, project.id)
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
                  <SidebarFolderItem
                    key={folder.id}
                    folder={folder}
                    activeFolderId={activeFolderId}
                    expandedPath={expandedPath}
                    onNavigate={(_projectId, folderId) => {
                      if (folderId) router.push(`${base}/folder/${folderId}`)
                    }}
                  />
                ))
              )}
            </CollapsibleSection>
          </div>
        ) : (
          <div className="mt-0.5">
            <SidebarNavItem href="/hub/connections" label="Connections" icon={CardsThree} />
          </div>
        )}
      </nav>

      <div className="shrink-0 space-y-2 px-3 pb-5">
        <div className="space-y-1.5 pt-1">
          <SidebarNavItem href="/hub/settings" label="Settings" icon={Gear} />
          <button
            type="button"
            onClick={() => {
              trackEvent(EVENT.TIER_PICKER_OPENED, { source: 'sidebar_button' })
              setTierOpen(true)
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-hover-fill/70"
          >
            <CreditCard size={16} weight="regular" />
            <span>Subscription</span>
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-hover-fill/70 hover:text-destructive"
          >
            <SignOut size={16} weight="regular" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      <TierPickerSheet open={tierOpen} onOpenChange={setTierOpen} currentPlanId={planId} />
    </aside>
  )
}
