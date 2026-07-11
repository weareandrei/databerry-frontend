'use client'

/**
 * Plan-comparison surface — renders on the landing page (above the
 * FAQ) AND inside `<TierPickerSheet>` (the dashboard upgrade sheet).
 * Same component, same set of cards, responsive sizing for both
 * contexts.
 *
 * Layout:
 *   - TWO cards in a 1-column-on-mobile / 2-column-on-desktop grid.
 *     Only paid, non-custom tiers (Starter + Pro today). Free and
 *     Enterprise are filtered out client-side so the picker stays
 *     correct even if the `subscriptions` DB row for either is
 *     still present mid-migration.
 *   - Each card:
 *       Plan name (+ "Popular" badge on Pro)
 *       Big price + optional intro-pricing subline
 *       Short tagline
 *       Bulleted feature list (limits + support tier)
 *       CTA at the bottom (flex-1 above + auto-margin so all CTAs
 *       sit at the same vertical position when one card has more
 *       feature lines than the other)
 *   - Beneath the grid: a small "Need a custom solution? Contact
 *     us" line that anchors to the landing-page contact form (or
 *     navigates there from the dashboard).
 *
 * Two CTA modes via `variant`:
 *   - `'signup'`: landing page. CTAs link to `/signup`. Custom-
 *     solution link uses an in-page anchor (`#contact`) so the
 *     browser smooth-scrolls to the form.
 *   - `'upgrade'`: dashboard upgrade sheet. CTAs call
 *     `onSelect(planId)` and self-label "Upgrade to X" / "Downgrade
 *     to X" / dashed "Current plan" based on direction relative to
 *     `currentPlanId`. The custom-solution link goes to `/#contact`
 *     (router-level navigation back to the landing page).
 */

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowsClockwise, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice, type Plan, type PlanId } from '@/constants/plans'
import { usePlans } from '@/hooks/usePlans'
import { EVENT, trackEvent } from '@/lib/posthog'
import { RollingNumber } from './(components)/RollingNumber'
import { EventVolumeSlider, EVENT_TIERS } from './(components)/EventVolumeSlider'

/**
 * Resolve the monthly price (in cents) for a base plan at a given
 * event tier. The base plan row covers its own default tier (50K);
 * higher tiers live as `is_variation` rows linked via
 * `variation_of === base.rawId` + `max_events_monthly === events`.
 * Falls back to the base price if a variation is missing (defensive
 * — e.g. a tier the user hasn't seeded yet).
 */
function priceCentsForTier(base: Plan, events: number, allPlans: Plan[]): number {
  if (base.maxEventsMonthly === events || base.maxEventsMonthly == null) {
    return base.priceMonthlyCents
  }
  const variation = allPlans.find(
    p =>
      p.isVariation &&
      p.variationOf === base.rawId &&
      p.maxEventsMonthly === events,
  )
  return variation?.priceMonthlyCents ?? base.priceMonthlyCents
}

/** Founder support inbox. Surfaced in the loading-failure card. */
const CONTACT_EMAIL = 'team@heavenmade.org'

interface PricingTableProps {
  /**
   * `signup`  — landing page. CTAs link to `/signup`.
   * `upgrade` — dashboard. CTAs call `onSelect(planId)`.
   *             Whichever plan id matches `currentPlanId` renders a
   *             dashed "Current plan" badge instead of a button.
   */
  variant: 'signup' | 'upgrade'
  /** Required for `variant='upgrade'`. The user's active plan id. */
  currentPlanId?: PlanId
  /** Required for `variant='upgrade'`. Fires when a non-current
   *  plan's CTA is clicked. */
  onSelect?: (planId: PlanId) => void
}

export function PricingTable({
  variant,
  currentPlanId,
  onSelect,
}: PricingTableProps) {
  const { plans, loading, error } = usePlans()
  // Selected event-volume tier (index into `EVENT_TIERS`). 0 = 50K,
  // the default/minimum. Drives the price shown on every card.
  const [tierIndex, setTierIndex] = useState(0)

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-subtle">
        <ArrowsClockwise size={14} weight="bold" className="animate-spin" />
        <span>Loading plans…</span>
      </div>
    )
  }

  if (error || plans.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-stroke bg-white p-6 text-center">
        <p className="text-sm text-foreground mb-1">
          Couldn&apos;t load plans.
        </p>
        <p className="text-xs text-subtle">
          Try again in a moment, or email{' '}
          <span className="font-medium">{CONTACT_EMAIL}</span> for help.
        </p>
      </div>
    )
  }

  // Filter the plan list down to the picker's intended scope:
  //   - Skip plans marked `disabled` in the DB. The `disabled`
  //     column is how retired tiers (today: Free) signal "exists
  //     for legacy account-row references, but don't show me in
  //     the picker". This replaces the previous Free-specific
  //     filter — single source of truth lives in the DB now.
  //   - Skip custom / Enterprise plans (`isCustomPlan === true`).
  //     The custom-solution path is the "Contact us" line below
  //     the cards, not a card of its own.
  //   - Skip event-tier VARIATIONS (`isVariation`). They aren't
  //     cards — they feed the event-volume slider, which swaps the
  //     displayed price on the base card.
  // Sorted by `displayOrder` so Starter sits left of Pro.
  const visiblePlans = plans
    .filter(p => !p.disabled && !p.isCustomPlan && !p.isVariation)
    .sort((a, b) => a.displayOrder - b.displayOrder)

  if (visiblePlans.length === 0) {
    // Defensive: every plan was filtered out (someone wiped paid
    // plans from the DB by mistake). Render the same "couldn't load"
    // card so the page doesn't surface an empty grid with no
    // explanation.
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-stroke bg-white p-6 text-center">
        <p className="text-sm text-foreground mb-1">
          No paid plans configured.
        </p>
        <p className="text-xs text-subtle">
          Email <span className="font-medium">{CONTACT_EMAIL}</span> and we&apos;ll
          sort this out.
        </p>
      </div>
    )
  }

  // Resolve the user's current plan's display_order so each CTA
  // can decide whether it's an upgrade (CTA above) or a downgrade
  // (CTA below). On landing this stays `null` — every CTA is a
  // "Get started" link, no direction to compute.
  const currentOrder = (() => {
    if (variant !== 'upgrade' || !currentPlanId) return null
    const found = plans.find(p => p.id === currentPlanId)
    return found?.displayOrder ?? null
  })()

  const selectedEvents = EVENT_TIERS[tierIndex].events

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Event-volume slider — sits above the cards. Dragging it
          changes `tierIndex`, which re-resolves each card's price
          from its matching variation row (with a rolling-number
          animation on the price). */}
      <div className="mb-10 w-full">
        <EventVolumeSlider index={tierIndex} onChange={setTierIndex} />
      </div>

      {/* Card layout. Stacks VERTICALLY on mobile (`flex-col`) so the
          two `w-full` cards each get the full column width instead of
          being squished side by side; switches to a side-by-side row
          at `md`. `items-stretch` keeps both cards the same height on
          desktop; the `flex-1` between feature list and CTA inside
          each card consumes the slack so CTAs line up across columns. */}
      <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6">
        {visiblePlans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            variant={variant}
            isCurrent={variant === 'upgrade' && plan.id === currentPlanId}
            currentOrder={currentOrder}
            onSelect={onSelect}
            priceCents={priceCentsForTier(plan, selectedEvents, plans)}
          />
        ))}
      </div>

      {/* Custom-solution callout. Sits below the grid as a
          deliberately small line of copy — not a third card —
          because the message is "the path through here is OK, but
          if you need something different we'll talk." Treating it
          as equal weight to the cards would muddy the default
          choice for the 95% of users who DON'T need custom.

          On landing, `#contact` smooth-scrolls to the form (the
          section uses `id="contact"`); from the dashboard upgrade
          sheet, the same href routes to `/#contact` on landing.
          We use a root-relative `/` prefix so both contexts land on
          the actual contact form regardless of the current path. */}
      <div className="mt-8 md:mt-10 text-center text-sm text-muted-foreground">
        Need a custom solution?{' '}
        <Link
          href="/#contact"
          onClick={() =>
            trackEvent(EVENT.LANDING_TIER_CTA_CLICKED, {
              tier: 'custom',
              destination: 'contact',
              location: variant === 'signup' ? 'landing_pricing' : 'dashboard_picker',
            })
          }
          className="text-secondary font-medium hover:underline cursor-pointer"
        >
          Contact us
        </Link>
      </div>
    </div>
  )
}

// ─── Plan card ─────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  variant,
  isCurrent,
  currentOrder,
  onSelect,
  priceCents,
}: {
  plan: Plan
  variant: 'signup' | 'upgrade'
  isCurrent: boolean
  currentOrder: number | null
  onSelect?: (planId: PlanId) => void
  /** Resolved price for the currently-selected event tier (cents). */
  priceCents: number
}) {
  // Pro is still flagged as the recommended path, but the cue is
  // now the "Popular" badge ALONE — no brand-orange wash on the
  // outer wrapper any more. Both cards share the same chrome so
  // the choice reads as "two valid plans, here's our pick" rather
  // than "one is special, the other is consolation". The shared
  // grey is a touch darker than the previous `gray-50` so the
  // layered look (grey tray, white inner card) is still legible
  // without leaning on colour.
  const highlight = plan.id === 'pro'
  // Plans with intro pricing get a small tilted "First month $X"
  // badge anchored to the top-right corner — calls attention to
  // the discount without taking up real estate inside the white
  // card. The intro AMOUNT still flows from the existing
  // `introPriceMonthlyCents` column; the badge is purely visual.
  const hasIntro =
    plan.introPriceMonthlyCents != null && plan.introDurationMonths != null

  return (
    // Outer wrapper — the "tray" the white inner card sits on. The
    // small inner padding (`p-2.5 md:p-3`) creates a visible band
    // of grey around all four sides of the white card, which is
    // what makes the layered look read. Without it the white card
    // would consume the wrapper and the design would collapse to a
    // single-surface card again.
    //
    // `bg-gray-100` (was `gray-50`) is one notch darker — still
    // very pale, but enough contrast against the white inner card
    // that the layering is obvious even on bright monitors. Same
    // colour on both cards now.
    <div className="relative rounded-[32px] w-full md:w-[400px] 2xl:w-[430px] p-2.5 md:p-3 flex flex-col bg-muted">
      {/* Intro-pricing badge — tilted pill that pokes out of the
          top-right corner of the card. Anchored to the OUTER
          wrapper (not the white inner card) so it sits above the
          card's rounded corner cleanly. `-rotate-6` gives the
          playful slant; `z-10` keeps it above the white card's
          drop shadow so the badge doesn't get partially masked.
          Renders only when the plan has intro pricing — Pro today,
          potentially others later. */}
      {hasIntro && (
        <span
          aria-label={`First month ${formatPrice(plan.introPriceMonthlyCents!)}`}
          className="absolute -top-3 right-4 md:-top-4 md:right-6 z-10 inline-flex items-center rounded-xl border border-secondary/50 bg-secondary/[0.08] px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-bold text-secondary -rotate-6 shadow-sm whitespace-nowrap"
        >
          First month {formatPrice(plan.introPriceMonthlyCents!)}
        </span>
      )}

      {/* WHITE inner card — main info + CTA all live here so the
          "primary surface" of the plan is visually concentrated.
          The arbitrary-value shadow gives it a softer, more
          diffuse drop than `shadow-md` (which is sharper and too
          near to the card's edges) — reads as a proper "lifted
          card" against the grey tray rather than a hard outline. */}
      <div className="bg-white rounded-[32px] border border-stroke shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] p-3 md:p-6">
        {/* Plan name + badge */}
        <div className="flex items-center gap-2 mt-2">
          {/* "Plan" suffix appended in the view rather than baked
              into the DB `name` column. The bare name is still useful
              elsewhere (sidebar plan badge, upgrade-direction CTA
              labels like "Upgrade to Pro" — adding "Plan" to those
              would read awkwardly). Card headers are the only place
              where the longer "Pro Plan" / "Starter Plan" framing
              fits, so the suffix lives here. */}
          <h3 className="text-2xl md:text-3xl font-semibold text-foreground leading-none">
            {plan.name} Plan
          </h3>
          {highlight && (
            <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
              Popular
            </span>
          )}
        </div>

        {/* Tagline. Moved ABOVE the price (was below the price in
            the table layout) — in the card-on-card design the
            tagline reads as a one-line subtitle for the plan name,
            so it sits with the name cluster. */}
        {plan.tagline && (
          <p className="text-sm text-subtle leading-relaxed mt-1 mb-4 md:mb-5">
            {plan.tagline}
          </p>
        )}

        {/* Price. Intro-pricing line is intentionally absent for now
            ("first month $5") — the trial replaces it as the
            cheap-entry mechanic. Easy to re-add later if/when we
            run promotions; the slot just isn't earning its space
            today. Slash + lowercase "month" with spaces on both
            sides matches the screenshot's typography. */}
        <div className="mb-5 md:mb-6 flex items-end gap-1.5">
          {/* `$` + rolling digits share the big price type. The whole
              row is `items-end` so the `$`, the odometer digits, and
              the "/ month" all sit on one baseline as the digits
              roll. `priceCents` is the tier-resolved price from the
              slider — changing tiers animates the figures. */}
          <p className="text-3xl md:text-4xl font-bold text-foreground leading-none tabular-nums flex items-end">
            <span>$</span>
            <RollingNumber value={priceCents / 100} />
          </p>
          <p className="text-sm md:text-base text-subtle font-medium">
            / month
          </p>
        </div>

        {/* CTA lives INSIDE the white card — part of the "main info"
            surface, not in the grey area below. */}
        <PlanCta
          plan={plan}
          isCurrent={isCurrent}
          currentOrder={currentOrder}
          variant={variant}
          highlight={highlight}
          onSelect={onSelect}
        />
      </div>

      {/* Feature list — lives in the grey area below the white card.
          The eyebrow + bulleted list reads as "and here's what
          you're actually getting", subordinate to the white card's
          "what does it cost / how do I start". */}
      <div className="px-3 md:px-4 pt-4 md:pt-5 pb-1 md:pb-2 flex-1">
        {/* Eyebrow framed as an action ("Get started with") instead
            of a noun ("What's included") — reads as "here's what
            you can DO" rather than a feature checklist, which fits
            the trial-first framing better. */}
        <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-subtle font-semibold mb-3 md:mb-4">
          Get started with
        </p>
        <ul className="space-y-2.5">
          <FeatureItem>
            <strong className="font-semibold">{plan.maxProjects}</strong>{' '}
            {plan.maxProjects === 1 ? 'project' : 'projects'}
          </FeatureItem>
          <FeatureItem>
            <strong className="font-semibold">{plan.maxViewsPerProject}</strong>{' '}
            views per project
          </FeatureItem>
          <FeatureItem>
            <strong className="font-semibold">
              {plan.maxConnectionsPerType}
            </strong>{' '}
            connection{plan.maxConnectionsPerType === 1 ? '' : 's'} per
            integration
          </FeatureItem>
          <FeatureItem>
            {plan.allowedConnectionTypes == null
              ? 'All integrations'
              : prettyConnectionList(plan.allowedConnectionTypes)}
          </FeatureItem>
          {plan.support && <FeatureItem>{plan.support} support</FeatureItem>}
        </ul>
      </div>
    </div>
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  // `CheckCircle weight="fill"` matches the design-inspiration's
  // filled-circle-with-check icon, but in the brand orange instead
  // of the inspiration's black. Larger than the previous bare
  // `Check` icon because it doubles as a visual bullet on the
  // grey surface — has to be readable against a softer background.
  return (
    <li className="flex items-start gap-2.5 text-sm text-foreground leading-snug">
      <CheckCircle
        size={18}
        weight="fill"
        className="text-secondary shrink-0 mt-0.5"
      />
      <span>{children}</span>
    </li>
  )
}

const CONNECTION_LABELS: Record<string, string> = {
  google_analytics: 'GA',
  posthog: 'Posthog',
  stripe: 'Stripe',
  stripe_manual: 'Stripe',
  calendly: 'Calendly',
  sentry: 'Sentry',
  vercel: 'Vercel',
}

function prettyConnectionList(types: string[]): string {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const t of types) {
    const label = CONNECTION_LABELS[t] ?? t
    if (seen.has(label)) continue
    seen.add(label)
    labels.push(label)
  }
  return labels.join(', ')
}

// ─── Plan CTA ──────────────────────────────────────────────────────────────
//
// Three modes (in the order they're checked):
//   1. `variant === 'signup'`         → "Get started" link to /signup.
//                                       Solid brand on the highlighted
//                                       (Pro) card, outlined on Starter,
//                                       so Pro stands out as the
//                                       recommended path.
//   2. `variant === 'upgrade'` + isCurrent
//                                     → dashed brand outline + "Current plan"
//   3. `variant === 'upgrade'` + !isCurrent
//                                     → "Upgrade to X" (solid brand) or
//                                       "Downgrade to X" (outlined neutral),
//                                       direction decided by displayOrder.

function PlanCta({
  plan,
  isCurrent,
  currentOrder,
  variant,
  highlight,
  onSelect,
}: {
  plan: Plan
  isCurrent: boolean
  currentOrder: number | null
  variant: 'signup' | 'upgrade'
  highlight: boolean
  onSelect?: (planId: PlanId) => void
}) {
  if (variant === 'signup') {
    return (
      // Two-line CTA. The main label is the offer ("Start 7-day
      // free trial"); the subline answers the most common objection
      // ("No card required") before the user has to scroll to find
      // it elsewhere. Stacking them inside ONE button keeps the
      // promise attached to the action — splitting it into a
      // separate caption underneath would let users miss the
      // reassurance entirely.
      //
      // Both cards now use the same solid-brand chrome (the
      // outlined Starter variant is gone) — the card-level
      // differentiation (Pro's tinted background + Popular badge)
      // is enough to flag Pro as the recommended tier without the
      // CTA having to carry that signal too. Identical CTAs also
      // read as "both are equally easy to start," which is the
      // truth: same trial, same flow.
      // Wrapper so the button + the "No card required" caption stay
      // grouped as one logical action block. The caption sits OUTSIDE
      // the button now — reads as a quiet reassurance below the CTA,
      // less visually noisy than the previous inside-the-button
      // subline. Same promise, calmer placement.
      <div>
        <Link
          href="/signup"
          onClick={() =>
            trackEvent(EVENT.LANDING_TIER_CTA_CLICKED, {
              tier: plan.id,
              destination: 'signup',
              location: 'landing_pricing',
            })
          }
          // Single-line CTA. `group` so the arrow can react to
          // hover on the whole button. Neutral-black drop shadow
          // (low alpha, generous blur) — reads as the button being
          // lifted off the surface rather than glowing orange.
          // No hover state on the button itself — bg stays brand,
          // shadow stays put. The only hover motion is the arrow
          // nudge (handled via `group-hover` on the icon below),
          // which is enough to signal interactivity without the
          // button visibly "twitching" on cursor entry.
          className="group flex items-center justify-center w-full rounded-full h-11 md:h-12 px-5 gap-1.5 cursor-pointer bg-secondary text-white shadow-[0_14px_32px_-8px_rgba(0,0,0,0.25)]"
        >
          <span className="text-sm md:text-base font-semibold">
            Start 7-day free trial
          </span>
          <ArrowRight
            size={16}
            weight="bold"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
        {/* Reassurance caption — answers "do I need to enter my
            card?" right under the action so the user sees it
            before they click. Outside the button so it doesn't
            compete with the CTA's emphasis; centred to mirror
            the button's centred label. */}
        <p className="text-[11px] md:text-xs text-subtle text-center mt-2">
          No card required
        </p>
      </div>
    )
  }

  if (isCurrent) {
    return (
      <span className="inline-flex items-center justify-center w-full rounded-full h-11 md:h-12 px-5 text-sm font-medium border border-dashed border-secondary/50 text-secondary bg-secondary/[0.04]">
        Current plan
      </span>
    )
  }

  const isDowngrade =
    currentOrder != null && plan.displayOrder < currentOrder
  const label = isDowngrade
    ? `Downgrade to ${plan.name}`
    : `Upgrade to ${plan.name}`

  return (
    <Button
      onClick={() => onSelect?.(plan.id)}
      className={cn(
        'w-full rounded-full h-11 md:h-12 px-5 text-sm font-medium cursor-pointer',
        isDowngrade
          ? 'border border-stroke bg-white text-foreground hover:bg-hover-fill shadow-none'
          : 'bg-secondary hover:bg-secondary/90 text-white shadow-none',
      )}
    >
      {label}
    </Button>
  )
}
