'use client'

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
 *
 * Colours hardcoded to spec:
 *   - Active   : bg `#EBEBEC`  text `#2E2F30`
 *   - Inactive : no bg          text `#838385`
 *   - Inactive hover: text `#2E2F30` (NO bg change — bg only ever
 *     appears on the active option, so hover doesn't pre-empt it).
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
      className={`flex items-center rounded-xl border bg-white shadow-sm p-1.5 ${
        fullWidth ? 'w-full' : ''
      }`}
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
  // Hover via inline mouseenter/leave instead of Tailwind's `hover:`
  // because we ONLY want a text-colour change (no bg), and a
  // `hover:bg-…` class would pre-empt the active-vs-inactive bg
  // distinction. The transition on `color` makes the hover swap
  // feel smooth instead of binary.
  //
  // `fullWidth` flips each button to `flex-1` + centred text so the
  // two halves split the row 50/50 in the mobile variant. Without
  // it, the buttons size to content (desktop default).
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors cursor-pointer ${
        fullWidth ? 'flex-1 text-center' : ''
      }`}
      style={
        active
          ? { backgroundColor: '#EBEBEC', color: '#2E2F30' }
          : { color: '#838385' }
      }
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.color = '#2E2F30'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.color = '#838385'
      }}
    >
      {children}
    </button>
  )
}
