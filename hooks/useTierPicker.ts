'use client'

/**
 * Tiny pub-sub for opening the global `<TierPickerSheet>` from
 * anywhere in the app. The sheet itself lives inside
 * `<SidebarUserProfile>` (the only thing on-page that "owns" the
 * billing context), but the limit-error toasts need to fire it
 * too without prop-drilling a setter through every callsite.
 *
 * Same pattern `useAccount` uses for its refresh broadcast:
 *   - `openTierPicker()` synchronously calls every registered
 *     listener.
 *   - Mounted listeners (in practice, just one — the sidebar
 *     profile button — but the bus is N→1 safe by design) react
 *     by flipping their local `tierSheetOpen` state.
 *
 * Why module-level and not React Context: a Context would force
 * every dashboard route to be inside a TierPickerProvider, which
 * means landing pages / signup / settings pages that don't render
 * the picker still pay the wrapping cost. A module-level Set is
 * zero-cost when no one is subscribed.
 */

import { useEffect } from 'react'

const LISTENERS = new Set<() => void>()

export function openTierPicker(): void {
  for (const listener of LISTENERS) listener()
}

/**
 * Mounted-only subscription. Registers `handler` on mount,
 * unregisters on unmount. Multiple subscribers are allowed but
 * in practice only `<SidebarUserProfile>` listens.
 */
export function useTierPickerListener(handler: () => void): void {
  useEffect(() => {
    LISTENERS.add(handler)
    return () => {
      LISTENERS.delete(handler)
    }
  }, [handler])
}
