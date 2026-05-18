'use client'

import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from './index'
import { setGlobalDateMode } from './slices/uiSlice'
import type { GlobalDateMode } from '@/utils/dateHelpers'

/**
 * localStorage key for the user's last-chosen date-range mode
 * (daily / weekly / monthly). Namespaced under `kontext.` so it
 * sits next to any other per-user UI prefs we persist later, and
 * so it doesn't collide with other apps the user might run on
 * `localhost` during development.
 */
const DATE_MODE_STORAGE_KEY = 'kontext.globalDateMode'

function isValidMode(v: unknown): v is GlobalDateMode {
  return v === 'daily' || v === 'weekly' || v === 'monthly'
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Hydrate the persisted date mode on first client mount, then keep
  // localStorage in sync with subsequent changes.
  //
  // Why an effect (not the slice's initial state):
  //   - `window` is undefined during SSR; the slice's `initialState`
  //     is evaluated in both environments at module load.
  //   - Reading localStorage at module-init on the client would also
  //     cause a hydration mismatch — server HTML was rendered with
  //     the default 'daily' mode, while the client store would start
  //     with the stored value. React would warn and re-render.
  //
  // Trade-off: one extra render on page load when the stored mode
  // differs from the default. That triggers a brief re-fetch in the
  // chart hooks (date range changes → query key changes). Acceptable
  // for a dropdown that sits at the top of every dashboard page; the
  // alternative (refactoring to a per-request store factory) is much
  // bigger than this fix warrants.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DATE_MODE_STORAGE_KEY)
      if (isValidMode(raw) && raw !== store.getState().ui.globalDateMode) {
        // Dispatching the action also rebuilds `globalDateFrom` /
        // `globalDateTo` from the current date — so a user who set
        // "weekly" yesterday sees THIS week's range on load, not a
        // stale stored range from yesterday. We deliberately only
        // persist the mode, not the exact dates.
        store.dispatch(setGlobalDateMode(raw))
      }
    } catch {
      // Private-mode / storage disabled — silently use the default.
      // The dropdown still works in-session; nothing breaks.
    }

    let prev = store.getState().ui.globalDateMode
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().ui.globalDateMode
      if (next !== prev) {
        prev = next
        try {
          window.localStorage.setItem(DATE_MODE_STORAGE_KEY, next)
        } catch {
          /* see note above — best-effort write */
        }
      }
    })
    return unsubscribe
  }, [])

  return <Provider store={store}>{children}</Provider>
}
