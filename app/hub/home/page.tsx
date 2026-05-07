'use client'

import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import type { RootState } from '@/store'
import { GlobalDateChange } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateChange'
import { GlobalDateModeDropdown } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateModeDropdown'
import { ProjectsGrid } from '@/app/hub/home/(components)/ProjectsGrid/ProjectsGrid'
import PinnedViews from "@/app/hub/home/(components)/PinnedViews";
import { WelcomeEmpty } from '@/app/hub/home/(components)/WelcomeEmpty'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { MobileHomeBody } from '@/app/hub/(components)/mobile/MobileHomeBody'

export default function HomePage() {
  const { projects: projectsCtx, pins: pinsCtx } = useDashboard()
  const [query, setQuery] = useState('')

  // Hide the entire pinned section when there's nothing to show — keeps
  // the dashboard clean during initial load and for users who haven't
  // pinned anything yet (no orphan label hovering over an empty area).
  const hasPins = !pinsCtx.loading && pinsCtx.pinnedViews.length > 0

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
      <div className="md:hidden flex-1 flex flex-col bg-main">
        <MobileTopBar variant="home" />
        <MobileHomeBody />
      </div>

      {/* ─── Desktop layout (md+) — UNCHANGED from pre-mobile ────── */}
      <div className="hidden md:flex h-screen flex-col">
      {/* Top bar — fixed at top of the column, no border, no sticky. */}
      <div className="shrink-0 flex items-center gap-4 pt-6 pb-2 pr-6 bg-main">
        <div className="flex-1 flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
          <MagnifyingGlass size={15} weight="bold" className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search your data…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <GlobalDateChange />
        <GlobalDateModeDropdown />
      </div>

      {/* Scrollable content. `min-h-0` is the flex-child trick that
          lets `flex-1 overflow-y-auto` actually shrink instead of
          expanding to fit children's natural height. */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-6 pb-8">
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
                </h2>
                <div className="rounded-xl border border-stroke bg-white shadow-card p-5">
                  <PinnedViews
                    pins={pinsCtx.pinnedViews}
                    unpinView={pinsCtx.unpinView}
                    onConnectionAssigned={pinsCtx.replacePin}
                    projects={projectsCtx.projects}
                  />
                </div>
              </section>
            )}

            {/* ── Projects ─────────────────────────────────────────────
                "Projects" label is `sticky top-0` within this scroll
                container — it stays glued to the top of the visible
                area while every project scrolls past underneath. Each
                project's own header sticks at `top-8` (32 px = the
                label's height) so the two stack cleanly. */}
            <section className="flex flex-col gap-3">
              <h2 className="sticky top-0 z-30 bg-main py-2 px-1 text-xs font-medium uppercase tracking-wider text-grey-light">
                Projects
              </h2>
              <ProjectsGrid projects={projectsCtx.projects} loading={projectsCtx.loading} />
            </section>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
