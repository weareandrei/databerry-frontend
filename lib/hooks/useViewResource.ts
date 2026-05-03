'use client'

/**
 * `useViewResource` — the one canonical fetch-with-refresh hook every
 * view-card data-source uses.
 *
 * Before: each per-view fetch (Stripe live-value, Calendly meetings,
 * PostHog funnel, etc.) re-implemented the same `useState/useEffect/
 * setLoading/setError/refreshTick` recipe inline, copy-pasted across
 * `ProjectView.tsx`, `folder/[folderId]/page.tsx`, and `PinnedViews.tsx`.
 *
 * After: each call site is ~5 lines — pass a `fetcher` and a `deps`
 * array, get back `{ data, loading, error, refresh }`. The hook owns
 * the unmount-cancel guard, the typed-error discrimination, and the
 * refresh tick; the call site only declares *what* to fetch.
 *
 * ## Why typed errors stay typed
 *
 * The catch path preserves `IntegrationReauthError` and
 * `ConnectionMissingError` *as instances*, not as strings. View cards
 * (`ViewCardChart`, `ViewCardCustomerList`, etc.) do `instanceof`
 * checks against these to render the OAuth-reconnect banner or the
 * click-to-reattach badge respectively — collapsing them to strings
 * would lose that routing. Plain `Error`s are normalised to a
 * user-safe string via `viewErrorMessage()` so backend error text
 * never leaks to the UI.
 *
 * ## Why `null` fetcher means "skip"
 *
 * Some views are gated by view-type (e.g. only run the funnel fetch
 * when `view.type === 'posthog_funnel'`). Returning `null` from the
 * fetcher lambda would still cost a Promise; instead, callers pass
 * `null` *as the fetcher itself* to declare "this hook is inactive
 * for this view". The hook keeps its slot in the render order
 * (rules of hooks) and returns the idle resource shape.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  ConnectionMissingError,
  IntegrationReauthError,
} from '@/lib/api'
import { viewErrorMessage } from '@/lib/errorMessages'

export type ViewResourceError =
  | string
  | IntegrationReauthError
  | ConnectionMissingError

export interface ViewResource<T> {
  data: T | null
  loading: boolean
  error: ViewResourceError | null
  /** Bump `refreshTick`; the next render re-runs the effect. Returns
   *  `undefined` when the hook is inactive, matching the convention
   *  used by `ViewCard*` props (`onRefresh?: () => void`). */
  refresh: (() => void) | undefined
}

export function useViewResource<T>(
  fetcher: (() => Promise<T>) | null,
  deps: ReadonlyArray<unknown>,
): ViewResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ViewResourceError | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!fetcher) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher()
      .then(result => {
        if (cancelled) return
        setData(result)
      })
      .catch(err => {
        if (cancelled) return
        // Preserve typed errors so call sites can route them into the
        // reconnect banner / reattach dialog. Anything else gets the
        // user-safe fallback — backend strings stay out of the UI.
        if (err instanceof IntegrationReauthError) setError(err)
        else if (err instanceof ConnectionMissingError) setError(err)
        else setError(viewErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // The deps array is provided by the caller — they know which
    // upstream values should re-trigger the fetch. `fetcher` itself
    // isn't in the deps because it's typically a fresh closure each
    // render; gating on caller-controlled deps avoids the infinite
    // loop that would come from depending on the function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshTick])

  const refresh = useCallback(() => {
    setRefreshTick(t => t + 1)
  }, [])

  return {
    data,
    loading: fetcher ? loading : false,
    error: fetcher ? error : null,
    refresh: fetcher ? refresh : undefined,
  }
}
