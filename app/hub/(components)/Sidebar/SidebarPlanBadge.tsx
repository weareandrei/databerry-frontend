'use client'

/**
 * Sidebar plan card — sits at the bottom of the sidebar, above the
 * timezone row. Two sections:
 *
 *   1. "Upgrade to PRO" banner with a soft brand-orange gradient +
 *      faint grid texture, and a `>` caret on the right. The whole
 *      banner is a single click target that goes STRAIGHT to a Pro
 *      Stripe Checkout session — no tier picker in between.
 *      Hidden when the user is already on Pro / enterprise /
 *      custom plan (nothing to upgrade to).
 *
 *   2. A plain white section with project-usage stats and a
 *      "Manage plan" button that opens the tier picker (for
 *      downgrade / billing management / etc.).
 *
 * Card chrome (rounded-xl border + shadow-card) matches view
 * tiles — same border / radius / shadow tokens. The gradient
 * banner is clipped by the card's `overflow-hidden` so its top
 * corners round cleanly with the card.
 *
 * Owns the `<TierPickerSheet>` instance for the whole dashboard
 * — the shared `useTierPickerListener` bus still pops it open
 * from limit-error toasts elsewhere.
 */

import { useCallback, useState } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAccount } from '@/hooks/useAccount'
import { usePlans } from '@/hooks/usePlans'
import { useTierPickerListener } from '@/hooks/useTierPicker'
import { useDashboard } from '@/contexts/DashboardContext'
import { TierPickerSheet } from './TierPickerSheet'
import { ALGORITHM } from '@/lib/api'
import { EVENT, trackEvent } from '@/lib/posthog'

/**
 * Percentage helper for the usage bars. Clamps at 100 so over-quota
 * (rare — only when a plan-cap shrinks under the user's feet, or
 * when a metric like Connections legitimately exceeds the per-type
 * cap aggregated across types) never renders past the bar's end.
 * Returns 0 when the denominator is missing or non-positive — the
 * caller branches on `isUnlimited` to skip the bar entirely in
 * that case, so a 0 here is a safe sentinel for "limit unknown."
 */
function pct(used: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.round((used / max) * 100))
}

export function SidebarPlanBadge() {
  const { planId, loading: accountLoading } = useAccount()
  const { plansById } = usePlans()
  const { projects, views } = useDashboard()

  // Local sheet state — picker is for billing management ("Manage
  // plan" button below). The Upgrade-to-Pro banner bypasses the
  // sheet and hits Stripe Checkout directly, since the intent is
  // unambiguous (the user clicked an upgrade CTA naming the target
  // plan; no need to make them re-pick it in the sheet).
  const [tierSheetOpen, setTierSheetOpen] = useState(false)
  // Stripe Checkout takes a moment to create the session before the
  // redirect; gate the button on this so a double-tap doesn't fire
  // two POSTs.
  const [redirectingToPro, setRedirectingToPro] = useState(false)

  const openTracked = useCallback((source: 'plan_row' | 'broadcast') => {
    trackEvent(EVENT.TIER_PICKER_OPENED, { source })
    setTierSheetOpen(true)
  }, [])
  const handleBroadcast = useCallback(() => openTracked('broadcast'), [openTracked])
  useTierPickerListener(handleBroadcast)

  const currentPlan = plansById[planId]
  // Custom / enterprise plans bypass numeric limits — render an
  // "Unlimited" affordance in place of the bar.
  const isUnlimited = currentPlan?.isCustomPlan ?? false
  // Pro / enterprise already at the top of the ladder → nothing to
  // upgrade to. Hide the orange banner for them. Free + starter see it.
  const isTopTier = planId === 'pro' || planId === 'enterprise'
  const showUpgradeBanner = !isTopTier && !isUnlimited

  // ── Usage metrics — two bars: projects / views ─────────────────
  // No Connections bar: the plan's `max_connections_per_type` cap
  // is PER TYPE, not a global ceiling. A single "total / per-type
  // cap" bar conflates the two — a user with 2 Stripe + 1 PostHog
  // + 1 GA would render as 4/3 on a Free plan even though every
  // type is within limits. Modal-level toasts from
  // `enforceConnectionLimit` already surface the real per-type
  // state when the user attempts a create.
  //
  // Views ceiling: `maxViewsPerProject × maxProjects` — the absolute
  // plan ceiling, so the denominator doesn't shift as the user
  // creates projects.
  //
  // Views numerator: `views.totalCount` from the cheap `/views/count`
  // endpoint, fetched eagerly on dashboard mount. This used to be
  // `views.views.length`, which only contained views the user had
  // navigated into this session — leading to the infamous "0/100
  // views" lie when the user had real views in folders they hadn't
  // touched yet. `totalCount` is `null` while the GET is in flight;
  // we hide the bar in that case so we don't show a stale 0.
  const projectsUsed = projects.projects.length
  const maxProjects = currentPlan?.maxProjects ?? 0
  const projectsPct = pct(projectsUsed, maxProjects)

  const viewsUsed = views.totalCount
  const maxViews =
    (currentPlan?.maxViewsPerProject ?? 0) * (currentPlan?.maxProjects ?? 0)
  const viewsPct = viewsUsed != null ? pct(viewsUsed, maxViews) : 0

  // Direct Pro checkout — mirrors `<TierPickerSheet>`'s redirect
  // path (POST → 303-style hard nav to Stripe). Errors surface as
  // a toast and clear the in-flight flag so the user can retry.
  const handleUpgradeToProClick = async () => {
    if (redirectingToPro) return
    setRedirectingToPro(true)
    try {
      const { url } = await ALGORITHM.createCheckoutSession('pro')
      // Hard nav — Stripe Checkout is an external origin, so a
      // `router.push` won't work. `assign` (vs `replace`) leaves the
      // back button useful if Stripe shows them an error page.
      window.location.assign(url)
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to start checkout'
      toast.error(message)
      setRedirectingToPro(false)
    }
  }

  // Don't render the card until ALL the inputs it depends on are
  // ready. Previously we used `visibility: 'hidden'` while
  // `accountLoading`, which reserved space but flashed a stale
  // "0/100" once views.totalCount came in late. Gating on the union
  // of (account, plan, views-count) means the card pops in once
  // with the truth and stays. `currentPlan` is intentionally NOT a
  // gate — a missing-from-plansById plan id (rare, but possible for
  // legacy / custom plans) shouldn't hide billing forever; we'd
  // rather render with the default-zero ceilings than disappear.
  const isReady = !accountLoading && views.totalCount != null
  if (!isReady) return null

  return (
    <>
      <div
        // Wider side margins on mobile pull the card visibly
        // narrower than the nav items above — same content, but it
        // no longer dominates the drawer just because it's the only
        // multi-section block in there. Desktop stays at `px-2` so
        // the card sits flush with the rest of the sidebar grid.
        className="px-6 md:px-2 mb-2"
      >
        {/* ── Card chrome ──────────────────────────────────────
            When the upgrade banner is showing, the WHOLE card uses
            a single linear gradient that starts at our brand orange
            (`#F46719`) softened with white, and is fully white well
            before the bottom — so the usage stats + Manage-plan
            button sit on natural white. Explicit stops control the
            curve:
              0%   55 % brand + 45 % white → vibrant brand peach
                                            (banner area, the part
                                            you can actually tell
                                            is orange)
              25%  35 % brand + 65 % white → softer transition
              45%  12 % brand + 88 % white → almost white
              60%  pure white → from here to the bottom
            Using `color-mix(in srgb, …)` ties the gradient to the
            brand hex rather than Tailwind's generic orange tokens
            (which read as pale peach, not "our colour"). Supported
            in every evergreen browser since 2023. Pro / enterprise
            / custom users see no banner and get a plain white card
            — the orange would be misleading on a tier with nothing
            to upgrade to. */}
        <div
          className="rounded-xl border border-stroke shadow-card overflow-hidden"
          style={
            showUpgradeBanner
              ? {
                  background:
                    'linear-gradient(to bottom, ' +
                    'color-mix(in srgb, #F46719 100%, white) 0%, ' +
                    'color-mix(in srgb, #F46719 34%, white) 18%, ' +
                    'color-mix(in srgb, #F46719 18%, white) 35%, ' +
                    '#ffffff 60%)',
                }
              : { backgroundColor: '#ffffff' }
          }
        >
          {showUpgradeBanner && (
            <button
              type="button"
              onClick={handleUpgradeToProClick}
              disabled={redirectingToPro || accountLoading}
              // Whole button is the hit target (full width of the
              // card). `hover:bg-black/[0.04]` darkens the gradient
              // gently on hover so the entire row visibly responds —
              // not just the text. `group` lets the caret slide
              // right a hair on hover for liveliness. `cursor-pointer`
              // is explicit because some browsers under disabled-
              // state CSS clear the default button cursor.
              // No `justify-between`: caret sits right after the
              // PRO pill via the row-level `gap-2`, so the cluster
              // reads as one "Upgrade to PRO →" group rather than
              // having the arrow stranded at the right edge.
              className="group relative w-full flex items-center gap-2 px-3 py-3 cursor-pointer transition-colors hover:bg-black/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
              aria-label="Upgrade to Pro"
            >
              <span className="text-sm font-bold text-grey-darkest">
                Upgrade to
              </span>
              {/* `PRO` pill — dark grey-darkest background with
                  white text, matching the reference's black-pill
                  treatment. `tracking-wider` and uppercase make
                  the tiny label feel intentional, not cramped. */}
              <span className="inline-flex items-center rounded-md bg-grey-darkest px-2 py-0.5 text-[11px] font-bold tracking-wider text-white">
                PRO
              </span>
              <CaretRight
                size={16}
                weight="bold"
                className="text-grey-darkest shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </button>
          )}

          {/* ── Usage + Manage plan ──────────────────────────────
              No internal background colour — the card-level
              gradient (now white at this point) shows through. */}
          <div className="p-3">
            {isUnlimited ? (
              <p className="text-[11px] text-grey-dark mb-3">
                Unlimited projects, views &amp; connections
              </p>
            ) : (
              <div className="mb-3 space-y-2">
                <UsageBar label="Projects" used={projectsUsed} max={maxProjects} pct={projectsPct} />
                {/* Views bar is hidden until the count GET resolves —
                    showing "0/100" while the request is in flight
                    misled users with views in folders they hadn't
                    opened this session. `null` = loading; once the
                    server replies it becomes a number (possibly 0
                    for users who genuinely have no views, in which
                    case the bar correctly shows 0). */}
                {viewsUsed != null && (
                  <UsageBar label="Views" used={viewsUsed} max={maxViews} pct={viewsPct} />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => openTracked('plan_row')}
              disabled={accountLoading}
              className="w-full rounded-md border border-stroke bg-white text-grey-darkest text-xs font-semibold py-1.5 transition-colors hover:bg-hover-fill cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >
              Manage plan
            </button>
          </div>
        </div>
      </div>

      <TierPickerSheet
        open={tierSheetOpen}
        onOpenChange={setTierSheetOpen}
        currentPlanId={planId}
      />
    </>
  )
}

/**
 * Tiny row component for one usage metric — label on the left, `used
 * / max` on the right, thin progress bar underneath. Extracted so the
 * three metrics stay visually identical (vertical rhythm, type sizes,
 * bar geometry) without three copies of the JSX in the card body.
 */
function UsageBar({
  label,
  used,
  max,
  pct,
}: {
  label: string
  used: number
  max: number
  pct: number
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[11px] text-grey-dark">{label}</span>
        <span className="text-[11px] font-semibold text-grey-darkest tabular-nums">
          {used}{' '}
          <span className="text-grey-light font-normal">/ {max}</span>
        </span>
      </div>
      {/* Greyscale bar — `bg-stroke` track, `bg-grey-dark` fill. Both
          stock Tailwind tokens; no orange in the bar (the orange
          lives in the gradient banner above where it earns its keep
          as a CTA accent). */}
      <div className="h-1 w-full rounded-full bg-stroke overflow-hidden">
        <div
          className="h-full rounded-full bg-grey-dark transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
