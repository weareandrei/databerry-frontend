'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EVENT, identifyUser, resetUser, trackEvent } from '@/lib/posthog'
import type { User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) {
        resetUser()
        return
      }

      identifyUser(u.id, { email: u.email })

      // ── signed_up / logged_in attribution ────────────────────────
      //
      // Why this lives here, not in the form pages: the OAuth flow
      // (`GoogleButton` → Google → `/auth/callback` → `/hub/home`)
      // bounces through a SERVER route handler that can't fire
      // PostHog. The email/password forms used to fire signed_up /
      // logged_in themselves, which silently dropped ~90% of real
      // signups (every Google user). Centralising it here covers
      // both paths.
      //
      // The two interesting Supabase events:
      //   - `SIGNED_IN`        → real sign-in transition (form submit,
      //                          recovery callback). NOT page reload.
      //   - `INITIAL_SESSION`  → session restoration on mount. Fires
      //                          on EVERY page load, BUT also on the
      //                          OAuth callback redirect (server set
      //                          the session cookie, client picks it
      //                          up here for the first time).
      //
      // Both can carry a fresh sign-in. We dedupe via a localStorage
      // flag keyed on user.id so:
      //   - Fresh user this browser → fire signed_up (created_at fresh)
      //                               or logged_in (older account being
      //                               seen here the first time).
      //   - Already-seen user → fire logged_in only on `SIGNED_IN`
      //                         (not on INITIAL_SESSION page reloads),
      //                         so a refresh doesn't pad the count.
      //
      // The flag is per-browser, never cleared on sign-out — that's
      // intentional. After signing out and back in, we still want
      // logged_in (not signed_up) to fire, even if the user is on
      // the same machine.
      if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return

      const method =
        (u.app_metadata?.provider as string | undefined) ?? 'email'
      const flagKey = `db_first_seen_${u.id}`

      let alreadySeen = false
      try {
        alreadySeen = localStorage.getItem(flagKey) === '1'
      } catch {
        /* private mode / disabled — fall through and treat as unseen */
      }

      if (alreadySeen) {
        // Returning user. Only count an actual sign-in, not the page
        // reload that triggers INITIAL_SESSION on every navigation.
        if (event === 'SIGNED_IN') {
          trackEvent(EVENT.LOGGED_IN, { method })
        }
        return
      }

      // First time we see this user in this browser. Brand-new
      // account (just signed up) vs returning user on a new device
      // is decided by created_at age. 24 h tolerance covers email-
      // confirmation flows where created_at is set on form submit
      // but the user clicks the email link later.
      const createdMs = new Date(u.created_at).getTime()
      const isFreshAccount = Date.now() - createdMs < 24 * 60 * 60 * 1000

      trackEvent(
        isFreshAccount ? EVENT.SIGNED_UP : EVENT.LOGGED_IN,
        { method },
      )

      try {
        localStorage.setItem(flagKey, '1')
      } catch {
        /* private mode — re-firing on next page load is acceptable */
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    // Best-effort flag cleanup — if the user signed in via the
    // password-recovery flow but is bailing out without setting a
    // new password, clear the `password_reset_pending` marker so
    // they aren't trapped in a reset-loop on next login. Failure
    // here is annoying (next login force-bounces them through
    // reset) but not security-relevant — the session is about to
    // be destroyed anyway. Don't block sign-out on it.
    try {
      await supabase.auth.updateUser({
        data: { password_reset_pending: false },
      })
    } catch {
      /* ignore */
    }

    // Best-effort — even if Supabase errors (already signed out,
    // network blip, expired refresh token), we still want to bounce
    // the user out of the authed shell. The alternative is "click
    // sign out, nothing happens, page is silently broken".
    try {
      await supabase.auth.signOut()
    } catch {
      /* swallow — fall through to the redirect */
    }

    // Hard navigate, not `router.push`. Two reasons:
    //   1. Redux + React state from the signed-out user (projects,
    //      connections, view fetches) live in memory. A SPA push
    //      would leave them around until each consumer refetches —
    //      briefly leaking the previous user's data into the login
    //      screen if they sign back in as a different account.
    //   2. The middleware that protects `/hub/*` only fires on
    //      navigation; this *is* the navigation that triggers it.
    // `replace` (not `assign`) so Back doesn't return to a now-401'd
    // /hub page.
    if (typeof window !== 'undefined') {
      window.location.replace('/login')
    }
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
