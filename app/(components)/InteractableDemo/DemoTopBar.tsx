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
import {
  DashboardAgentSwitch,
  type SwitchValue,
} from '@/app/hub/home/(components)/DashboardAgentSwitch'
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

interface DemoTopBarProps {
  /**
   * Dashboard / Agent mode toggle state. Optional — only the home page
   * passes these (so the switch only renders there). The project
   * page omits both props and gets a plain top-bar with just the
   * date pills, matching the real `/hub/project/[id]` page which
   * doesn't host the switch either.
   *
   * When `view === 'agent'` the search + date pills hide (they don't
   * drive the chat surface).
   */
  view?: SwitchValue
  onViewChange?: (next: SwitchValue) => void
}

export function DemoTopBar({ view, onViewChange }: DemoTopBarProps) {
  const { globalDate, setGlobalDateMode, setGlobalDateRange } = useDemoContext()
  const currentRangeLabel =
    RANGE_PRESETS.find(p => p.from === globalDate.from && p.to === globalDate.to)?.label
    ?? 'Custom range'

  // The switch only renders when the parent has wired both props.
  // The project page leaves them undefined; the home page passes
  // both.
  const showSwitch = view !== undefined && onViewChange !== undefined
  // Search + date pills only make sense for the dashboard view (or
  // when no switch is present at all, e.g. project page). In agent
  // view they'd be dead UI sitting next to a chat surface they
  // can't influence — same call the real `/hub/home` makes when
  // the Agent mode toggle is active.
  const showDashboardControls = !showSwitch || view === 'dashboard'

  return (
    // `pt-3 pb-2 px-3` gives a slightly tighter top bar than the real
    // dashboard's `pt-6 pb-2 pr-6` because the demo card itself is
    // smaller and we want as much vertical room as possible for the
    // tile content below.
    //
    // On mobile the burger button (rendered by `<DemoSidebar>`) sits
    // absolute at top-2 / left-2 over this bar — `pl-10` on mobile
    // keeps our row content from sliding under it. Desktop has the
    // sidebar to the left of this bar, so the burger never appears
    // and the padding can collapse back to the standard `px-3`.
    <div className="shrink-0 flex items-center gap-2 pt-3 pb-4 pr-3 pl-10 md:pl-3 bg-background">
      {/* Dashboard / Agent mode switch — leftmost slot on DESKTOP
          only (matches the real `/hub/home`). On mobile the demo
          card is too narrow to fit switch + date pills on one row
          without crushing labels, so `<DemoHomePage>` renders a
          separate full-width switch ROW below this top-bar instead
          — same pattern the production mobile dashboard uses. */}
      {showSwitch && (
        <div className="hidden md:block">
          <DashboardAgentSwitch value={view!} onChange={onViewChange!} />
        </div>
      )}

      {showDashboardControls ? (
        <>
          {/* All three controls below — search + range + mode pill —
              use `h-8` (32 px) so they line up perfectly on the row.
              Previously the search box rendered taller than the date
              pills (the inner `<input>` has its own default line-
              height that overrode the `text-xs leading` we'd set on
              the wrapper); pinning explicit heights eliminates the
              jitter. `px-2.5` and `text-xs` already matched. */}

          {/* Mock search — typing does nothing. Just visual. Hidden on
              mobile: it's the lowest-value control here (read-only anyway)
              and the demo card's mobile width can't fit search + both
              dropdowns without crushing the dropdown labels. Real mobile
              dashboard does the same — its `<MobileTopBar>` hides search
              and exposes a date pill in the corner. */}
          <div className="hidden md:flex flex-1 items-center gap-2 h-8 rounded-md border bg-card px-2.5">
            <MagnifyingGlass size={12} weight="thin" className="text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              // Read-only by intent — this is a demo, search isn't wired.
              readOnly
            />
          </div>

          {/* Mobile-only spacer — claims the flex-1 slot the hidden search
              would have eaten, so the two dropdowns push to the right edge
              instead of huddling against the burger on the left. */}
          <div className="flex-1 md:hidden" />

          {/* Date range pill */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 h-8 rounded-md border bg-card px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
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
            <DropdownMenuTrigger className="flex items-center gap-1 h-8 rounded-md border bg-card px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
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
        </>
      ) : (
        // Agent view — pin the switch to the left and absorb the rest
        // of the row width with a transparent spacer. `h-8` matches
        // the dashboard view's `h-8` pills so the top-bar's height
        // stays identical between views. WITHOUT this, on mobile the
        // top-bar collapsed to just its padding (28 px), which sat
        // ABOVE the burger button (absolute `top-2`, 36 px tall);
        // the burger then overlapped the mobile switch row below.
        // Matching pill height keeps the top-bar at the same 60 px
        // in both views and removes the overlap.
        <div className="flex-1 h-8" />
      )}
    </div>
  )
}
