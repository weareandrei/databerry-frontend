'use client'

/**
 * Bottom-most sidebar row: shows the user's IANA timezone with a 3-dots menu
 * to deep-link into Settings.
 *
 * This row sits *outside* the projects/workspace navigation — it's always
 * visible at the bottom of the sidebar, separated by a `border-t`. The
 * label is the raw IANA name (e.g. `Europe/Bucharest`), which is what's
 * actually applied to every view-fetch query. We deliberately don't show a
 * UTC offset alongside it: zones move (DST), and showing both invites the
 * user to expect them to stay in sync.
 *
 * Click the 3-dots → `Change timezone` → routes to `/hub/settings#timezone`.
 * The hash anchor scrolls the timezone section into view on the settings
 * page.
 */

import { useRouter } from 'next/navigation'
import { DotsThreeVertical, Globe } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUserSettings } from '@/contexts/UserSettingsContext'

export function SidebarTimezone() {
  const router = useRouter()
  const { settings, loading } = useUserSettings()

  // While the initial settings GET is in flight, show a thin placeholder so
  // the row doesn't reflow when the value lands. After that, prefer the
  // persisted value; if the user explicitly cleared it (rare), fall back to
  // a literal "UTC" label.
  const tzLabel =
    !settings && loading ? '—' : settings?.timezone ?? 'UTC'

  return (
    <div className="mt-auto border-t border-stroke px-4 py-2.5 flex items-center gap-2 text-xs text-grey-dark">
      <Globe size={13} weight="bold" className="shrink-0 text-grey-light" />
      <span
        className="flex-1 truncate font-medium"
        title={`Active timezone: ${tzLabel}`}
      >
        {tzLabel}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center justify-center w-5 h-5 rounded shrink-0 cursor-pointer text-grey-light hover:text-grey-darkest hover:bg-hover-fill transition-colors focus:outline-none"
          aria-label="Timezone options"
        >
          <DotsThreeVertical size={14} weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => router.push('/hub/settings#timezone')}>
            Change timezone
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
