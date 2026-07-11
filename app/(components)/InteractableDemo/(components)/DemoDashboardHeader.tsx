'use client'

import { SearchBar } from '@/components/SearchBar'
import { DemoGlobalDateChange, DemoGlobalDateModeDropdown } from './DemoGlobalDateControls'

export interface DemoDashboardHeaderProps {
  searchValue?: string
  onSearch?: (next: string) => void
}

export function DemoDashboardHeader({ searchValue, onSearch }: DemoDashboardHeaderProps) {
  return (
    <header className="hidden md:flex shrink-0 items-center gap-3 border-b border-stroke bg-white px-6 py-3">
      {onSearch && (
        <SearchBar
          value={searchValue ?? ''}
          onChange={onSearch}
          placeholder="Search…"
        />
      )}
      <div className="flex-1" />
      <DemoGlobalDateChange />
      <DemoGlobalDateModeDropdown />
    </header>
  )
}
