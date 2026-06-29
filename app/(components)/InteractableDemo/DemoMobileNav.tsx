'use client'

/**
 * Mobile navigation for the interactable demo — the mirror of the real
 * dashboard's `<MobileTopBar>` burger + `<MobileBurgerSheet>`.
 *
 * The desktop demo navigates with `<DemoIconRail>` (the left spine) and,
 * inside a project, `<DemoProjectSidebar>` — both are `hidden md:flex`,
 * so on phones there's no visible nav. This component fills that gap:
 *
 *   - A floating burger button pinned to the top-left of the demo
 *     surface (`md:hidden`). The demo pages already reserve room for it
 *     (`DemoTopBar`'s `pl-10`, the connections page's `pt-8`, etc.).
 *   - A `<BottomDialog>` sheet (the same primitive every demo modal
 *     uses) listing the demo's nav: Home, global Connections, the
 *     current project's workspace (Overview / Pinned / Ask agent /
 *     Connections), and a project switcher.
 *
 * All navigation goes through `goToPage` from `DemoContext` (not the
 * Next router); each tap also closes the sheet. The sheet portals into
 * `dialogContainer` so it stays inside the demo surface — full-screen on
 * `/demo`, the card on the landing page.
 */

import { useState } from 'react'
import {
  List,
  House,
  SquaresFour,
  Gauge,
  PushPin,
  ChatCircleDots,
  PlugsConnected,
  Plus,
  CaretRight,
} from '@phosphor-icons/react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { useDemoContext } from './context/DemoContext'
import type { DemoPage } from './context/DemoContext'

const UNSUPPORTED = "This feature isn't available in the demo."

const CARD = 'rounded-xl border border-stroke bg-white shadow-card overflow-hidden'

export const DemoMobileNav = () => {
  const { projects, currentProjectId, pageOpen, goToPage, showNotice, dialogContainer } =
    useDemoContext()
  const [open, setOpen] = useState(false)

  const currentProject = currentProjectId
    ? projects.find(p => p.id === currentProjectId) ?? null
    : null

  const navigate = (page: DemoPage, projectId: string | null = null) => {
    goToPage(page, projectId)
    setOpen(false)
  }

  return (
    <>
      {/* Burger — floats over the top-left of the demo surface on mobile.
          Same chrome as the real `<MobileTopBar>` burger (white circle,
          hairline border, soft shadow) so it reads as a button over any
          page content. Desktop uses the icon rail, so this is hidden. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden absolute top-2 left-2 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-stroke bg-white text-grey-darkest shadow-pill transition-colors hover:bg-hover-fill"
      >
        <List size={16} weight="bold" />
      </button>

      <BottomDialog open={open} onOpenChange={setOpen} container={dialogContainer}>
        <BottomDialog.Page title="Menu" bodyVariant="plain">
          <div className="flex flex-col gap-5">
            {/* Primary nav — global Home + Connections. */}
            <div className={CARD}>
              <NavRow
                icon={<House size={18} weight="bold" />}
                label="Home"
                active={pageOpen === 'home'}
                onClick={() => navigate('home')}
                divider
              />
              <NavRow
                icon={<SquaresFour size={18} weight="bold" />}
                label="Connections"
                active={pageOpen === 'connections' && !currentProjectId}
                onClick={() => navigate('connections', null)}
              />
            </div>

            {/* Current project's workspace — mirrors the desktop
                `<DemoProjectSidebar>` nav, only shown while inside a
                project. */}
            {currentProject && (
              <section>
                <SectionLabel>{currentProject.name}</SectionLabel>
                <div className={CARD}>
                  <NavRow
                    icon={<Gauge size={17} weight="bold" />}
                    label="Overview"
                    active={pageOpen === 'overview'}
                    onClick={() => navigate('overview', currentProject.id)}
                    divider
                  />
                  <NavRow
                    icon={<PushPin size={17} weight="bold" />}
                    label="Pinned views"
                    active={pageOpen === 'pinned'}
                    onClick={() => navigate('pinned', currentProject.id)}
                    divider
                  />
                  <NavRow
                    icon={<ChatCircleDots size={17} weight="bold" />}
                    label="Ask agent"
                    active={pageOpen === 'agent'}
                    onClick={() => navigate('agent', currentProject.id)}
                    divider
                  />
                  <NavRow
                    icon={<PlugsConnected size={17} weight="bold" />}
                    label="Connections"
                    active={pageOpen === 'connections' && currentProjectId === currentProject.id}
                    onClick={() => navigate('connections', currentProject.id)}
                  />
                </div>
              </section>
            )}

            {/* Project switcher. */}
            <section>
              <SectionLabel>Projects</SectionLabel>
              <div className={CARD}>
                {projects.map((project, i) => (
                  <NavRow
                    key={project.id}
                    icon={<ProjectIcon websiteUrl={project.websiteUrl} size={24} pill />}
                    label={project.name}
                    active={currentProjectId === project.id}
                    trailing={
                      <CaretRight size={13} weight="bold" className="shrink-0 text-grey-light" />
                    }
                    onClick={() => navigate('overview', project.id)}
                    divider
                  />
                ))}
                <NavRow
                  icon={<Plus size={15} weight="bold" />}
                  label="New project"
                  onClick={() => {
                    showNotice(UNSUPPORTED)
                    setOpen(false)
                  }}
                />
              </div>
            </section>
          </div>
        </BottomDialog.Page>
      </BottomDialog>
    </>
  )
}

const NavRow = ({
  icon,
  label,
  active,
  trailing,
  divider,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  trailing?: React.ReactNode
  divider?: boolean
  onClick: () => void
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        active ? 'bg-hover-fill' : 'hover:bg-hover-fill'
      } ${divider ? 'border-b border-stroke/60' : ''}`}
    >
      <span className="flex w-7 shrink-0 items-center justify-center text-grey-dark">
        {icon}
      </span>
      <span
        className={`flex-1 truncate text-sm ${
          active ? 'font-semibold text-grey-darkest' : 'font-medium text-grey-dark'
        }`}
      >
        {label}
      </span>
      {trailing}
    </button>
  )
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <h2 className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-grey-light">
      {children}
    </h2>
  )
}
