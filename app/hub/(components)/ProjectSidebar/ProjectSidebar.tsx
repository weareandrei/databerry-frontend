'use client'

/**
 * Per-project sidebar — mounts ONLY inside `/hub/projects/[id]/*`
 * (via that route group's layout), sitting between the global
 * `<IconRail>` (64 px) and the page body. Because it lives in the
 * route-group LAYOUT, navigating between the project's sub-pages
 * swaps only the body — this sidebar never re-mounts (no blink).
 *
 * Structure (top → bottom):
 *   - Project identity: favicon + name + the 3-dots menu (Edit /
 *     Delete — the same `ProjectMenu` the old project header used).
 *   - Workspace: Overview / Pinned views / Ask agent / Connections.
 *   - Views: Charts / Funnels (type-filtered, auto-positioned pages).
 *   - My tools: one row per connection serving this project
 *     (project-scoped + Common, excluding MCP servers — those belong
 *     to the agent surface, not the views tree).
 *   - Folders: the project's root folders (recursive
 *     `SidebarFolderItem`, same as the old sidebar) + "New folder".
 *   - Bottom: a persistent "+ Create view" button, pinned outside
 *     the scroll column so it stays fixed while the sections scroll.
 *     (The "Help us improve" card moved to the IconRail; timezone
 *     lives only in Settings now.)
 */

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CaretDown,
  ChartBar,
  ChatCircleDots,
  FunnelSimple,
  Gauge,
  Plus,
  PlugsConnected,
  PushPin,
} from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { ProjectMenu } from '@/app/hub/(components)/project/ProjectMenu'
import { EditProjectDialog } from '@/app/hub/(components)/project/EditProjectDialog'
import { DeleteProjectDialog } from '@/app/hub/(components)/project/DeleteProjectDialog'
import { SidebarFolderItem } from '@/app/hub/(components)/Sidebar/SidebarFolderItem'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useDashboard } from '@/contexts/DashboardContext'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import type { Project } from '@/types/project'

export const PROJECT_SIDEBAR_WIDTH_CLASS = 'w-60'

// ── Section header (collapsible) — same look as the old sidebar's ──
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

function CollapsibleSection({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="mb-8">
      <SectionHeader
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
            className="overflow-hidden px-2 space-y-0.5"
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
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors text-left cursor-pointer ${
        active
          ? // Soft brand tint (25%) behind the dashed brand outline.
            'bg-brand/10 border border-dashed border-brand text-grey-darkest'
          : // Inactive → hover only darkens text/icon (no bg change).
            'border border-transparent text-grey-dark hover:text-grey-darkest'
      }`}
    >
      <span className="shrink-0 flex items-center">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────

export function ProjectSidebar({ project }: { project: Project }) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    folders: foldersCtx,
    connections: connectionsCtx,
    projects: projectsCtx,
    views: viewsCtx,
  } = useDashboard()
  const { enforceViewLimit } = usePlanLimits()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const base = `/hub/projects/${project.id}`

  // Open the create-view modal for THIS project, gated on the plan's
  // per-project view cap. We count from the live store (same approach
  // as the overview toolbar's button) and open at the project root
  // (no folder) — folders are an Overview-only concept.
  const openCreateView = () => {
    const projectViewCount = viewsCtx.views.filter(v => v.projectId === project.id).length
    if (!enforceViewLimit(projectViewCount)) return
    viewsCtx.openModal(null, project.id)
  }
  const isActive = (sub: string) => pathname === `${base}${sub}`

  // Connections serving this project: scoped to it OR Common
  // (`projectId == null` = shared across every project). MCP servers
  // are excluded — they're agent tooling, not view sources.
  const toolConnections = connectionsCtx.connections.filter(
    c =>
      c.type !== 'mcp' &&
      (c.projectId == null || c.projectId === project.id),
  )

  const rootFolders = foldersCtx.folders.filter(
    f => f.projectId === project.id && f.parentId === null,
  )

  return (
    // Floating card — rounded, bordered, breathing room above and
    // below (top-4 / bottom-4) instead of filling the viewport edge
    // to edge. Same card chrome family as the body panels.
    // `left-20` = the 64-px icon rail + the shared 16-px gap, so
    // rail→sidebar spacing equals sidebar→body spacing.
    <aside
      className={`hidden md:flex flex-col fixed top-3 bottom-3 left-20 ${PROJECT_SIDEBAR_WIDTH_CLASS} z-20 font-semibold tracking-[0.05em] overflow-hidden bg-white rounded-2xl border border-stroke shadow-card`}
    >
      {/* Project identity row. The 3-dots menu carries the project-
          level actions (Edit / Delete) that used to live on the
          project card header — there's no card header anymore, the
          sidebar IS the project chrome. */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-6">
        <ProjectIcon websiteUrl={project.websiteUrl} size={26} pill />
        <span className="flex-1 min-w-0 truncate text-[15px] font-bold text-grey-darkest">
          {project.name}
        </span>
        <ProjectMenu
          onEdit={() => setEditOpen(true)}
          onDelete={() => setDeleteOpen(true)}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <CollapsibleSection label="Workspace">
          <NavRow
            active={isActive('/overview')}
            onClick={() => router.push(`${base}/overview`)}
            icon={<Gauge size={15} weight="bold" />}
            label="Overview"
          />
          <NavRow
            active={isActive('/pinned')}
            onClick={() => router.push(`${base}/pinned`)}
            icon={<PushPin size={15} weight="bold" />}
            label="Pinned views"
          />
          <NavRow
            active={isActive('/agent-chat')}
            onClick={() => router.push(`${base}/agent-chat`)}
            icon={<ChatCircleDots size={15} weight="bold" />}
            label="Ask agent"
          />
          <NavRow
            active={isActive('/connections')}
            onClick={() => router.push(`${base}/connections`)}
            icon={<PlugsConnected size={15} weight="bold" />}
            label="Connections"
          />
        </CollapsibleSection>

        <CollapsibleSection label="Views">
          <NavRow
            active={isActive('/views/charts')}
            onClick={() => router.push(`${base}/views/charts`)}
            icon={<ChartBar size={15} weight="bold" />}
            label="Charts"
          />
          <NavRow
            active={isActive('/views/funnels')}
            onClick={() => router.push(`${base}/views/funnels`)}
            icon={<FunnelSimple size={15} weight="bold" />}
            label="Funnels"
          />
        </CollapsibleSection>

        <CollapsibleSection label="My tools">
          {toolConnections.length === 0 ? (
            <p className="px-3 py-2 text-xs text-grey-light font-normal">
              No tools connected yet
            </p>
          ) : (
            toolConnections.map(conn => (
              <NavRow
                key={conn.id}
                active={isActive(`/tools/${conn.id}`)}
                onClick={() => router.push(`${base}/tools/${conn.id}`)}
                icon={
                  <ConnectionIcon type={conn.type} size={15} className="text-grey-dark" />
                }
                label={CONNECTION_DISPLAY_NAMES[conn.type] ?? conn.name}
              />
            ))
          )}
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
              className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-stroke text-grey-dark hover:text-grey-darkest transition-colors cursor-pointer"
              style={{ boxShadow: '1px 1px 4px rgba(0,0,0,0.08)' }}
            >
              <Plus size={10} weight="bold" />
            </button>
          }
        >
          {rootFolders.length === 0 ? (
            <p className="px-3 py-2 text-xs text-grey-light font-normal">No folders yet</p>
          ) : (
            rootFolders.map(folder => (
              <SidebarFolderItem
                key={folder.id}
                folder={folder}
                onNavigate={(_projectId, folderId) => {
                  if (folderId) router.push(`/hub/folder/${folderId}`)
                }}
              />
            ))
          )}
        </CollapsibleSection>

      </div>

      {/* Primary project action — pinned to the card's bottom OUTSIDE
          the scroll column (a flex sibling, so it stays put while the
          nav sections scroll behind it). The "Help us improve" card
          moved to the IconRail; this is the persistent "Create view"
          entry point, reachable from every project sub-page. */}
      <div className="shrink-0 px-3 pt-3 pb-3">
        <button
          type="button"
          onClick={openCreateView}
          className="w-full flex items-center justify-center gap-1.5 rounded-full bg-brand hover:bg-brand/90 text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          Create view
        </button>
      </div>

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={patch => projectsCtx.editProject(project.id, patch)}
      />
      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={async () => {
          await projectsCtx.deleteProject(project.id)
          // The project's routes are gone with it — land back home.
          router.replace('/hub/home')
        }}
      />
    </aside>
  )
}
