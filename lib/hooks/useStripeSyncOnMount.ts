'use client'

/**
 * Two related hooks for the live-Stripe-on-mount pipeline:
 *
 *   - `useStripeSyncOnMount(views)` fires `POST /sync-now` for every
 *     unique Stripe connection in `views` on mount. Place at the top
 *     of any Stripe-tile-bearing dashboard surface (project page,
 *     folder page, pinned views).
 *
 *   - `useStripeRefreshListener(connectionId, refresh)` subscribes a
 *     view-tile's `refresh` callback to the `stripe-data-refreshed`
 *     window event. After every successful sync (live-on-mount OR
 *     manual reload from the kebab menu), tiles whose connection
 *     matches re-fetch from the freshly-updated DB.
 *
 * Why this exists: backend webhooks + the nightly reconcile mean a tile's
 * "live value" can be up to 24h stale on first load. Without this hook,
 * a user opening the dashboard at 4pm would see numbers from the 02:00 UTC
 * reconcile (or webhook gaps) — not what they paid for. With this hook:
 *
 *   1. Dashboard mounts → tiles fetch from DB (fast, possibly stale).
 *   2. This hook fires `POST /stripe/connections/:id/sync-now` per
 *      unique Stripe connection in parallel.
 *   3. The backend short-circuits within 60s of a previous sync (DB
 *      throttle) and dedupes parallel requests (in-memory Map). At most
 *      one Stripe API hit per account per minute.
 *   4. After each sync settles (success, throttled, or 2s timeout),
 *      we dispatch `stripe-data-refreshed` so listening view tiles
 *      re-fetch from the freshly-updated DB.
 *
 * The event-based fan-out (instead of returning a `tick` from this hook
 * and threading it down) means callers don't have to plumb a new prop
 * through every view component. Tiles already pick up via
 * `useViewLiveValue`'s listener — see that hook for the receiver side.
 *
 * Safe to call on every mount: if no Stripe views exist, it does nothing.
 * Safe to call multiple times: backend throttle + idempotent upserts.
 */

import { useEffect } from 'react'
import { ALGORITHM } from '@/lib/api'
import type { View } from '@/types/view'

const STRIPE_CONNECTION_TYPES = new Set(['stripe', 'stripe_manual'])

/** Window-event name used to tell view tiles "DB has fresh data, re-fetch". */
export const STRIPE_REFRESH_EVENT = 'stripe-data-refreshed'

export interface StripeRefreshEventDetail {
  connectionId: string
}

/**
 * Fire `POST /sync-now` for each unique Stripe connection in `views` on
 * mount. Settled responses dispatch `stripe-data-refreshed` so listening
 * tiles re-fetch.
 *
 * Pass the FULL view list — the hook filters internally. This avoids
 * each call site reimplementing the same Set-of-connection-ids extraction.
 */
export function useStripeSyncOnMount(views: ReadonlyArray<View> | null | undefined): void {
  // Stable key of unique Stripe connection IDs. JSON.stringify is fine for
  // a Set of strings; the alphabetical sort ensures `[a,b]` and `[b,a]`
  // produce the same key, so a re-render with the same IDs in different
  // order doesn't refire syncs.
  const stripeIds = collectStripeConnectionIds(views)
  const depKey = stripeIds.join('|')

  useEffect(() => {
    if (stripeIds.length === 0) return
    let cancelled = false

    Promise.allSettled(
      stripeIds.map(async id => {
        try {
          await ALGORITHM.syncStripeConnectionNow(id)
          if (cancelled) return
          // Dispatch even on `skipped: 'recent'` — the data IS fresh,
          // tiles should pick it up. Same for `timeout`: the sync may
          // continue in the background, but we don't know when, so the
          // initial DB read is what the user gets until the next mount.
          dispatchRefreshEvent(id)
        } catch {
          // Swallow per-account errors — this is opportunistic. If the
          // sync fails, the user still has DB-cached values, and the
          // next mount or kebab-menu reload retries.
        }
      }),
    ).catch(() => {
      /* unreachable — allSettled never rejects */
    })

    return () => {
      cancelled = true
    }
    // Effect re-runs only when the *set* of Stripe connection IDs changes
    // (e.g. user navigated to a different folder with different views).
    // Re-renders that don't change the set are no-ops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey])
}

function collectStripeConnectionIds(
  views: ReadonlyArray<View> | null | undefined,
): string[] {
  if (!views || views.length === 0) return []
  const ids = new Set<string>()
  for (const v of views) {
    if (!v.connectionId) continue
    if (!v.connectionType) continue
    if (!STRIPE_CONNECTION_TYPES.has(v.connectionType)) continue
    ids.add(v.connectionId)
  }
  return Array.from(ids).sort()
}

function dispatchRefreshEvent(connectionId: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<StripeRefreshEventDetail>(STRIPE_REFRESH_EVENT, {
      detail: { connectionId },
    }),
  )
}

/**
 * Subscribe a Stripe view-tile's `refresh` callback to the global
 * `stripe-data-refreshed` event. When the event fires for the tile's
 * `connectionId`, the tile re-fetches its data from the DB.
 *
 * Bails out cleanly when the inputs aren't valid (no connection, no
 * refresh fn) so it's safe to call unconditionally from a hook that
 * may be inactive.
 */
export function useStripeRefreshListener(
  connectionId: string | null | undefined,
  refresh: (() => void) | undefined,
): void {
  useEffect(() => {
    if (!connectionId) return
    if (!refresh) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<StripeRefreshEventDetail>).detail
      if (detail?.connectionId === connectionId) refresh()
    }
    window.addEventListener(STRIPE_REFRESH_EVENT, handler)
    return () => window.removeEventListener(STRIPE_REFRESH_EVENT, handler)
  }, [connectionId, refresh])
}
