'use client'

/**
 * Demo mirror of the real `<ProjectSidebar>` — the floating white/50
 * card that holds a project's identity + nav. Presentational, driven
 * by `DemoContext`:
 *   - Workspace (Overview / Pinned / Ask agent / Connections) → live,
 *     route via `goToPage`.
 *   - Views (Charts / Funnels) + My tools (per-connection pages) → shown
 *     for fidelity but inert (surface the demo notice on click).
 *   - Folders → listed; clicking drops back to Overview where the folder
 *     grid lives.
 *   - "Create view" → opens the real demo create-view modal.
 *   - ⋮ → Rename / Delete the project (window prompt/confirm, like the
 *     rest of the demo's destructive actions).
 */

import { useState } from 'react'
import {
  CaretDown,
  ChartBar,
  ChatCircleDots,
  DotsThreeVertical,
  Folder,
  FunnelSimple,
  Gauge,
  PencilSimple,
  PlugsConnected,
  Plus,
  PushPin,
  Trash,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDemoContext } from './context/DemoContext'
import { DemoCreateViewModal } from './DemoCreateViewModal'

const UNSUPPORTED = "This feature isn't available in the demo."

function NavRow({
  active,
  onClick,
  icon,
  label,
}: {
  active?: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors text-left cursor-pointer ${
        active
          ? 'border border-transparent bg-black/[0.06] text-grey-darkest font-medium'
          : 'border border-transparent text-grey-dark hover:text-grey-darkest hover:bg-black/[0.04]'
      }`}
    >
      <span className="shrink-0 flex items-center transition-transform duration-150 ease-out group-hover:scale-125">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}

function Section({
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
    <div className="mb-5">
      <div className="w-full flex items-center justify-between pl-4 pr-4 mb-1 text-sm text-grey-dark">
        <span
          onClick={() => setCollapsed(v => !v)}
          className="flex-1 text-left cursor-pointer hover:text-grey-darkest transition-colors"
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {action}
          <motion.span
            onClick={() => setCollapsed(v => !v)}
            animate={{ rotate: collapsed ? -90 : 0 }}
            transition={{ duration: 0.15 }}
            className="cursor-pointer hover:text-grey-darkest transition-colors"
          >
            <CaretDown size={11} weight="bold" />
          </motion.span>
        </div>
      </div>
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

export function DemoProjectSidebar({ projectId }: { projectId: string }) {
  const {
    projects,
    folders,
    connections,
    pageOpen,
    currentProjectId,
    goToPage,
    showNotice,
    renameProject,
    deleteProject,
  } = useDemoContext()
  const [createOpen, setCreateOpen] = useState(false)

  const project = projects.find(p => p.id === projectId)
  if (!project) return null

  const isActive = (page: typeof pageOpen) => pageOpen === page && currentProjectId === projectId
  const tools = connections.filter(
    c => c.type !== 'mcp' && (c.projectId == null || c.projectId === projectId),
  )
  const rootFolders = folders.filter(f => f.projectId === projectId && f.parentId === null)

  return (
    <aside className="hidden md:flex flex-col shrink-0 w-52 my-3 mr-1 overflow-hidden bg-white/50 rounded-2xl border border-stroke shadow-card font-semibold tracking-[0.03em]">
      {/* Project identity. */}
      <div className="flex items-center gap-2.5 px-3 pt-3.5 pb-5">
        <ProjectIcon websiteUrl={project.websiteUrl} size={24} pill />
        <span className="flex-1 min-w-0 truncate text-sm font-bold text-grey-darkest">
          {project.name}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Project options"
            className="flex items-center justify-center w-7 h-7 rounded-full border border-stroke bg-white text-grey-dark shadow-sm hover:bg-black/[0.04] transition-colors"
          >
            <DotsThreeVertical size={13} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() => {
                const next = window.prompt('Rename project', project.name)?.trim()
                if (next) renameProject(project.id, next)
              }}
              className="text-sm gap-2"
            >
              <PencilSimple size={13} weight="bold" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (window.confirm(`Delete "${project.name}"? This removes its folders + views.`)) {
                  deleteProject(project.id)
                }
              }}
              className="text-sm gap-2 text-destructive focus:text-destructive"
            >
              <Trash size={13} weight="bold" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <Section label="Workspace">
          <NavRow
            active={isActive('overview')}
            onClick={() => goToPage('overview', projectId)}
            icon={<Gauge size={15} weight="bold" />}
            label="Overview"
          />
          <NavRow
            active={isActive('pinned')}
            onClick={() => goToPage('pinned', projectId)}
            icon={<PushPin size={15} weight="bold" />}
            label="Pinned views"
          />
          <NavRow
            active={isActive('agent')}
            onClick={() => goToPage('agent', projectId)}
            icon={<ChatCircleDots size={15} weight="bold" />}
            label="Ask agent"
          />
          <NavRow
            active={isActive('connections')}
            onClick={() => goToPage('connections', projectId)}
            icon={<PlugsConnected size={15} weight="bold" />}
            label="Connections"
          />
        </Section>

        <Section label="Views">
          <NavRow
            onClick={() => showNotice(UNSUPPORTED)}
            icon={<ChartBar size={15} weight="bold" />}
            label="Charts"
          />
          <NavRow
            onClick={() => showNotice(UNSUPPORTED)}
            icon={<FunnelSimple size={15} weight="bold" />}
            label="Funnels"
          />
        </Section>

        <Section label="My tools">
          {tools.length === 0 ? (
            <p className="px-3 py-2 text-xs text-grey-light font-normal">No tools connected yet</p>
          ) : (
            tools.map(conn => (
              <NavRow
                key={conn.id}
                onClick={() => showNotice(UNSUPPORTED)}
                icon={<ConnectionIcon type={conn.type} size={15} className="text-grey-dark" />}
                label={CONNECTION_DISPLAY_NAMES[conn.type] ?? conn.name}
              />
            ))
          )}
        </Section>

        <Section label="Folders">
          {rootFolders.length === 0 ? (
            <p className="px-3 py-2 text-xs text-grey-light font-normal">No folders yet</p>
          ) : (
            rootFolders.map(folder => (
              <NavRow
                key={folder.id}
                onClick={() => goToPage('overview', projectId)}
                icon={<Folder size={15} weight="bold" />}
                label={folder.name}
              />
            ))
          )}
        </Section>
      </div>

      {/* Primary action, pinned to the bottom outside the scroll column. */}
      <div className="shrink-0 px-3 pt-2 pb-3">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-full bg-brand hover:bg-brand/90 text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          Create view
        </button>
      </div>

      <DemoCreateViewModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        folderId={`${projectId}-root`}
      />
    </aside>
  )
}
