'use client'

/**
 * "Forgot password" — request a reset link.
 *
 * Doubles as a recovery path for Google-OAuth-only accounts: even if
 * the user never set a password, `resetPasswordForEmail` still works
 * because it just needs an `auth.users` row with that email. The
 * link sent via email lands on `/auth/reset-password` which lets the
 * user set a fresh password and bypass any broken OAuth state.
 *
 * Same visual chrome as login/signup (shader background + phone
 * bezel + glassmorphism card) so the auth flow reads as one unified
 * surface.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Warning } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/app/(components)/navbar'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        // The recovery link in the email redirects here. The page
        // detects the recovery session from the URL and shows a
        // "set new password" form.
        redirectTo: `${window.location.origin}/auth/reset-password`,
      },
    )

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    // Supabase deliberately doesn't tell us whether the email exists —
    // they always return success to avoid leaking which addresses
    // have accounts. Show the same "check your email" state either
    // way; if the user typo'd the address, no email arrives and
    // they'll figure it out.
    setDone(true)
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      <CanvasBackground />
      <PhoneBezel />
      <Navbar />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 md:px-6 min-h-screen">
        <div className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-md">
          <div className="bg-white/35 backdrop-blur-sm p-3 md:p-4">
            <div className="bg-white rounded-xl px-5 md:px-8 py-7 md:py-10">
              {done ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">📩</span>
                  </div>
                  <h2
                    className="text-2xl font-semibold text-foreground"
                    style={{ fontFamily: 'var(--font-bricolage)' }}
                  >
                    Check your email
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If <span className="font-medium text-muted-foreground">{email}</span>{' '}
                    matches an account, we&apos;ve sent a link to set a new
                    password. Check your inbox (and spam) — the link works
                    even for accounts originally created via Google.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 md:mb-7">
                    <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">
                      Account recovery
                    </p>
                    <h2
                      className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-[1.1]"
                      style={{ fontFamily: 'var(--font-bricolage)' }}
                    >
                      Reset your password
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Enter your account email and we&apos;ll send you a link to
                      set a new password — even if you originally signed up
                      with Google.
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
                      autoFocus
                      className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-subtle"
                    />
                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-white hover:bg-black transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Sending…' : 'Send reset link'}
                    </button>
                  </form>

                  {error && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <Warning size={14} weight="bold" className="shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{error}</p>
                    </div>
                  )}

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Remembered your password?{' '}
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
