'use client'

/**
 * Landing page for the password-reset email link.
 *
 * Supabase's `resetPasswordForEmail` sends a magic link that, when
 * clicked, lands here with either:
 *   - `?code=<recovery>` (PKCE / new flow) → exchange via
 *     `supabase.auth.exchangeCodeForSession`
 *   - `#access_token=…&type=recovery` (implicit / older flow) →
 *     Supabase's client picks it up automatically because we have
 *     `detectSessionInUrl: true` (the default).
 *
 * Either way, by the time the page mounts and Supabase has had a tick
 * to process the URL, there's an active "recovery" session — meaning
 * the user is signed in but limited to just one operation:
 * `updateUser({ password })`. After that succeeds, the recovery
 * session becomes a normal session and the user can use the rest of
 * the app.
 *
 * This is the canonical path for users whose Google-OAuth-only
 * accounts can't sign in normally — they request a reset, click the
 * email, set a password here, and from then on can log in with
 * email + password.
 *
 * Lives outside the `(auth)` route group at `/auth/reset-password`
 * (sibling to `/auth/callback`) so the URL Supabase emails matches
 * the natural pattern of "auth-flow callbacks live under /auth".
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Warning } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/app/(components)/navbar'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'

function ResetPasswordPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Three states for the recovery session check:
  //   - 'checking': page just mounted, haven't yet figured out if
  //     the user has a valid recovery session.
  //   - 'ready': recovery session active — show the form.
  //   - 'invalid': link expired / malformed / already used. Direct
  //     the user back to /forgot-password.
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>(
    'checking',
  )

  // On mount: handle whichever flow Supabase used to ship the
  // recovery credentials. The PKCE `?code=` flow needs an explicit
  // exchange; the implicit `#access_token=` flow is handled by the
  // SDK automatically (we just have to wait a tick for it to settle).
  //
  // The moment a recovery session is established, we IMMEDIATELY mark
  // `user_metadata.password_reset_pending = true`. The middleware
  // reads that flag on every request and bounces the user back to
  // this page until they actually set a new password — closing the
  // "click the link, get full access without ever changing your
  // password" hole.
  //
  // FAIL CLOSED: if we can't write the flag (network blip, RLS
  // weirdness), we sign the user out instead of leaving them in an
  // unrestricted recovery session. Better to make them request a
  // fresh link than to silently grant access.
  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')

    const init = async () => {
      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            setStatus('invalid')
            return
          }
        }
        // Either path leaves us with a session in the SDK now.
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          setStatus('invalid')
          return
        }

        // Mark the session as needing a password set. Failure here is
        // a security hazard — better to sign out than continue.
        const { error: flagError } = await supabase.auth.updateUser({
          data: { password_reset_pending: true },
        })
        if (flagError) {
          await supabase.auth.signOut().catch(() => {})
          setStatus('invalid')
          setError(
            "Couldn't start the password reset flow. Request a fresh " +
              'link from the Forgot Password page.',
          )
          return
        }

        setStatus('ready')
      } catch {
        setStatus('invalid')
      }
    }
    init()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    // Clear the `password_reset_pending` flag in the same call that
    // sets the new password. The middleware reads this flag on every
    // request and bounces protected routes to /auth/reset-password
    // while it's true; flipping it to false in the same write means
    // the redirect that follows lands cleanly at /hub/home.
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { password_reset_pending: false },
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Password set — user now has a normal session, flag cleared.
    // Hard navigate (not router.push) so the middleware revalidates
    // the session on a fresh request — same reasoning as the signOut
    // hard-navigate.
    if (typeof window !== 'undefined') {
      window.location.replace('/hub/home')
    } else {
      router.push('/hub/home')
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      <CanvasBackground />
      <PhoneBezel />
      <Navbar />

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 min-h-screen">
        <div className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-md">
          <div className="bg-white/35 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl px-8 py-10">
              {status === 'checking' ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <p className="text-sm text-gray-500">Verifying your link…</p>
                </div>
              ) : status === 'invalid' ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Warning
                      size={22}
                      weight="bold"
                      className="text-amber-600"
                    />
                  </div>
                  <h2
                    className="text-2xl font-semibold text-gray-900"
                    style={{ fontFamily: 'var(--font-bricolage)' }}
                  >
                    Link expired or invalid
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Reset links expire after a short while and can only be
                    used once. Request a fresh one to continue.
                  </p>
                  <Link
                    href="/forgot-password"
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black transition-colors"
                  >
                    Send a new link
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-7">
                    <p className="text-xs font-medium text-orange-500 uppercase tracking-widest mb-2">
                      Account recovery
                    </p>
                    <h2
                      className="text-3xl font-semibold tracking-tight text-gray-900 leading-[1.1]"
                      style={{ fontFamily: 'var(--font-bricolage)' }}
                    >
                      Set a new password
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                      You&apos;ve been signed in to recover your account.
                      Set a new password to continue — until you do, the
                      rest of the dashboard is locked. Pick something at
                      least 6 characters; you&apos;ll be able to log in
                      with email + password from now on.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                      type="password"
                      placeholder="New password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      autoFocus
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400"
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={loading || !password || !confirmPassword}
                      className="w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-black transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Saving…' : 'Set password'}
                    </button>
                  </form>

                  {error && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <Warning size={14} weight="bold" className="shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{error}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  // `useSearchParams` requires a Suspense boundary in App Router so
  // the page can statically render its non-search-param chrome while
  // the search params hydrate.
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  )
}
