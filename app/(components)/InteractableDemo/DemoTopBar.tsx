'use client'

/**
 * Demo top bar — replaces the old "Welcome to Databerry!" greeting on
 * the demo home page with a date-range pill + mode dropdown that
 * mirrors the real dashboard's chrome.
 *
 * Both controls are LIVE — they drive `globalDate` in `DemoContext`,
 * which in turn drives every value/chart tile via the CSV time-
 * series aggregation. Mode and range are coupled: picking a range
 * auto-updates the mode label (via `chooseGranularity`), and picking
 * a mode auto-selects a sensible range. The two pills can't drift
 * out of sync.
 *
 * Layout:
 *
 *   [search box (mock)]                          [Range ▾]   [Mode ▾]
 *
 * Search input is inert — purely visual. Typing does nothing. The
 * real product's home page has an active search; mocking that here
 * would mean filtering the demo's two projects, which is a niche
 * feature for a 60-second showcase.
 */

import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDemoContext } from './context/DemoContext'
import type { DateMode } from './context/DemoContext'

// Range presets aligned with the three mode tiers in `DemoContext`'s
// `setGlobalDateMode` so picking either pill yields a consistent
// state — `<DemoContext>`'s `chooseGranularity()` maps these spans
// onto `daily` / `weekly` / `monthly`:
//   - 7 days  → 'day'   bucket  → 'daily' mode label
//   - 30 days → 'week'  bucket  → 'weekly' mode label
//   - 90 days → 'month' bucket  → 'monthly' mode label
const RANGE_PRESETS: { label: string; from: string; to: string }[] = [
  { label: 'Last 7 days',  from: '2026-04-02', to: '2026-04-08' },
  { label: 'Last 30 days', from: '2026-03-10', to: '2026-04-08' },
  { label: 'Last 90 days', from: '2026-01-09', to: '2026-04-08' },
]

const MODE_OPTIONS: { value: DateMode; label: string }[] = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function modeLabel(mode: DateMode): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

export function DemoTopBar() {
  const { globalDate, setGlobalDateMode, setGlobalDateRange } = useDemoContext()
  const currentRangeLabel =
    RANGE_PRESETS.find(p => p.from === globalDate.from && p.to === globalDate.to)?.label
    ?? 'Custom range'

  return (
    // `pt-3 pb-2 px-3` gives a slightly tighter top bar than the real
    // dashboard's `pt-6 pb-2 pr-6` because the demo card itself is
    // smaller and we want as much vertical room as possible for the
    // tile content below.
    <div className="shrink-0 flex items-center gap-2 pt-3 pb-2 px-3 bg-background">
      {/* Mock search — typing does nothing. Just visual. */}
      <div className="flex-1 flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
        <MagnifyingGlass size={12} weight="thin" className="text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Search…"
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          // Read-only by intent — this is a demo, search isn't wired.
          readOnly
        />
      </div>

      {/* Date range pill */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
          <span>{currentRangeLabel}</span>
          <CaretDown size={9} weight="bold" className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {RANGE_PRESETS.map(p => (
            <DropdownMenuItem
              key={p.label}
              onClick={() => setGlobalDateRange(p.from, p.to)}
              className="text-sm"
            >
              {p.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mode dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
          <span>{modeLabel(globalDate.mode)}</span>
          <CaretDown size={9} weight="bold" className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          {MODE_OPTIONS.map(o => (
            <DropdownMenuItem
              key={o.value}
              onClick={() => setGlobalDateMode(o.value)}
              className="text-sm"
            >
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
