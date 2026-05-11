'use client'

/**
 * Demo mobile-only flat projects list — mirrors the real
 * `<MobileProjectsList>` (`app/hub/(components)/mobile/...`) at the
 * demo card's smaller scale.
 *
 * On phones the demo home swaps from the desktop's stacked
 * `<DemoProjectView>` cards (each with their own folder grid,
 * overview lane, and tile grid inline) to this flat list. Tapping a
 * row routes via `goToPage('project', id)` to the dedicated demo
 * project page — same single-project drill-down flow the real
 * dashboard does on mobile.
 *
 * Stacking every full project body on a phone produced two problems:
 *   1. The demo card is only `w-[76vw]` tall (~285 px wide /
 *      ~440 px tall). Two full project bodies + their composite
 *      overview lanes overflowed the card by several screens' worth.
 *   2. The sticky project-header pattern (`sticky top-0`) doesn't
 *      add value on a card the size of one body anyway — it was
 *      designed for the full-viewport home page.
 *
 * No "+ New project" footer here (vs. the real list) — the demo
 * doesn't surface project creation anywhere else either, and adding
 * a one-click "+ New project" path would create an empty project
 * the user then has to populate to make the demo interesting. The
 * two seeded projects (Acme, Side) carry the showcase weight.
 */

import { CaretRight } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { useDemoContext } from '../context/DemoContext'
import type { DemoProject } from '../context/DemoContext'

// Force `<ProjectIcon>` into its Cube-pill fallback regardless of
// whether the demo project carries a `websiteUrl`. Acme's seed has
// `websiteUrl: 'https://acme.example.com'` set — passing that to
// `<ProjectIcon>` triggers a favicon fetch that hits the open
// internet, which we don't want on the marketing page (slow + may
// 404 + leaks visitor presence to a third-party DNS). The sidebar
// already uses `<Cube>` directly for the same reason.
const NO_FAVICON: string | null = null

interface DemoMobileProjectsListProps {
  projects: DemoProject[]
}

export function DemoMobileProjectsList({ projects }: DemoMobileProjectsListProps) {
  const { goToPage } = useDemoContext()

  if (projects.length === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        No projects yet.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-stroke bg-white shadow-card overflow-hidden">
      {projects.map((project, index) => (
        <button
          key={project.id}
          type="button"
          onClick={() => goToPage('project', project.id)}
          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover-fill ${
            index < projects.length - 1 ? 'border-b border-stroke/60' : ''
          }`}
        >
          {/* Always the Cube-pill fallback — see `NO_FAVICON` comment
              above for why we don't reach for the project's
              `websiteUrl`. Size 24 px (vs. real's 28 px) to keep rows
              shallow inside the narrower demo card. */}
          <ProjectIcon
            websiteUrl={NO_FAVICON}
            size={24}
            pill
          />
          <span className="flex-1 truncate text-sm font-semibold text-grey-darkest">
            {project.name}
          </span>
          <CaretRight size={12} weight="bold" className="text-grey-light shrink-0" />
        </button>
      ))}
    </div>
  )
}
