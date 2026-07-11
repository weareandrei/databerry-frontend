'use client'

/**
 * Fixed header strip at the top of the scrollable white body.
 * Wraps the shared search + date controls with a bottom border so
 * the body chrome reads as one surface (sidebar | header / content).
 *
 * Search, date navigator, and Day/Week/Month segment share height so
 * the header row reads as one aligned toolbar (`h-8` on md, `h-10` on lg+).
 */

import { GlobalDateChange } from '@/app/hub/home/(components)/GlobalDateChanger/GlobalDateChange'
import { GlobalDateModeDropdown } from '@/app/hub/home/(components)/GlobalDateChanger/(components)/GlobalDateModeDropdown'
import { SearchBar, SearchFocusShortcutHint } from '@/components/SearchBar'

export interface DashboardHeaderProps {
  searchValue?: string
  onSearch?: (next: string) => void
}

export function DashboardHeader({ searchValue, onSearch }: DashboardHeaderProps) {
  return (
    <header className="hidden md:flex shrink-0 items-center gap-3 border-b border-stroke bg-white px-6 py-3">
      {onSearch && (
        <SearchBar
          value={searchValue ?? ''}
          onChange={onSearch}
          rightSlot={<SearchFocusShortcutHint className="hidden lg:inline-flex" />}
          focusOnShortcut
        />
      )}
      <div className="flex-1" />
      <GlobalDateChange />
      <GlobalDateModeDropdown />
    </header>
  )
}
