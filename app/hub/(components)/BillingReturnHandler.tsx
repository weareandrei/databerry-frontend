'use client'

/**
 * Renders nothing — handles the side-effects of returning from
 * Stripe Checkout. Mounted at the root of the hub shell so it sees
 * every navigation back into `/hub`.
 *
 * Two query params it reacts to:
 *
 *   `?upgraded=<planId>&session_id=…`  (success)
 *     - Shows a "Welcome to <Plan>!" toast.
 *     - Polls `broadcastAccountRefresh()` on a backoff so the
 *       sidebar's plan label updates as soon as the Stripe webhook
 *       lands in our DB. Stripe's `customer.subscription.created`
 *       webhook usually arrives within 1–2 s of the success
 *       redirect; the poll covers up to ~10 s of webhook lag.
 *
 *   `?upgrade_cancelled=1`  (cancelled)
 *     - Shows a neutral "Upgrade cancelled" toast. No state mutation
 *       needed — the user didn't pay, nothing changed server-side.
 *
 * Either branch then clears the query params via `router.replace`
 * so a subsequent page reload doesn't re-toast.
 *
 * Why poll instead of a single refetch: the success URL is hit by
 * the browser as soon as Stripe finishes Checkout, which can be
 * BEFORE Stripe sends the webhook to our backend. A single
 * refetch right after the redirect might read the still-free
 * plan_id and lie to the user. Polling shrinks that race window
 * to "as fast as the webhook actually lands".
 */

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { broadcastAccountRefresh } from '@/hooks/useAccount'
import { useAccount } from '@/hooks/useAccount'

// Polling cadence — each tick fires a refetch. 7 ticks over ~10s.
// More frequent at first (webhook usually lands fast) then sparser.
const POLL_DELAYS_MS = [500, 1000, 1500, 2000, 2000, 2000, 1000]

export function BillingReturnHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { planId } = useAccount()

  // Guard against re-running for the same query string when React
  // re-renders the component before we've cleared the URL.
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    const upgradedTo = searchParams.get('upgraded')
    const cancelled = searchParams.get('upgrade_cancelled')
    const key = `${upgradedTo ?? ''}|${cancelled ?? ''}`
    if (!upgradedTo && !cancelled) return
    if (handledRef.current === key) return
    handledRef.current = key

    // Clear the search params right away so a reload doesn't replay
    // the toast. `router.replace(pathname)` strips the query string
    // without scrolling the page.
    router.replace(pathname)

    if (cancelled) {
      toast.info('Upgrade cancelled — your plan is unchanged.')
      return
    }

    if (!upgradedTo) return

    // Success path — toast immediately so the user has feedback,
    // then poll until the broadcast refresh actually changes the
    // plan in `useAccount`. The toast text uses the URL-supplied
    // plan id; case-fix it for display.
    const displayName =
      upgradedTo.charAt(0).toUpperCase() + upgradedTo.slice(1)
    toast.success(`Welcome to ${displayName}! Updating your plan…`)

    const timers: ReturnType<typeof setTimeout>[] = []
    let cancelledPoll = false

    const scheduleTick = (idx: number) => {
      if (cancelledPoll || idx >= POLL_DELAYS_MS.length) return
      const delay = POLL_DELAYS_MS[idx]
      timers.push(
        setTimeout(() => {
          broadcastAccountRefresh()
          scheduleTick(idx + 1)
        }, delay),
      )
    }
    scheduleTick(0)

    return () => {
      cancelledPoll = true
      for (const t of timers) clearTimeout(t)
    }
    // We intentionally omit `planId` from deps — the poll runs
    // unconditionally; the `useAccount` reads will pick up the new
    // plan when the webhook has landed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, router])

  // Side-effect-only component.
  void planId
  return null
}
