'use client'

/**
 * Bottom-sheet wrapper around `<SidebarContents>` — the mobile
 * counterpart of the desktop left sidebar. Tapping the burger button
 * in `<MobileTopBar variant="home">` opens this; any nav action
 * inside dismisses it via the `onNavigate` callback `SidebarContents`
 * already wires up (used to be the top-down curtain's dismiss
 * behaviour, repurposed here unchanged).
 *
 * Reuses the same `<BottomDialog>` primitive every other bottom
 * sheet in the app uses (CreateConnection, CreateView, etc.) so the
 * scrim, slide animation, and dismiss-on-backdrop behaviour are
 * consistent across the dashboard.
 *
 * Body variant is `'plain'` so the dashboard cream shows through
 * behind `SidebarContents` — the contents component already paints
 * its own backgrounds row-by-row, no need for the dialog's white
 * card.
 */

import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { SidebarContents } from '@/app/hub/(components)/Sidebar/Sidebar'

interface MobileBurgerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileBurgerSheet({ open, onOpenChange }: MobileBurgerSheetProps) {
  return (
    <BottomDialog open={open} onOpenChange={onOpenChange}>
      <BottomDialog.Page title="Menu" bodyVariant="plain">
        {/*
          A plain wrapper that lets `SidebarContents` paint its own
          rows. We strip the surrounding flex chrome the desktop
          sidebar has (that one is `fixed top-0 left-0 h-screen w-64`
          — none of those constraints apply inside a bottom sheet,
          which already gives the contents a width + scroll boundary).
        */}
        <div className="-mx-2">
          {/* `bounded={false}` drops the desktop sidebar's `flex-1
              min-h-0 overflow-hidden` chain — those constraints
              clip the contents inside a bottom sheet (the sheet's
              own body is the scroll container). */}
          <SidebarContents
            bounded={false}
            onNavigate={() => onOpenChange(false)}
          />
        </div>
      </BottomDialog.Page>
    </BottomDialog>
  )
}
