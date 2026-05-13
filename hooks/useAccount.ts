'use client'

/**
 * `useAccount` — reads the signed-in user's account row from
 * Supabase. Currently the only field that matters is `plan_id`,
 * which drives the sidebar tier badge + the tier picker.
 *
 * Why a Supabase-direct hook (not a Redux slice or an API route):
 *   - The `accounts` table is RLS-locked to `auth.uid() = user_id`,
 *     so a direct `select` from the browser-side client is safe —
 *     no risk of leaking other users' rows.
 *   - The plan is a single string field that changes maybe once
 *     in an account's lifetime. A full Redux entity slice + load
 *     thunk would dwarf the actual data.
 *   - The plan is read in exactly one place today (the sidebar
 *     profile). If more callers show up later we can promote this
 *     to a context without changing the API.
 *
 * Returns `'free'` as the safe fallback whenever:
 *   - The user isn't signed in (no `user.id` to query by).
 *   - The query is still in flight.
 *   - The query errored (network, RLS, whatever).
 * — meaning consumers never have to deal with `null` plan IDs.
 * Worst case, a paid-tier user sees free chrome for a render or
 * two; better than crashing the sidebar or showing "undefined".
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { asPlanId, type PlanId } from '@/constants/plans'

interface UseAccountResult {
  planId: PlanId
  loading: boolean
  /** Hard-refresh — used after an upgrade flow completes. */
  refresh: () => void
}

/**
 * Module-level subscriber set. Every mounted `useAccount` instance
 * registers its private `refresh` here; `broadcastAccountRefresh()`
 * (exported below) calls them all.
 *
 * Why: after a Stripe Checkout redirect lands on `/hub?upgraded=…`,
 * the `<BillingReturnHandler>` needs to nudge the sidebar's
 * `<SidebarUserProfile>` (also using `useAccount`) to refetch.
 * Without this bus, the two hook instances would each have their
 * own copy of `planId` state and a refresh in one wouldn't affect
 * the other — so the user would see the success toast but the
 * sidebar would keep showing the stale "Upgrade" label until a full
 * page reload. The bus is intentionally tiny: no context surgery,
 * no Redux slice, just a Set of callbacks invoked synchronously.
 */
const REFRESH_LISTENERS = new Set<() => void>()

export function broadcastAccountRefresh(): void {
  for (const listener of REFRESH_LISTENERS) listener()
}

export function useAccount(): UseAccountResult {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [planId, setPlanId] = useState<PlanId>('free')
  const [loading, setLoading] = useState(true)
  // Manual refresh trigger — bumped by `refresh()`, watched by the
  // effect below. Keeps the API tiny (no `mutate` function exposed).
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!userId) {
      // Signed out — keep the safe default, mark loaded so consumers
      // don't sit in a perpetual loading state on the public pages.
      setPlanId('free')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const supabase = createClient()
    void supabase
      .from('accounts')
      .select('plan_id')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Quiet failure — most likely the row doesn't exist yet
          // because the `handle_new_user` trigger hasn't fired
          // (race between auth signup and the DB trigger). Free is
          // the right fallback in every error case anyway.
          setPlanId('free')
        } else {
          setPlanId(asPlanId(data?.plan_id))
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, refreshTick])

  const refresh = useCallback(() => setRefreshTick(t => t + 1), [])

  // Subscribe to broadcasts from `broadcastAccountRefresh()`.
  // Triggered by the post-Checkout return handler so every mounted
  // `useAccount` consumer (sidebar, billing handler itself, future
  // pricing CTAs) sees the new plan without a page reload.
  useEffect(() => {
    REFRESH_LISTENERS.add(refresh)
    return () => {
      REFRESH_LISTENERS.delete(refresh)
    }
  }, [refresh])

  return { planId, loading, refresh }
}
