'use client'

/**
 * Onboarding gate for `/hub/*` — two jobs:
 *
 *   1. REDIRECT: any authenticated visit with
 *      `accounts.onboarding_complete = false` goes to `/onboarding`.
 *      This is what makes the onboarding flow survive detours (OAuth
 *      consent screens land back on the dashboard; the gate re-routes
 *      into the flow) — one durable DB flag instead of N fragile
 *      return URLs.
 *
 *   2. BLOCK: until the onboarding status is KNOWN, cover the
 *      dashboard with a full-screen loading overlay. Without this, a
 *      fresh user sees several seconds of dashboard chrome before the
 *      `/accounts/me` response arrives and bounces them — confusing
 *      ("why did the app yank me away from the thing it just
 *      showed?").
 *
 * Returning-user fast path: the first time we see
 * `onboardingComplete = true` for a user we cache it in localStorage
 * (keyed BY USER ID so a second account on the same browser doesn't
 * inherit it). On later loads the cache short-circuits the overlay
 * entirely — long-time users get their instant dashboard, no loading
 * flash on every navigation, while the redirect effect still runs in
 * the background as a safety net.
 *
 * Failure semantics (deliberate): if the account fetch ERRORS,
 * `onboardingComplete` stays `null` with `loading = false` → the
 * overlay lifts and the dashboard shows. A network blip must never
 * lock a real user out or bounce them into the welcome wizard;
 * `false` is the only signal we act on, and existing accounts are
 * grandfathered to `true` by the migration.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/AuthContext'
import { useAccount } from '@/hooks/useAccount'

/** Per-user cache key — `'1'` once we've seen onboarding complete. */
const cacheKey = (userId: string) => `db_onboarded_${userId}`

export function OnboardingGate() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { onboardingComplete, loading: accountLoading } = useAccount()

  // `null` = cache not read yet (no user id to key by). Read as soon
  // as the user id is known — this lands before the account fetch
  // resolves, so returning users skip the overlay almost immediately.
  const [cachedDone, setCachedDone] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user?.id) return
    try {
      setCachedDone(localStorage.getItem(cacheKey(user.id)) === '1')
    } catch {
      // localStorage unavailable (private mode) — no fast path; the
      // overlay just waits for the real response like a fresh user.
      setCachedDone(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (onboardingComplete === true && user?.id) {
      try {
        localStorage.setItem(cacheKey(user.id), '1')
      } catch {
        /* ignore */
      }
    }
    if (onboardingComplete === false) {
      // `replace` so the half-loaded dashboard doesn't linger in
      // history — Back from onboarding shouldn't return to a page
      // that immediately re-bounces.
      router.replace('/onboarding')
    }
  }, [onboardingComplete, user?.id, router])

  // Block while the answer is UNKNOWN (auth or account still in
  // flight) or while the redirect to /onboarding is happening — but
  // never when the per-user cache already says "done".
  const undetermined = authLoading || accountLoading
  const blocked =
    cachedDone !== true && (undetermined || onboardingComplete === false)

  if (!blocked) return null

  return (
    // Above the sidebar + modals (z-50) so no dashboard chrome peeks
    // through; below the (currently disabled) SubscriptionGate's
    // z-[100] tier. Cream background matches the dashboard so the
    // hand-off is seamless either way it resolves.
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--c-surface)' }}
      aria-busy="true"
      aria-live="polite"
    >
      <Image
        src="/databerry_logo_v2.svg"
        alt="Databerry"
        width={44}
        height={44}
        className="rounded-lg"
        priority
      />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowsClockwise size={14} weight="bold" className="animate-spin" />
        <span>Loading your dashboard…</span>
      </div>
    </div>
  )
}
