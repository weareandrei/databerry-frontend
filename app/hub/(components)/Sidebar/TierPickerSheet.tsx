'use client'

/**
 * Bottom-sheet picker for choosing a subscription tier. Renders
 * the shared `<PricingTable>` (same component the landing page
 * uses above the FAQ) in `upgrade` mode — CTAs fire `onSelect`
 * which routes the click into the Stripe Checkout flow.
 *
 * Flow on click:
 *   1. POST /billing/checkout-session with `{ planId }`.
 *   2. Backend returns `{ url }` — the hosted Checkout URL.
 *   3. Hard-redirect via `window.location` so Stripe takes over.
 *   4. After Stripe finishes, the user lands on
 *      `/hub?upgraded=<planId>&session_id=…` (success) or
 *      `/hub?upgrade_cancelled=1` (cancel). The hub shell reads
 *      those query params and refreshes the cached plan + toasts.
 *
 * Downgrade to free is intentionally NOT wired — the
 * picker still calls `handleSelect('free')` if someone manages to
 * tap it on a paid plan, but we surface a "contact us" toast
 * rather than auto-cancelling. Self-serve cancellation deserves a
 * confirmation step we haven't built; for the v1 launch, the
 * email-support fallback is fine.
 */

import { useState } from 'react'
import { CreditCard } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ALGORITHM } from '@/lib/api'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { PricingTable } from '@/components/pricing/PricingTable'
import type { PlanId } from '@/constants/plans'

interface TierPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The plan the account is on RIGHT NOW. */
  currentPlanId: PlanId
}

export function TierPickerSheet({
  open,
  onOpenChange,
  currentPlanId,
}: TierPickerSheetProps) {
  // `redirecting` blocks duplicate clicks while we wait for the
  // backend to mint a Checkout session. The Stripe API call
  // typically takes 300–800 ms; without this guard a quick double-
  // tap creates two sessions, the second of which orphans the first
  // (annoying but not destructive).
  const [redirecting, setRedirecting] = useState<PlanId | null>(null)

  const handleSelect = async (planId: PlanId) => {
    if (planId === currentPlanId) return
    if (planId === 'free') {
      // Self-serve cancellation isn't wired yet — keep the email
      // fallback so the click does *something* rather than being
      // silently ignored.
      toast.info('Downgrades coming soon — email team@heavenmade.org to switch.')
      return
    }
    if (redirecting) return // ignore double-tap

    setRedirecting(planId)
    try {
      const { url } = await ALGORITHM.createCheckoutSession(planId)
      // Hard navigate — Stripe's checkout is an external origin, so
      // we can't `router.push`. Replace (vs assign) so the back
      // button after checkout doesn't return to a stale Checkout
      // session URL.
      window.location.assign(url)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start checkout'
      toast.error(message)
      setRedirecting(null)
    }
  }

  return (
    // `min-h-[85vh]` overrides BottomDialog's default `min-h-[50vh]`
    // floor (the cn() in BottomDialog uses tailwind-merge so the later
    // class wins). Pricing table + intro copy + CTAs need more
    // vertical room than a date picker; opening at 85vh gives the
    // table breathing room and leaves the dialog feeling like a
    // primary surface, not a popover. `max-h-[92vh]` from the base
    // class still caps the upper bound, so we never eat the whole
    // viewport.
    <BottomDialog
      open={open}
      onOpenChange={onOpenChange}
      className="min-h-[85vh]"
    >
      <BottomDialog.Page
        // `headerLeft` replaces the default title row with the
        // Figma design's cluster: a square icon-in-tile on the left
        // + title / subtitle stacked on the right. The icon tile
        // mirrors the rest of the app's "icon-in-a-pill" header
        // convention (connection logos, ProjectIcon) — same 36×36
        // chrome, just square with rounded corners and a credit-
        // card glyph to signal "billing".
        headerLeft={
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border border-stroke bg-white shadow-pill text-grey-darkest">
              <CreditCard size={18} weight="bold" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-heading text-lg font-semibold tracking-tight">
                Choose your plan
              </h2>
              <p className="text-sm text-grey-light leading-snug">
                Billed monthly. Update any time.
              </p>
            </div>
          </div>
        }
        bodyVariant="plain"
        // We intentionally DON'T pass `bodyMaxWidth` here — that
        // wrapper is left-aligned by design (forms inside dialogs
        // want left-alignment). Instead we apply our own
        // `max-w-[92rem] mx-auto` below so the table sits centered
        // in the body. 92 rem ≈ 1472 px — the four-column table
        // (Free + Starter + Pro + Enterprise) benefits from the
        // extra horizontal breathing room compared to the old
        // three-column layout. The body itself is
        // `flex-1 overflow-y-auto` inside the BottomDialog, so any
        // content overflowing the dialog scrolls in-place — no
        // need to wire scroll handling here.
      >
        <div className="max-w-[92rem] my-[42px] mx-auto">
          <PricingTable
            variant="upgrade"
            currentPlanId={currentPlanId}
            onSelect={handleSelect}
          />
        </div>
      </BottomDialog.Page>
    </BottomDialog>
  )
}
