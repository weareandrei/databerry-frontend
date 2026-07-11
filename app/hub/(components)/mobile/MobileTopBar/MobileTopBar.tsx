'use client'

/**
 * Mobile top bar — replaces the desktop search-bar / date-pickers
 * area on phones. Three variants share the same skeleton so the
 * burger / back / period-button affordances are pixel-identical
 * between every page:
 *
 *   `home`    →  [☰]                              [Monthly ▾]
 *   `project` →  [←]  Project name                [Monthly ▾]
 *   `page`    →  [☰]  Page title                  [right slot]
 *
 * The `page` variant is the catch-all for non-analytics surfaces
 * (Settings, Connections, Agent) — it doesn't render the period
 * button (no global-date concept on those pages) and exposes a
 * generic `rightSlot` so each page can hand in its own optional
 * inline action (e.g. `+` on Connections, Trash on Agent). When
 * `rightSlot` is omitted the right side is empty and the title
 * flexes into it.
 *
 * Bottom-sheet state for both buttons is managed *inside* this
 * component so the parent page just renders `<MobileTopBar
 * variant="home" />` and gets a fully wired bar. Keeps mobile
 * page-level files small (they barely deal with chrome — just
 * mount the bar and the body).
 *
 * Visibility is `md:hidden` — desktop never paints this. Pages
 * render the desktop chrome separately under `hidden md:flex`.
 */

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { ArrowLeft, CaretDown, List } from '@phosphor-icons/react'
import type { RootState } from '@/store'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { MobileBurgerSheet } from './(components)/MobileBurgerSheet'
import { MobileDateSheet } from './(components)/MobileDateSheet'

type Variant =
  | { variant: 'home' }
  | {
      variant: 'project'
      projectName: string
      onBack: () => void
      /** Project favicon shown left of the back arrow (the leftmost
       *  element). Pass the project's `websiteUrl`; null → Cube. */
      projectWebsiteUrl?: string | null
    }
  | {
      variant: 'page'
      title: string
      /**
       * Optional inline action — appears on the right where the
       * period button sits in the other variants. Pages pass an
       * icon-only button (e.g. `+` on Connections, Trash on
       * Agent). Settings passes nothing → the right slot is empty
       * and the title flexes into it.
       */
      rightSlot?: React.ReactNode
      /**
       * Optional back-button handler. When provided, the left
       * burger is replaced with a back arrow that fires this
       * callback — same chrome as the `project` variant. Used by
       * subpages that nest under a parent screen (e.g.
       * `/hub/connections/mcp` → `/hub/connections`), so users see
       * a clear "return to parent" affordance instead of the
       * generic burger.
       */
      onBack?: () => void
    }

type MobileTopBarProps = Variant

// Capitalise the redux mode label for display ("monthly" → "Monthly").
function modeLabel(mode: 'daily' | 'weekly' | 'monthly'): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

export function MobileTopBar(props: MobileTopBarProps) {
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)

  // Left button is the burger on home + page (default), back-arrow
  // on project, OR back-arrow on a `page` that opted in via `onBack`.
  // Center text shows on project + page; home leaves it empty so the
  // period button flexes into the available space.
  // Right slot is the period button on home + project, or the page's
  // own optional `rightSlot` on the page variant.
  const backHandler: (() => void) | undefined =
    props.variant === 'project'
      ? props.onBack
      : props.variant === 'page'
        ? props.onBack
        : undefined
  const showsBurger = !backHandler
  const centerTitle =
    props.variant === 'project'
      ? props.projectName
      : props.variant === 'page'
        ? props.title
        : null

  return (
    <>
      {/*
        `fixed top-0 left-0 right-0 z-40` pins the bar to the viewport
        on mobile so it stays put while the body scrolls — gives the
        same persistent-header UX every other mobile dashboard has.
        `md:hidden` keeps it gone on desktop entirely. The reserved
        60-px gutter below the bar lives on `<main>` in `hub/layout.tsx`
        (`pt-[60px] md:pt-0`); pages don't need to add their own
        spacer.
      */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 pt-3 pb-3 px-4 bg-white border-b border-stroke">
        {/* Left slot — burger or back arrow. Same circular icon-button
            chrome both ways so the bar reads as one consistent unit. */}
        {showsBurger ? (
          <button
            type="button"
            onClick={() => setBurgerOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-stroke bg-white shadow-pill text-foreground hover:bg-hover-fill transition-colors shrink-0"
          >
            <List size={16} weight="bold" />
          </button>
        ) : (
          <button
            type="button"
            onClick={backHandler}
            aria-label="Back"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-stroke bg-white shadow-pill text-foreground hover:bg-hover-fill transition-colors shrink-0"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
        )}

        {/* Project favicon — sits just after the back arrow, before the
            project name (so the bar reads "← [logo] Project name").
            Identifies which project you're inside at a glance. */}
        {props.variant === 'project' && (
          <ProjectIcon
            websiteUrl={props.projectWebsiteUrl ?? null}
            size={26}
            pill={false}
          />
        )}

        {/* Center slot — project name (project variant) / page title
            (page variant) / empty on home. `flex-1 truncate` keeps the
            text bounded so long titles don't shoulder the right slot
            off-screen. */}
        {centerTitle !== null && (
          <h1 className="flex-1 min-w-0 truncate text-lg font-semibold text-foreground">
            {centerTitle}
          </h1>
        )}

        {/* Right slot — period button on home + project; the page's
            own custom slot on `page`. The page variant may pass nothing
            (e.g. Settings); we render an empty placeholder div with the
            same width as the burger so the title stays visually
            centred when there's no action. */}
        {props.variant === 'page' ? (
          props.rightSlot ?? <div className="w-9 h-9 shrink-0" aria-hidden />
        ) : (
          <button
            type="button"
            onClick={() => setDateOpen(true)}
            aria-label="Date range"
            className="flex items-center gap-1.5 h-9 rounded-lg border border-stroke bg-white px-3 text-sm font-medium text-foreground hover:bg-hover-fill transition-colors shadow-sm shrink-0"
          >
            {modeLabel(mode)}
            <CaretDown size={11} weight="bold" className="text-subtle" />
          </button>
        )}
      </header>

      <MobileBurgerSheet open={burgerOpen} onOpenChange={setBurgerOpen} />
      <MobileDateSheet open={dateOpen} onOpenChange={setDateOpen} />
    </>
  )
}
