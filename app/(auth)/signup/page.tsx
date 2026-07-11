'use client'

/**
 * Sign-up — real Supabase auth (`supabase.auth.signUp`).
 *
 * Visual design is lifted from the previous wishlist page (preserved
 * verbatim in the comment block at the bottom of this file): shader
 * gradient background, phone bezel frame, glassmorphism card with a
 * white inner form. Same form chrome the user already saw — just
 * pointed at real account creation now.
 *
 * Two outcomes after a successful `signUp`:
 *
 *   1. Session present in the response → email confirmation is OFF
 *      in this Supabase project, so the user is logged in already.
 *      Push them straight to /hub/home, same as login.
 *   2. No session → email confirmation is ON. Show a "check your
 *      email" success state. They'll come back through
 *      `/auth/callback` after clicking the confirmation link.
 *
 * No DB writes outside of auth — there's no longer a separate
 * `wishlist` table insert. The Supabase trigger that creates the
 * `accounts` row off `auth.users` (referenced in
 * `accounts.service.ts`) handles the user-record bootstrap.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Navbar from '@/app/(components)/navbar'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import { GoogleButton } from '@/app/(auth)/(components)/GoogleButton'
// `signed_up` is now fired centrally from `AuthContext` so it covers
// the OAuth callback path too; no PostHog imports needed here.

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  // After signup succeeds *without* an immediate session, the user
  // has to click a confirmation email. Swap the form for a "check
  // your email" success card — same shape the wishlist used.
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // `signed_up` is NOT fired here — it's centralised in
    // `AuthContext.onAuthStateChange`, which catches BOTH this path
    // (email/password) and the OAuth callback path (Google,
    // GitHub, …) that we can't instrument from the form. Before
    // that move, ~90% of signups were silently dropped because
    // OAuth bounces through a server route that can't run PostHog.
    if (data.session) {
      // Email confirmation disabled — user is logged in.
      router.push('/hub/home')
      return
    }

    setNeedsConfirmation(true)
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      <CanvasBackground />
      <PhoneBezel />
      <Navbar />

      {/* Centered card — same chrome the wishlist page used. */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 md:px-6 min-h-screen">
        <div className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-md">
          {/* Outer semi-transparent wrapper (glassmorphism). */}
          <div className="bg-white/35 backdrop-blur-sm p-3 md:p-4">
            {/* Inner fully white form area. */}
            <div className="bg-white rounded-xl px-5 md:px-8 py-7 md:py-10">
              {needsConfirmation ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                    <span className="text-2xl">📩</span>
                  </div>
                  <h2
                    className="text-2xl font-semibold text-foreground"
                    style={{ fontFamily: 'var(--font-bricolage)' }}
                  >
                    Check your email
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We sent a confirmation link to{' '}
                    <span className="font-medium text-muted-foreground">{email}</span>.
                    Click it to finish creating your account.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 md:mb-7">
                    <p className="text-xs font-medium text-secondary uppercase tracking-widest mb-2">
                      Get started
                    </p>
                    <h2
                      className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-[1.1]"
                      style={{ fontFamily: 'var(--font-bricolage)' }}
                    >
                      Create your account
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Connect Stripe, Google Analytics, PostHog, Calendly —
                      everything in one dashboard.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10 transition-all placeholder:text-subtle"
                    />
                    <input
                      type="password"
                      placeholder="Password (min. 6 characters)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10 transition-all placeholder:text-subtle"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-white hover:bg-black transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Creating account…' : 'Create account'}
                    </button>
                  </form>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-subtle">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <GoogleButton label="Sign up with Google" />

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="font-medium text-foreground hover:underline"
                    >
                      Log in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * OLD WISHLIST PAGE — preserved for reference, do not delete.
 *
 * This file used to be a wishlist-only capture form (insert into
 * `wishlist` table, no auth). Replaced with real signup above. To
 * resurrect (e.g. for a closed-beta period): copy the body of
 * `WishlistPage` below back over the export, restore the
 * "Join wishlist" CTAs in Hero / Navbar / Footer, and re-enable
 * the `wishlist` table inserts.
 *
 * ------------------------------------------------------------

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { identifyUser, trackEvent } from '@/lib/posthog'
import Navbar from '@/app/(components)/navbar'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'

export default function WishlistPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('wishlist').insert({ email })

    if (error) {
      if (error.code === '23505') {
        toast.error("You're already on the list!")
      } else {
        toast.error('Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    identifyUser(email, { email })
    trackEvent('wishlist_signup', { email })

    setDone(true)
    setLoading(false)
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
              {done ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <h2
                    className="text-2xl font-semibold text-foreground"
                    style={{ fontFamily: 'var(--font-bricolage)' }}
                  >
                    You're on the list!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We'll reach out to <span className="font-medium text-muted-foreground">{email}</span> when
                    Databerry is ready for you.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-7">
                    <p className="text-xs font-medium text-secondary uppercase tracking-widest mb-2">
                      Early access
                    </p>
                    <h2
                      className="text-3xl font-semibold tracking-tight text-foreground leading-[1.1]"
                      style={{ fontFamily: 'var(--font-bricolage)' }}
                    >
                      Join the wishlist
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Databerry is in private beta. Leave your email and we'll let you know when
                      your spot is ready.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10 transition-all placeholder:text-subtle"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-white hover:bg-black transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Adding you…' : 'Add me to the wishlist'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

 * ============================================================ */
