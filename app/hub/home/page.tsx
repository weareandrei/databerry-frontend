'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector } from 'react-redux'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import type { RootState } from '@/store'
import { GlobalDateChange } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateChange'
import { GlobalDateModeDropdown } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateModeDropdown'
import { ProjectsGrid } from '@/app/hub/home/(components)/ProjectsGrid/ProjectsGrid'
import PinnedViews from "@/app/hub/home/(components)/PinnedViews";
import { WelcomeEmpty } from '@/app/hub/home/(components)/WelcomeEmpty'
import { DashboardAgentSwitch, type SwitchValue } from '@/app/hub/home/(components)/DashboardAgentSwitch'
import { AgentChatBody } from '@/app/hub/agent-chat/AgentChatBody'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { MobileHomeBody } from '@/app/hub/(components)/mobile/MobileHomeBody'

export default function HomePage() {
  const { projects: projectsCtx, pins: pinsCtx } = useDashboard()
  const [query, setQuery] = useState('')
  // The Dashboard / Ask-agent switch at the top of the page toggles
  // this. We don't route between two pages — we keep the same URL
  // (`/hub/home`) and swap the BODY component below with a short
  // fade. `framer-motion`'s `AnimatePresence mode="wait"` runs the
  // exit anim of the current body before mounting the next, giving
  // the user a clear visual signal that the page surface changed.
  const [view, setView] = useState<SwitchValue>('dashboard')

  // ── Search ──────────────────────────────────────────────────────────
  //
  // Simple case-insensitive substring filter on the in-memory projects
  // + pinned-views lists. No new fetches, no API, no debounce — both
  // datasets are already loaded into the DashboardContext, so
  // filtering is just a `.filter` over a few dozen items at most.
  //
  // What matches:
  //   - Projects: project name
  //   - Pinned views: the view's name OR the project name it belongs to
  //     (typing "Taplaunch" surfaces the project AND any of its pins)
  //
  // What we DON'T search (yet):
  //   - View names inside the project tile grid — those views aren't
  //     loaded at the page level (they're fetched per-project by
  //     `<ProjectView>`), so the filter would need new plumbing
  //   - Folder names — same reason
  //   - Connection names — different surface (lives at /hub/connections)
  //
  // Good v1 ceiling: filters down "I have 8 projects, where's the
  // Acme one?" without any backend work.
  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const filteredProjects = useMemo(() => {
    if (!isSearching) return projectsCtx.projects
    return projectsCtx.projects.filter(p =>
      p.name.toLowerCase().includes(normalizedQuery),
    )
  }, [projectsCtx.projects, normalizedQuery, isSearching])

  const filteredPins = useMemo(() => {
    if (!isSearching) return pinsCtx.pinnedViews
    return pinsCtx.pinnedViews.filter(pin => {
      if (pin.name.toLowerCase().includes(normalizedQuery)) return true
      const owningProject = projectsCtx.projects.find(p => p.id === pin.projectId)
      if (owningProject?.name.toLowerCase().includes(normalizedQuery)) return true
      return false
    })
  }, [pinsCtx.pinnedViews, projectsCtx.projects, normalizedQuery, isSearching])

  // Hide the entire pinned section when there's nothing to show — keeps
  // the dashboard clean during initial load and for users who haven't
  // pinned anything yet (no orphan label hovering over an empty area).
  // During search, hide it once no pins match too (otherwise the
  // section header reads as "Pinned views: nothing here" which is
  // visually noisy when the user is clearly looking for something else).
  const hasPins = !pinsCtx.loading && filteredPins.length > 0
  // Whether the search emptied EVERYTHING out — shows the no-matches
  // state so the user knows the search worked, just produced zero
  // results (vs. a generic "nothing here" that would be ambiguous
  // with the initial loading state).
  const noMatches =
    isSearching &&
    filteredProjects.length === 0 &&
    filteredPins.length === 0

  // Zero-projects → welcome panel instead of the labelled
  // pinned/projects sections. With no projects there can't be any
  // views, and with no views nothing can be pinned, so showing those
  // section labels would just dangle over empty space. The welcome
  // panel reuses the existing CreateProjectModal that the sidebar `+`
  // already opens — same flow, different entry point.
  const showWelcome = !projectsCtx.loading && projectsCtx.projects.length === 0

  // Sidebar navigation: when a user clicks a project (or folder) in
  // the sidebar, the sidebar dispatches `setProjectNavIntent` with a
  // bumped nonce. We watch the nonce and smooth-scroll to the
  // project's `<article data-project-id=…>`. Re-clicking the same
  // project re-fires (nonce changes), giving the user a "go back to
  // it" affordance.
  //
  // The retry loop is for the cross-page case: navigating from
  // `/hub/connections` dispatches first, then router.push lands here,
  // and the project's article isn't in the DOM until the projects
  // load + render. ~333 ms at 60 fps is plenty.
  const navIntent = useSelector((s: RootState) => s.ui.projectNavIntent)
  useEffect(() => {
    if (!navIntent.projectId) return
    let cancelled = false
    let attempts = 0
    const tryScroll = () => {
      if (cancelled) return
      const el = document.querySelector(
        `[data-project-id="${navIntent.projectId}"]`,
      )
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (attempts++ < 20) {
        requestAnimationFrame(tryScroll)
      }
    }
    requestAnimationFrame(tryScroll)
    return () => {
      cancelled = true
    }
  }, [navIntent.nonce, navIntent.projectId])

  return (
    /*
      Two layouts in the same tree, gated by Tailwind breakpoints:

        - Desktop (md+) renders the existing `h-screen flex flex-col`
          layout with search bar, sticky labels, and inline project
          cards. UNCHANGED from before this mobile pass.
        - Mobile (<md) renders `<MobileTopBar>` + `<MobileHomeBody>`
          — pinned in single column, projects as a flat list that
          tap-throughs to the dedicated `/hub/project/<id>` page.

      Both trees are present in the DOM; CSS gates visibility. This
      avoids a hydration-mismatch flash on first paint that a
      JS-driven `useIsMobile()` branch would cause.
    */
    <>
      {/* ─── Mobile layout (<md) ──────────────────────────────────── */}
      {/*
        `flex-1` (rather than `min-h-screen`) makes this div fill the
        flex-col `<main>`'s remaining space *after* its `pt-[60px]`
        gutter — without it, `min-h-screen` would push the bottom of
        this div 60 px past the viewport on mobile (because main is
        already 100 vh and this child also asks for 100 vh).
        `<MobileTopBar>` is `position: fixed`, so it doesn't take up
        space in this flex column — `<MobileHomeBody>`'s `flex-1
        overflow-y-auto` fills the entire content area below the bar.
      */}
      {/* Definite-height wrapper on mobile. The hub layout's
          `<main>` is `min-h-screen pt-[60px]` (the 60 px reserves
          space for the fixed `<MobileTopBar>`), which lets the
          element GROW beyond the viewport — fine for a long
          dashboard list (scrolls the page), but lethal for the
          agent surface, where the `flex-1 min-h-0` chain can't
          shrink without a definite-height ancestor. Pinning the
          wrapper to `calc(100dvh - 60px)` — the visible viewport
          minus the topbar gutter — anchors the chain so that:
          (1) the switch + chat chrome stay put,
          (2) the messages get an actual `overflow-y-auto` scroll
              instead of overflowing the page.
          `100dvh` (dynamic viewport height) automatically resizes
          when the mobile browser chrome (URL bar) shows/hides, and
          also when the on-screen keyboard pops up — input stays
          in view, messages just shrink to compensate. */}
      <div className="md:hidden h-[calc(100dvh-60px)] flex flex-col bg-main">
        <MobileTopBar variant="home" />
        {/* Switch row sits right below the fixed topbar, using the
            same horizontal padding (`px-4`) as the content below so
            it ends up flush with the pinned/projects cards. Full
            width so it visually spans the same column as everything
            beneath it. `shrink-0` so it keeps its auto height when
            the parent constraint tightens (e.g. keyboard pops up). */}
        <div className="shrink-0 px-4 pt-4 pb-3">
          <DashboardAgentSwitch
            value={view}
            onChange={setView}
            fullWidth
          />
        </div>
        {/* Body swap — same `AnimatePresence mode="wait"` pattern as
            desktop so the surface change reads consistently across
            form factors. Agent on mobile uses the same
            `<AgentChatBody>` (without its own chrome — the
            topbar+switch above own that role here). */}
        <AnimatePresence mode="wait" initial={false}>
          {view === 'agent' ? (
            <motion.div
              key="mobile-agent"
              className="flex-1 min-h-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <AgentChatBody />
            </motion.div>
          ) : (
            <motion.div
              key="mobile-dashboard"
              className="flex-1 min-h-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MobileHomeBody />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Desktop layout (md+) — UNCHANGED from pre-mobile ────── */}
      <div className="hidden md:flex h-screen flex-col">
      {/* Top bar — fixed at top of the column, no border, no sticky.
          Left-to-right: Dashboard/Ask-agent switch (always visible),
          then a group containing the search bar + period + mode
          pickers. The group fades out when the user flips to "Ask
          agent" since none of those controls drive the chat — only
          the switch remains, anchored on the left. */}
      <div className="shrink-0 flex items-center gap-4 pt-6 pb-2 pr-6 bg-main">
        <DashboardAgentSwitch value={view} onChange={setView} />
        {/* Dashboard-only tools. `AnimatePresence initial={false}`
            skips the entry anim on first paint (so the controls
            don't fade in every page load — only when the user
            switches back from agent → dashboard). 150 ms fade +
            small x-translate gives a subtle "slide away" feel
            without being theatrical. Layout: `flex-1` so the group
            still expands to fill the space between the switch and
            the right edge while it's mounted; the internal `gap-4`
            reproduces the spacing the outer flex used to do
            between search / period / mode. */}
        <AnimatePresence initial={false}>
          {view === 'dashboard' && (
            <motion.div
              key="dashboard-tools"
              className="flex-1 flex items-center gap-4"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex-1 flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
                <MagnifyingGlass size={15} weight="bold" className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search projects and pinned views…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {/* Clear button — only appears once there's something
                    to clear. `aria-label` for screen readers since
                    the X glyph isn't self-describing. */}
                {isSearching && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="shrink-0 text-muted-foreground hover:text-grey-darkest transition-colors"
                  >
                    <X size={13} weight="bold" />
                  </button>
                )}
              </div>
              <GlobalDateChange />
              <GlobalDateModeDropdown />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Body — swaps between the dashboard content and the embedded
          agent chat based on `view`. `AnimatePresence mode="wait"`
          fades the outgoing body out before the incoming one fades
          in (~150 ms each side); the URL stays at `/hub/home` either
          way. The agent body uses a flex-col container (no scroll;
          the chat manages its own message-stream scroll inside);
          the dashboard body keeps `overflow-y-auto` for the
          projects/pins grid. */}
      <AnimatePresence mode="wait" initial={false}>
        {view === 'agent' ? (
          <motion.div
            key="agent"
            className="flex-1 min-h-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AgentChatBody />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            className="flex-1 overflow-y-auto min-h-0 pr-6 pb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
        {showWelcome ? (
          <WelcomeEmpty onCreate={() => projectsCtx.openModal()} />
        ) : (
          <div className="flex flex-col gap-8 pt-3">
            {/* ── Pinned views ─────────────────────────────────────────
                Plain "Pinned views" label (NOT sticky — scrolls away),
                then a white card wrapping the pinned grid. Hidden when
                there's nothing pinned so the label doesn't hover over
                empty space. */}
            {hasPins && (
              <section>
                <h2 className="px-1 mb-3 text-xs font-medium uppercase tracking-wider text-grey-light">
                  Pinned views
                  {isSearching && (
                    <span className="ml-2 normal-case font-normal text-grey-light/80">
                      ({filteredPins.length} matching)
                    </span>
                  )}
                </h2>
                <div className="rounded-xl border border-stroke bg-white shadow-card p-5">
                  <PinnedViews
                    pins={filteredPins}
                    unpinView={pinsCtx.unpinView}
                    onConnectionAssigned={pinsCtx.replacePin}
                    projects={projectsCtx.projects}
                  />
                </div>
              </section>
            )}

            <section className="flex flex-col">
              <h2 className="sticky top-0 z-30 bg-main py-3 px-1 text-xs font-medium uppercase tracking-wider text-grey-light">
                Projects
                {isSearching && (
                  <span className="ml-2 normal-case font-normal text-grey-light/80">
                    ({filteredProjects.length} matching)
                  </span>
                )}
              </h2>
              {noMatches ? (
                <div className="rounded-xl border border-dashed border-stroke bg-white/50 px-6 py-12 text-center">
                  <p className="text-sm text-grey-darkest font-medium">
                    No matches for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-grey-light">
                    Search looks across project names and pinned view names.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-grey-darkest hover:bg-main transition-colors"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <ProjectsGrid projects={filteredProjects} loading={projectsCtx.loading} />
              )}
            </section>
          </div>
        )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  )
}
