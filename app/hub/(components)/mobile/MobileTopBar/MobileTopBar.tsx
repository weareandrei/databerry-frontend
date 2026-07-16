'use client'

/**
 * Mobile top bar — replaces the desktop search-bar / date-pickers
 * area on phones. Three variants share the same skeleton so the
 * burger / period-button affordances are pixel-identical between
 * every page:
 *
 *   `home`    →  [☰]                              [Monthly ▾]
 *   `project` →  [☰]  [logo] Project name         [Monthly ▾]
 *   `page`    →  [☰]  Page title                  [right slot]
 *
 * Project pages use the same burger as home — the sheet then shows
 * the project workspace menu (Overview / Connections / Timeline /
 * Ask agent). Nested subpages (e.g. MCP connections) can still pass
 * `onBack` on the `page` variant for a return arrow.
 *
 * Visibility is `lg:hidden` — desktop never paints this. Pages
 * render the desktop chrome separately under `hidden lg:flex`.
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
      projectId: string
      /** Project favicon shown left of the name. */
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
       * burger is replaced with a back arrow — used by nested
       * subpages (e.g. `/hub/connections/mcp` → `/hub/connections`).
       */
      onBack?: () => void
    }

type MobileTopBarProps = Variant

function modeLabel(mode: 'daily' | 'weekly' | 'monthly'): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

export function MobileTopBar(props: MobileTopBarProps) {
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)

  // Burger on home + project + page (default). Back-arrow only when a
  // `page` variant opts in via `onBack` (nested subpages).
  const backHandler: (() => void) | undefined =
    props.variant === 'page' ? props.onBack : undefined
  const showsBurger = !backHandler
  const centerTitle =
    props.variant === 'project'
      ? props.projectName
      : props.variant === 'page'
        ? props.title
        : null
  const projectId = props.variant === 'project' ? props.projectId : undefined

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 pt-3 pb-3 px-3 bg-white border-b border-stroke">
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

        {props.variant === 'project' && (
          <ProjectIcon
            websiteUrl={props.projectWebsiteUrl ?? null}
            size={26}
            pill={false}
          />
        )}

        {centerTitle !== null && (
          <h1 className="flex-1 min-w-0 truncate text-lg font-semibold text-foreground">
            {centerTitle}
          </h1>
        )}

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

      <MobileBurgerSheet
        open={burgerOpen}
        onOpenChange={setBurgerOpen}
        projectId={projectId}
      />
      <MobileDateSheet open={dateOpen} onOpenChange={setDateOpen} />
    </>
  )
}
