'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, resetUser } from '@/lib/posthog'
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        identifyUser(u.id, { email: u.email })
      } else {
        resetUser()
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
