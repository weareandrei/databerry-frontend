'use client'

/**
 * Log in — Supabase password auth + Google OAuth.
 *
 * Same visual chrome as the signup page (shader background + phone
 * bezel + glassmorphism card). Both pages stay structurally
 * symmetric so a user toggling between them via the "Already have an
 * account? / Don't have an account?" link doesn't feel a layout
 * shift.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Warning } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/app/(components)/navbar'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import { GoogleButton } from '@/app/(auth)/(components)/GoogleButton'
import { EVENT, trackEvent } from '@/lib/posthog'

/**
 * Translate Supabase's terse error messages into something a user can
 * actually act on. Supabase returns the same `Invalid login
 * credentials` for both "wrong password" and "no such account" (a
 * security-by-obscurity choice on their end). We can't disambiguate
 * those, but we *can* spell out the ambiguity. "Email not confirmed"
 * is the other common one — that one we can name precisely.
 */
function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return (
      "Email or password didn't match. Double-check both — and if you " +
      "just signed up, make sure you've clicked the confirmation link " +
      'in your email.'
    )
  }
  if (lower.includes('email not confirmed')) {
    return (
      'Your email address hasn\'t been confirmed yet. Check your inbox ' +
      '(and spam) for the confirmation link we sent when you signed up.'
    )
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many login attempts. Wait a minute and try again.'
  }
  // Default — surface Supabase's message verbatim so the user has *something*
  // to go on, even if we don't have a tailored translation for it.
  return message
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  // Inline error replaces the previous toast — toasts disappear after
  // a few seconds, which is exactly when the user is still reading
  // and trying to figure out what to fix. The banner persists until
  // the next submit attempt.
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(friendlyAuthError(authError.message))
      setLoading(false)
      return
    }

    trackEvent(EVENT.LOGGED_IN, { method: 'email' })
    router.push('/hub/home')
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      <CanvasBackground />
      <PhoneBezel />
      <Navbar />

      {/* Centered card — mirrors the signup page exactly. */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 md:px-6 min-h-screen">
        <div className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-md">
          <div className="bg-white/35 backdrop-blur-sm p-3 md:p-4">
            <div className="bg-white rounded-xl px-5 md:px-8 py-7 md:py-10">
              <div className="mb-5 md:mb-7">
                <p className="text-xs font-medium text-orange-500 uppercase tracking-widest mb-2">
                  Welcome back
                </p>
                <h2
                  className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 leading-[1.1]"
                  style={{ fontFamily: 'var(--font-bricolage)' }}
                >
                  Log in to Databerry
                </h2>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  Pick up where you left off.
                </p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-black transition-colors disabled:opacity-60"
                >
                  {loading ? 'Logging in…' : 'Log in'}
                </button>
              </form>

              {/*
                Inline error banner. Persists across edits (cleared on
                next submit) so the user can read the hint while
                fixing the inputs. Tone matches the amber pattern used
                by the connection forms — these are *fixable* errors.
              */}
              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <Warning size={14} weight="bold" className="shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <GoogleButton label="Log in with Google" />

              <p className="mt-6 text-center text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-medium text-gray-900 hover:underline"
                >
                  Sign up
                </Link>
              </p>
              <p className="mt-2 text-center text-xs text-gray-400">
                Trouble signing in?{' '}
                <Link
                  href="/forgot-password"
                  className="font-medium text-gray-700 hover:text-gray-900 hover:underline"
                >
                  Reset your password
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
