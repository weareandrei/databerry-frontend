'use client'

/**
 * Demo mirror of the real `<IconRail>` — the 64px icon spine on the
 * left of every hub page. Presentational + driven by `DemoContext`:
 * navigation goes through `goToPage` (not the Next router), and the
 * inert utilities (new project, settings, sign out) surface the "not
 * available in the demo" notice instead of doing anything real.
 *
 * Laid out as a flex column INSIDE the demo card (the real rail is
 * `fixed` to the viewport — here it's a normal flex child so it stays
 * within the scaled demo frame).
 *
 * Desktop-only (`hidden md:flex`) — exactly like the real `<IconRail>`.
 * On mobile the demo navigates via the burger + bottom-sheet in
 * `<DemoMobileNav>` (the mirror of the real `<MobileTopBar>` burger).
 */

import Image from 'next/image'
import {
  House,
  SquaresFour,
  Plus,
  Gear,
  SignOut,
} from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { useDemoContext } from './context/DemoContext'

const UNSUPPORTED = "This feature isn't available in the demo."

export const DemoIconRail = () => {
  const { projects, pageOpen, currentProjectId, goToPage, showNotice } = useDemoContext()

  return (
    <aside className="hidden md:flex flex-col items-center shrink-0 w-14 py-4 gap-2">
      {/* Logo — doubles as the "take me home" affordance. */}
      <button
        type="button"
        onClick={() => goToPage('home')}
        aria-label="Home"
        title="Home"
        className="mb-2 cursor-pointer"
      >
        <Image
          src="/databerry_logo_v2.svg"
          alt="Databerry"
          width={28}
          height={28}
          className="rounded-lg"
        />
      </button>

      <RailButton label="Home" active={pageOpen === 'home'} onClick={() => goToPage('home')}>
        <House size={17} weight="bold" />
      </RailButton>
      <RailButton
        label="Connections"
        active={pageOpen === 'connections' && !currentProjectId}
        onClick={() => goToPage('connections', null)}
      >
        <SquaresFour size={17} weight="bold" />
      </RailButton>

      <div className="w-7 border-t border-stroke my-1.5" />

      {/* Project icons — switch projects (lands on that project's overview). */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-2 [scrollbar-width:none]">
        {projects.map(project => (
          <RailButton
            key={project.id}
            label={project.name}
            active={currentProjectId === project.id}
            onClick={() => goToPage('overview', project.id)}
          >
            <ProjectIcon websiteUrl={project.websiteUrl} size={18} pill={false} />
          </RailButton>
        ))}
        <RailButton label="New project" onClick={() => showNotice(UNSUPPORTED)}>
          <Plus size={15} weight="bold" />
        </RailButton>
      </div>

      {/* Bottom utilities — all inert in the demo. */}
      <div className="flex flex-col items-center gap-2">
        <RailButton label="Settings" onClick={() => showNotice(UNSUPPORTED)}>
          <Gear size={16} weight="bold" />
        </RailButton>
        <RailButton label="Sign out" danger onClick={() => showNotice(UNSUPPORTED)}>
          <SignOut size={16} weight="bold" />
        </RailButton>
      </div>
    </aside>
  )
}

const RailButton = ({
  active,
  danger,
  brand,
  label,
  onClick,
  children,
}: {
  active?: boolean
  danger?: boolean
  brand?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer ${
        brand
          ? 'bg-primary border-transparent text-white hover:bg-primary/90'
          : active
            ? 'bg-white border-stroke shadow-sm text-foreground'
            : danger
              ? 'bg-hover-fill border-transparent text-muted-foreground hover:bg-white hover:border-stroke hover:shadow-sm hover:text-destructive'
              : 'bg-hover-fill border-transparent text-muted-foreground hover:bg-white hover:border-stroke hover:shadow-sm'
      }`}
    >
      {children}
    </button>
  )
}
