'use client'

/**
 * Shared desktop top bar for data pages: optional search input on
 * the left, the global period arrows + mode dropdown on the right.
 *
 * Used by /hub/home and the project sub-pages that show date-scoped
 * data (overview, pinned, charts, funnels, tools). Pages WITHOUT
 * dates (connections, agent chat) simply don't render it — per the
 * design, those surfaces have no search/date chrome at all.
 *
 * Desktop-only (`hidden md:flex`) — mobile pages own their chrome
 * via `<MobileTopBar>` (period button lives there).
 */

import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { GlobalDateChange } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateChange'
import { GlobalDateModeDropdown } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateModeDropdown'

interface HubTopBarProps {
  /** Render a functional search input. Omit to leave the left side
   *  as flexible space (dates stay pinned right). */
  search?: {
    value: string
    onChange: (next: string) => void
    placeholder?: string
  }
}

export function HubTopBar({ search }: HubTopBarProps) {
  return (
    // `px-4` matches the body panels' `mx-4` so the search pill's
    // left edge and the date controls' right edge line up exactly
    // with the panel below. `pb-4` = the shared 16-px gap, so
    // navbar→body spacing equals sidebar→body spacing.
    <div className="hidden md:flex shrink-0 items-center gap-4 px-4 pt-3 pb-4">
      {/* Compact, pill-shaped search (not full-width — per design the
          bar hugs the left edge and the dates pin right; the spacer
          between them absorbs the rest). */}
      {search && (
        <div className="flex w-full max-w-[360px] items-center gap-3 rounded-full border border-stroke bg-white px-4 py-2.5 shadow-sm">
          <MagnifyingGlass size={15} weight="bold" className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search.value}
            onChange={e => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'Search your data'}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search.value.length > 0 && (
            <button
              type="button"
              onClick={() => search.onChange('')}
              aria-label="Clear search"
              className="shrink-0 text-muted-foreground hover:text-grey-darkest transition-colors cursor-pointer"
            >
              <X size={13} weight="bold" />
            </button>
          )}
        </div>
      )}
      <div className="flex-1" />
      <GlobalDateChange />
      <GlobalDateModeDropdown />
    </div>
  )
}

/**
 * Loading-state twin of `<HubTopBar>` — same wrapper geometry
 * (`px-4 py-3`, pill on the left, date controls pinned right) so the
 * skeleton occupies the exact height/position the real bar will,
 * with no layout shift when content arrives. Placeholder blocks:
 * the search pill, then the period-nav + mode-dropdown shapes.
 */
export function HubTopBarSkeleton() {
  return (
    <div
      className="hidden md:flex shrink-0 items-center gap-4 px-4 pt-3 pb-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="h-[42px] w-full max-w-[360px] rounded-full bg-black/[0.05]" />
      <div className="flex-1" />
      <div className="h-9 w-44 rounded-lg bg-black/[0.05]" />
      <div className="h-9 w-28 rounded-lg bg-black/[0.05]" />
    </div>
  )
}
