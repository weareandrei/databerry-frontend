'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { House, SquaresFour, CaretDown, Plus, Gear } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { SidebarNavItem } from './(components)/SidebarNavItem'
import { SidebarUserProfile } from './(components)/SidebarUserProfile'
import { SidebarFolderItem } from './(components)/SidebarFolderItem'
import { SidebarTimezone } from './(components)/SidebarTimezone'
import { CollapsibleSectionHeader } from './(components)/CollapsibleSectionHeader'
import { useDashboard } from '@/contexts/DashboardContext'
import { usePlanLimits } from '@/hooks/usePlanLimits'

// MOBILE-ONLY surface: the burger in `<MobileTopBar>` opens
// `<MobileBurgerSheet>` (a `BottomDialog`) wrapping this component.
// Desktop navigation lives in `<DashboardSidebar>`.
//
// Pass `onNavigate` to dismiss the sheet on link click — the function
// is called as a parent-level `onClick`, so any navigation that
// bubbles up triggers it.
//
// `bounded=true` keeps the legacy fill-parent layout (`flex-1
// min-h-0` + internal scroll); `bounded=false` is the bottom-sheet
// layout: natural height, the sheet body is the scroll container.
export function SidebarContents({
  onNavigate,
  bounded = true,
}: {
  onNavigate?: () => void
  bounded?: boolean
}) {
  const { folders: foldersCtx, projects: projectsCtx } = useDashboard()
  const { enforceProjectLimit } = usePlanLimits()
  const router = useRouter()
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false)
  const [projectsCollapsed, setProjectsCollapsed] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (id: string) => setExpandedProjects(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Jump to a project (or straight into one of its folders). This
  // surface only exists inside the mobile burger sheet, so the
  // dedicated mobile routes are always the right destination.
  const goToProject = (projectId: string, folderId?: string) => {
    if (folderId) {
      router.push(`/hub/folder/${folderId}`)
    } else {
      router.push(`/hub/project/${projectId}`)
    }
  }

  return (
    <div
      className={
        bounded
          ? 'flex flex-col flex-1 min-h-0 overflow-hidden font-semibold tracking-[0.05em]'
          : 'flex flex-col font-semibold tracking-[0.05em]'
      }
      onClick={onNavigate}
    >
      {/* `px-2` matches the nav `<motion.nav>` wrapper below so the
          profile button's hover-fill starts at the same left edge
          as Home/Connections/Settings — and its right-edge
          chevron lines up vertically with the Workspace / Projects
          section-header chevrons (which sit at the section's
          `pr-5` = 20 px from the sidebar's right edge; `px-2` outer
          + `px-3` trigger inner = 20 px, identical offset). */}
      <div className="px-2 pt-3 pb-7">
        <SidebarUserProfile />
      </div>

      {/* Workspace section */}
      <div className="mb-9">
        <CollapsibleSectionHeader
          label="Workspace"
          collapsed={workspaceCollapsed}
          onToggle={() => setWorkspaceCollapsed(v => !v)}
          variant="mobile"
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
              {/* Agent nav row used to sit here. It's now reached
                  via the Dashboard / Ask-agent switch in the home
                  page's top bar (see `<DashboardAgentSwitch>`),
                  since Agent is conceptually a peer of the
                  dashboard rather than a Connections/Settings-style
                  utility. */}
              <SidebarNavItem href="/hub/connections" label="Connections" icon={SquaresFour} />
              <SidebarNavItem href="/hub/settings" label="Settings" icon={Gear} />
            </motion.nav>
          )}
        </AnimatePresence>
      </div>

      {/* Projects section. On desktop (`bounded`) the section grows
          to fill the gutter and the inner motion.div scrolls
          internally. In the bottom-sheet (`!bounded`) the projects
          list lays out at its natural height; the sheet's own body
          handles scroll. */}
      <div className={bounded ? 'flex-1 overflow-hidden flex flex-col' : 'flex flex-col'}>
        <CollapsibleSectionHeader
          label="Projects"
          collapsed={projectsCollapsed}
          onToggle={() => setProjectsCollapsed(v => !v)}
          variant="mobile"
          action={
            <button
              onClick={e => {
                e.stopPropagation()
                // Gate behind plan limits — fires the upgrade toast
                // and short-circuits when the user has hit their
                // plan's `max_projects` ceiling.
                if (!enforceProjectLimit()) return
                projectsCtx.openModal()
              }}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-stroke text-muted-foreground hover:text-foreground transition-colors"
              // Intentionally a smaller shadow than the shared `shadow-pill` —
              // this is a tight inline action (sidebar `+`), not a section
              // icon, so a lighter drop shadow is more proportionate.
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
                <p className="px-3 py-2 text-xs text-subtle">No projects yet</p>
              ) : (
                projectsCtx.projects.map(project => {
                  const projectFolders = foldersCtx.folders.filter(
                    f => f.projectId === project.id && f.parentId === null
                  )
                  const isExpanded = expandedProjects.has(project.id)
                  const hasFolders = projectFolders.length > 0

                  return (
                    <div key={project.id}>
                      {/*
                        Project row — split into two siblings inside
                        a flex container (no nested buttons): the left
                        button navigates to home + scrolls; the right
                        icon-button toggles the inline folder list.
                        Hover treatment on the caret matches the
                        view-tile 3-dots (`ViewHeader.tsx`) so it reads
                        as a real interactive control.
                      */}
                      <div className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors text-muted-foreground hover:bg-hover-fill hover:text-foreground">
                        <button
                          onClick={() => goToProject(project.id)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <ProjectIcon
                            websiteUrl={project.websiteUrl}
                            size={16}
                            pill={false}
                          />
                          <span className="flex-1 text-left truncate">{project.name}</span>
                        </button>
                        {hasFolders && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              toggleProject(project.id)
                            }}
                            aria-label={isExpanded ? 'Collapse folders' : 'Expand folders'}
                            className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-subtle hover:text-muted-foreground hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors -mr-1"
                          >
                            <motion.span
                              animate={{ rotate: isExpanded ? 0 : -90 }}
                              transition={{ duration: 0.15 }}
                              className="flex"
                            >
                              <CaretDown size={11} weight="bold" />
                            </motion.span>
                          </button>
                        )}
                      </div>

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
                                <SidebarFolderItem
                                  key={folder.id}
                                  folder={folder}
                                  onNavigate={goToProject}
                                />
                              ))}
                              <button
                                onClick={() => foldersCtx.openModal(null, project.id)}
                                className="flex w-full items-center gap-1 rounded-md pr-3 transition-colors cursor-pointer hover:bg-hover-fill text-subtle"
                                style={{ paddingLeft: '26px' }}
                              >
                                <span className="shrink-0">
                                  <Plus size={13} weight="bold" />
                                </span>
                                <span className="py-1.5 text-sm whitespace-nowrap">New folder</span>
                              </button>
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

      {/* Timezone row, pinned to the bottom of the column via its own
          `mt-auto` even when the projects list is short. The
          "Help us improve" suggest card used to sit just above it;
          it now lives at the bottom of the mobile home page instead. */}
      <SidebarTimezone />
    </div>
  )
}

