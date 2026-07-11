'use client'

/**
 * Full-viewport blocker shown when the user's free trial has ended
 * and they haven't subscribed — the "we don't have valid billing for
 * this user right now" state.
 *
 * Visual design mirrors the signup / sign-in pages: shader gradient
 * canvas behind, decorative phone bezel, glassmorphism card frame,
 * inner white surface with the message + CTA. Repeating the
 * onboarding chrome on the expired-state screen makes the user feel
 * like they're being handed back to "the front door" rather than
 * trapped behind a generic paywall — which is the truth: they need
 * to (re-)pay to walk through again.
 *
 * Trigger — all of (evaluated against the `/accounts/me` row via
 * `useAccount`, re-checked every minute so an expiry mid-session
 * gates without a reload):
 *   - account fetch settled (`!loading`) — never gate on unknowns;
 *     a network blip must not lock a paying user out (same fail-open
 *     stance as `<OnboardingGate>`)
 *   - `rawPlanId === 'free'` — an actual paid plan never gates,
 *     regardless of any historical trial timestamps
 *   - `trialEndsAt` exists AND is in the past — no matter how long
 *     ago; a user returning a year later still lands here. A NULL
 *     `trialEndsAt` means the trial never started (they haven't had
 *     their first post-onboarding dashboard open yet) → no gate;
 *     `<TrialKickoff>` handles that moment instead.
 *
 * Behavioural details:
 *   - `fixed inset-0 z-[100]` covers the entire viewport, including
 *     above modals (`z-50`), the feedback widget (`z-40`), the
 *     onboarding gate (`z-[90]`) and the sidebar. The whole
 *     dashboard becomes uninteractive while this is mounted.
 *   - Fades in over 1 s from opacity 0 → 100 once it decides to
 *     show. The two-RAF dance below ensures the initial opacity-0
 *     state actually paints to the DOM before we flip the flag, so
 *     the browser has something to interpolate from.
 *   - After the user buys a plan, the Stripe return flow broadcasts
 *     an account refresh → `rawPlanId` flips to the paid plan → the
 *     gate unmounts on its own.
 *
 * Security note: the only thing this component does is REFUSE TO
 * SHOW the dashboard. The dashboard's underlying data is fetched
 * via authed API calls — those calls must independently refuse to
 * serve users whose subscription is inactive. A motivated user
 * can hide this overlay via devtools in 10 seconds; if the backend
 * isn't gating data access, they'd see + edit live data through
 * the network tab regardless. The overlay is UX, not security.
 *
 * Mounted from the hub layout root so it follows every `/hub/*`
 * route. Outside `/hub` (auth pages, landing), there's no
 * dashboard to block.
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import { TierPickerSheet } from '@/app/hub/(components)/Sidebar/(components)/TierPickerSheet'
import { useAccount } from '@/hooks/useAccount'
import { trackEvent, EVENT } from '@/lib/posthog'

/** Duration of the opacity 0 → 100 fade-in, in milliseconds. */
const FADE_DURATION_MS = 1_000

/** How often the "has the trial expired yet?" clock re-checks. */
const RECHECK_INTERVAL_MS = 60_000

export function SubscriptionGate() {
  // `mounted` controls whether the overlay is in the DOM at all.
  // `faded` controls the opacity. The two are separate so the
  // initial paint can be at opacity 0 (CSS transition needs a
  // starting value to interpolate FROM), and the flip to opacity
  // 1 triggers the fade-in animation.
  const [mounted, setMounted] = useState(false)
  const [faded, setFaded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { planId, rawPlanId, trialEndsAt, loading } = useAccount()

  // Re-evaluated every minute (and on every account change) so a
  // session that outlives its trial gets gated without a reload —
  // and a mid-session upgrade (account refresh broadcast flips
  // `rawPlanId`) dissolves the gate the same way.
  useEffect(() => {
    const evaluate = () => {
      const expired =
        !loading &&
        rawPlanId === 'free' &&
        trialEndsAt !== null &&
        Date.parse(trialEndsAt) < Date.now()

      setMounted(prev => {
        if (expired && !prev) {
          trackEvent(EVENT.TRIAL_ENDED_GATE_SHOWN, { trialEndsAt })
          // Two-RAF ensures the opacity-0 state lands in the DOM
          // before we flip to opacity-1. One RAF alone occasionally
          // collapses both writes into a single paint on Chromium —
          // the transition silently no-ops because the browser never
          // saw the starting value.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setFaded(true))
          })
        }
        if (!expired && prev) setFaded(false)
        return expired
      })
    }

    evaluate()
    const timer = setInterval(evaluate, RECHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [loading, rawPlanId, trialEndsAt])

  if (!mounted) return null

  return (
    // `z-[100]` sits above EVERY other layer:
    //   - `z-50` dashboard modals
    //   - `z-40` feedback widget
    //   - `z-[90]` onboarding gate
    //   - Sidebar (no explicit z, but inside layout flow)
    // `inset-0` pins it to all four viewport edges; `fixed`
    // means scrolling the body underneath has no effect.
    // `pointer-events-auto` is implicit but worth noting — clicks
    // hit this overlay, not the dashboard underneath.
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        opacity: faded ? 1 : 0,
        transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="subscription-gate-title"
    >
      <CanvasBackground />
      <PhoneBezel />

      {/* Centred card — same chrome as `/signup` and `/login` so the
          user reads "this is a billing gate, not an error". */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 md:px-6 min-h-screen">
        <div className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-md">
          {/* Outer semi-transparent wrapper (glassmorphism). */}
          <div className="bg-white/35 backdrop-blur-sm p-3 md:p-4">
            {/* Inner fully white surface. */}
            <div className="bg-white rounded-xl px-5 md:px-8 py-7 md:py-10">
              <div className="flex flex-col items-center text-center">
                {/* Soft brand-orange tile with the hourglass glyph —
                    mirrors the `📩` envelope tile on the signup
                    "check your email" success state so the visual
                    grammar carries across both onboarding moments. */}
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">⏳</span>
                </div>

                <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">
                  Trial ended
                </p>
                <h2
                  id="subscription-gate-title"
                  className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-[1.1] mb-3"
                >
                  Oups. It seems your free trial has finished.
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
                  If you&apos;d like to continue using Databerry, please
                  purchase a subscription.
                </p>

                <Button
                  onClick={() => setPickerOpen(true)}
                  className="w-full rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium py-5 cursor-pointer shadow-none"
                >
                  See subscription plans
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The picker sheet renders on top of the gate when opened.
          `BottomDialog`'s own `z-50` would sit BELOW our `z-[100]`
          overlay otherwise, but the picker is rendered into a portal
          at the document root so its stacking context is independent
          of ours — it lays itself on top regardless of this overlay's
          z-index. */}
      <TierPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentPlanId={planId}
      />
    </div>
  )
}
