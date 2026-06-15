'use client'

/**
 * Global "refresh all views" bus.
 *
 * Every view data hook subscribes via `useViewRefreshNonce()` and
 * includes the returned nonce in its fetch-effect deps, so a single
 * `broadcastViewRefresh()` re-fetches EVERY mounted tile at once
 * (charts, value tiles, lists, the overview composite — all of them).
 * Fired by the project sidebar's "Refresh all" menu item.
 *
 * Module-level `Set` of subscribers, identical in spirit to
 * `broadcastAccountRefresh` in `hooks/useAccount` — no Redux, no
 * context, just a tiny pub-sub so the call site stays one line.
 */

import { useEffect, useState } from 'react'

const listeners = new Set<() => void>()

/** Tell every mounted view data hook to re-fetch now. */
export function broadcastViewRefresh(): void {
  for (const listener of listeners) listener()
}

/**
 * Returns a counter that increments on every `broadcastViewRefresh()`.
 * Include it in a fetch effect's dependency array to re-run the fetch
 * on a global refresh.
 */
export function useViewRefreshNonce(): number {
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    const bump = () => setNonce(n => n + 1)
    listeners.add(bump)
    return () => {
      listeners.delete(bump)
    }
  }, [])
  return nonce
}
