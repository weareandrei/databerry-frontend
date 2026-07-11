'use client'

import { cn } from '@/lib/utils'

/**
 * Two-button segmented switch at the top-left of the home page.
 * Controlled component — the home page owns the
 * `'dashboard' | 'agent'` state and passes it in; the switch is a
 * pure display + click surface. Clicking does NOT navigate to a
 * different route; it just fires `onChange` so the home page can
 * swap which body it renders, with a light fade between the two.
 *
 * Styling matches the search-bar wrapper next to it: same
 * `rounded-xl border bg-white shadow-sm` chrome so the two
 * elements read as a pair. Internal padding is `p-1.5`.
 */

export type SwitchValue = 'dashboard' | 'agent'

interface DashboardAgentSwitchProps {
  value: SwitchValue
  onChange: (next: SwitchValue) => void
  /**
   * Stretch the switch to fill its parent's full width and split the
   * two buttons 50/50. Used on mobile, where the switch sits as a
   * full-bleed row under the topbar; desktop omits this so the
   * switch sizes to its content and sits next to the search bar.
   */
  fullWidth?: boolean
}

export function DashboardAgentSwitch({
  value,
  onChange,
  fullWidth = false,
}: DashboardAgentSwitchProps) {
  return (
    <div
      className={cn(
        'flex items-center rounded-xl border bg-white shadow-sm p-1.5',
        fullWidth && 'w-full',
      )}
    >
      <SwitchButton
        active={value === 'dashboard'}
        onClick={() => onChange('dashboard')}
        fullWidth={fullWidth}
      >
        Dashboard
      </SwitchButton>
      <SwitchButton
        active={value === 'agent'}
        onClick={() => onChange('agent')}
        fullWidth={fullWidth}
      >
        Agent mode
      </SwitchButton>
    </div>
  )
}

interface SwitchButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  fullWidth?: boolean
}

function SwitchButton({ active, onClick, children, fullWidth }: SwitchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1 text-sm font-medium transition-colors cursor-pointer',
        fullWidth && 'flex-1 text-center',
        active
          ? 'bg-hover-fill text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
