/**
 * Subscription plan types + small pure helpers.
 *
 * The actual plan DATA (prices, features, limits) lives in the
 * Supabase `subscriptions` table — see the migration in
 * `supabase-schema.sql`. Frontend reads it via `usePlans()`. Earlier
 * versions of this file hard-coded a `PLANS` record here; we moved
 * it to the DB so a price change doesn't require a code ship.
 *
 * This file keeps the bits that don't sensibly live in a row:
 *   - `PlanId` — the union of plan identifiers the codebase
 *     reasons about ('free' / 'starter' / 'pro'). The DB column is
 *     `TEXT` for flexibility, but the application narrows to this
 *     union so e.g. "starter" routes get a typo-proof type.
 *   - `Plan` — TS shape mirroring a `subscriptions` row. Consumers
 *     get this back from `usePlans()`.
 *   - `asPlanId` — runtime narrowing for values coming out of the
 *     DB. Anything unknown falls back to `'free'` so a missing /
 *     mis-typed row never breaks the chrome.
 *   - `formatPrice` — shared formatter so the picker + the sidebar
 *     subheader render the cents-stored prices identically.
 *
 * Adding a new plan = INSERT into `subscriptions` + extend the
 * `PlanId` union here. The two halves are coupled by intent, not
 * by enforced contract — the type guard catches the rest.
 */

import type { ConnectionType } from '@/types/connection'

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise'

/**
 * One row from `subscriptions`, in camelCase the frontend prefers.
 * The fetch hook maps snake_case → camelCase at the boundary so
 * consumers don't deal with `price_monthly_cents` everywhere.
 *
 * `priceMonthlyCents` is the canonical number used for comparisons
 * / sorting / display formatting. Stored in cents in the DB to dodge
 * floating-point rounding on values like $5.99.
 *
 * `introPriceMonthlyCents` + `introDurationMonths`: when both are
 * set, the plan runs the intro price for the first N months of a
 * fresh subscription. Pro launches with `($5, 1)` — $5 first month,
 * then $15/mo. Both null → no intro, plan charges regular every
 * month from day one.
 *
 * `allowedConnectionTypes`:
 *   - `null` → no restriction, every connection type permitted.
 *   - `ConnectionType[]` → whitelist (free's GA/PostHog/Stripe).
 */
export interface Plan {
  id: PlanId
  /**
   * The RAW `subscriptions.id` string, before `asPlanId` narrowing.
   * For base plans this equals `id` ('starter', 'pro'). For event-
   * tier VARIATIONS (e.g. 'starter_250k') it preserves the real id —
   * `id` would otherwise collapse to 'free' via `asPlanId`, losing
   * the identity. Checkout / the slider lookup use this, not `id`.
   */
  rawId: string
  name: string
  tagline: string | null
  priceMonthlyCents: number
  /**
   * Monthly tracked-event cap for this plan/variation. `null` when
   * the column isn't set (legacy rows). Base Starter/Pro = 50000;
   * variations carry their breakpoint (250000 … 10000000).
   */
  maxEventsMonthly: number | null
  /**
   * True for event-tier VARIATION rows — alternate price points of a
   * base plan at higher event caps. Variations are NOT rendered as
   * their own cards; they feed the event-volume slider, which swaps
   * the displayed price on the base card. Filter these out of any
   * card list.
   */
  isVariation: boolean
  /**
   * For a variation, the raw id of the base plan it varies
   * ('starter' | 'pro'). `null` for base plans. The slider matches
   * `variationOf === base.rawId` + `maxEventsMonthly === selected`
   * to resolve the price.
   */
  variationOf: string | null
  introPriceMonthlyCents: number | null
  introDurationMonths: number | null
  features: string[]
  maxProjects: number
  maxViewsPerProject: number
  maxConnectionsPerType: number
  allowedConnectionTypes: ConnectionType[] | null
  displayOrder: number
  /**
   * Stripe Price object id (e.g. `price_1Q…`) backing this plan.
   * `null` for the free plan (no Stripe entity) AND for any paid
   * plan that hasn't been wired in the Stripe Dashboard yet —
   * callers should treat null as "Checkout not available, fall
   * back to the contact-us toast".
   */
  stripePriceId: string | null
  /**
   * Optional Stripe Coupon id (e.g. `coupon_…`) applied to the
   * Checkout Session as a one-time discount when the plan has
   * intro pricing. For Pro this would be a "$10 off, 1 month"
   * coupon so the first invoice settles to $5 instead of $15.
   * `null` when no intro applies.
   */
  stripeIntroCouponId: string | null
  /**
   * Short support-tier label shown in the pricing table's
   * "Support" comparison row ("Email" / "Priority email" / "Custom").
   * `null` falls back to "—".
   */
  support: string | null
  /**
   * When true, the plan is a contact-sales tier without a fixed
   * price or numeric limits. Rendering treats it specially:
   *   - Price cell shows "Contact us" instead of a $ amount.
   *   - Every limit cell shows "Custom".
   *   - The CTA becomes a chat-style "Contact us" button.
   * `stripePriceId` is always null for custom plans — there's no
   * Checkout path; the button opens a mailto/contact form.
   */
  isCustomPlan: boolean
  /**
   * When true, the plan exists in the DB (so historical
   * `accounts.plan_id` references still resolve) but should NOT
   * appear in the public pricing surface or the upgrade picker.
   * Used for retired tiers — e.g. Free, kept as a row so legacy
   * accounts still have something to point at, but no longer
   * offered as a choice to new users. Defaults to `false` when the
   * DB column is null/missing.
   */
  disabled: boolean
}

/**
 * Narrow a free-text plan_id (from `accounts.plan_id` or a query
 * result) to the application's `PlanId` union. Unknown values
 * collapse to `'free'` so the rest of the app has a safe default
 * to render against.
 */
export function asPlanId(value: string | null | undefined): PlanId {
  if (
    value === 'free' ||
    value === 'starter' ||
    value === 'pro' ||
    value === 'enterprise'
  ) {
    return value
  }
  return 'free'
}

/**
 * Format a cents value as `$X` (no decimals when round, `$X.YY`
 * otherwise). Used in the picker card price line + anywhere else
 * we display plan prices. Centralised so a future currency switch
 * (or locale-aware formatting) lands in one place.
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}
