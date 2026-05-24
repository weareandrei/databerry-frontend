'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { House, PlugsConnected, Robot, CaretDown, Plus, Gear } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarUserProfile } from './SidebarUserProfile'
import { SidebarPlanBadge } from './SidebarPlanBadge'
import { SidebarFolderItem } from './SidebarFolderItem'
import { SidebarTimezone } from './SidebarTimezone'
import { useDashboard } from '@/contexts/DashboardContext'
import { setProjectNavIntent } from '@/store/slices/uiSlice'
import { useIsMobile } from '@/hooks/useMobileBreakpoint'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import type { AppDispatch } from '@/store'

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

// Exported so the mobile bottom-sheet (`MobileBurgerSheet`) can
// reuse the exact same nav surface as the desktop sidebar. Pass
// `onNavigate` to dismiss the sheet on link click — the function
// is called as a parent-level `onClick`, so any navigation that
// bubbles up triggers it.
//
// `bounded=true` (default) is the desktop sidebar layout: the
// component fills its `<aside>` parent (`flex-1 min-h-0`) and clips
// internally so the projects list scrolls inside the fixed-height
// gutter. `bounded=false` is the bottom-sheet layout: no flex-grow,
// no overflow clipping — the parent (`BottomDialog` body) is the
// scroll container, so we just lay out at natural height.
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
  const dispatch = useDispatch<AppDispatch>()
  const isMobile = useIsMobile()
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false)
  const [projectsCollapsed, setProjectsCollapsed] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (id: string) => setExpandedProjects(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Jump to a project. Two flavours:
  //
  // - Desktop: dispatch a `setProjectNavIntent` and push `/hub/home`.
  //   The home page already owns scroll-to-project + folder-pre-open
  //   logic — landing on home with the intent in state is enough to
  //   trigger it. The intent's nonce bumps every call, so re-clicking
  //   the same project re-fires the consumer's effect.
  //
  // - Mobile: navigate directly to the dedicated route. There's no
  //   inline "scroll to project" pattern on phones — the desktop
  //   home tree isn't even rendered (`hidden md:flex`). When a
  //   `folderId` is supplied, pushing straight to `/hub/folder/<id>`
  //   gives the user the folder's contents on first paint, vs.
  //   landing on the project root and asking them to drill in.
  //
  // `useIsMobile` returns `false` during SSR + first render, then
  // settles after mount. Acceptable here: the desktop sidebar is
  // `hidden md:flex` (clicks fire post-mount, hook is settled), and
  // the mobile burger sheet is opened post-mount too.
  const goToProject = (projectId: string, folderId?: string) => {
    if (isMobile) {
      if (folderId) {
        router.push(`/hub/folder/${folderId}`)
      } else {
        router.push(`/hub/project/${projectId}`)
      }
      return
    }
    dispatch(setProjectNavIntent({ projectId, folderId }))
    router.push('/hub/home')
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
          as Home/Ask AI/Connections/Settings — and its right-edge
          chevron lines up vertically with the Workspace / Projects
          section-header chevrons (which sit at the section's
          `pr-5` = 20 px from the sidebar's right edge; `px-2` outer
          + `px-3` trigger inner = 20 px, identical offset). */}
      <div className="px-2 pt-3 pb-7">
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
        <SectionHeader
          label="Projects"
          collapsed={projectsCollapsed}
          onToggle={() => setProjectsCollapsed(v => !v)}
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
              className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-stroke text-grey-dark hover:text-grey-darkest transition-colors"
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
                      {/*
                        Project row — split into two siblings inside
                        a flex container (no nested buttons): the left
                        button navigates to home + scrolls; the right
                        icon-button toggles the inline folder list.
                        Hover treatment on the caret matches the
                        view-tile 3-dots (`ViewHeader.tsx`) so it reads
                        as a real interactive control.
                      */}
                      <div className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors text-grey-dark hover:bg-hover-fill hover:text-grey-darkest">
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
                            className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-grey-light hover:text-grey-dark hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors -mr-1"
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
                                className="flex w-full items-center gap-1 rounded-md pr-3 transition-colors cursor-pointer hover:bg-hover-fill text-grey-light"
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

      {/* Bottom pair: subscription row above the timezone divider.
          `SidebarTimezone` carries `mt-auto`, which pins this whole
          tail to the bottom of the column even when the projects
          list is short. The subscription row uses the same nav-item
          styling as Home / Ask AI / Settings so it reads as a peer
          of those rather than a piece of profile chrome — and sits
          ABOVE the `border-t` divider that the timezone owns. */}
      <SidebarPlanBadge />
      <SidebarTimezone />
    </div>
  )
}

export function Sidebar() {
  return (
    // Desktop only. Mobile users get the navigation through
    // `<MobileTopBar variant="home">`'s burger, which opens
    // `<MobileBurgerSheet>` (a `BottomDialog` wrapping
    // `SidebarContents`). The previous fixed-position mobile burger
    // button + top-down curtain that lived here is gone — having
    // both surfaces stacked produced "two top headers" on mobile,
    // and the curtain has been replaced by the bottom-sheet UX.
    <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-64 z-30">
      <SidebarContents />
    </aside>
  )
}
