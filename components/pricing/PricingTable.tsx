'use client'

/**
 * Plan-comparison table — same component renders in the dashboard
 * (inside `<TierPickerSheet>` opened from the sidebar profile) and
 * on the landing page (above the FAQ). Light theme.
 *
 * Layout (desktop, `md+`):
 *   - First column = feature labels ("Price / month", "Projects", …),
 *     left-aligned.
 *   - Plan columns center their values. The "Pro" column carries a
 *     subtle brand-tinted band that runs through every row to anchor
 *     it as the highlighted upsell tier.
 *   - Final row is the CTA row — pill-shaped buttons whose label +
 *     icon reflect the relationship between the plan and the user's
 *     current plan: lower = "Downgrade to X" (⌄), same = dashed
 *     "You're on this plan", higher = "Upgrade to X" (⌃), custom =
 *     "Contact us" (chat icon).
 *
 * Layout (mobile):
 *   - Stacks plans as cards. Each card mirrors the table's row data
 *     vertically with a CTA at the bottom. The grid table reads
 *     cramped below ~700 px so we swap to cards instead of
 *     horizontal-scrolling.
 *
 * Data comes from `usePlans()` (Supabase `subscriptions` table)
 * sorted by `display_order`. Custom plans (`isCustomPlan: true`)
 * display "Custom" for every limit and "Contact us" for both price
 * and CTA — Enterprise is the only such plan today.
 *
 * Two CTA modes via `variant`:
 *   - `'signup'`: landing-page mode. CTAs are "Get X" links to
 *     /signup (or contact for Enterprise). No "Current plan"
 *     concept since there's no signed-in user on the landing page.
 *   - `'upgrade'`: dashboard mode. CTAs fire `onSelect(planId)` so
 *     the caller (today: `<TierPickerSheet>`) can route the click
 *     to Stripe Checkout. The card matching `currentPlanId` gets
 *     the dashed "You're on this plan" footer.
 */

import Link from 'next/link'
import {
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  ChatCircle,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatPrice,
  type Plan,
  type PlanId,
} from '@/constants/plans'
import { usePlans } from '@/hooks/usePlans'

/** Email used by the Enterprise / contact CTAs. */
const CONTACT_EMAIL = 'team@heavenmade.org'

interface PricingTableProps {
  /**
   * `signup` — landing page: CTAs link to /signup (or open a
   *            mailto for Enterprise), no "Current plan" markup.
   * `upgrade` — dashboard: CTAs call `onSelect(planId)` (free →
   *            handled by caller; pro/starter → Stripe Checkout;
   *            enterprise → mailto). The plan whose id matches
   *            `currentPlanId` gets the dashed badge + footer.
   */
  variant: 'signup' | 'upgrade'
  /** Required for `variant='upgrade'`. The user's active plan. */
  currentPlanId?: PlanId
  /** Required for `variant='upgrade'`. Fired when a non-current
   *  plan's CTA is clicked. */
  onSelect?: (planId: PlanId) => void
}

export function PricingTable({
  variant,
  currentPlanId,
  onSelect,
}: PricingTableProps) {
  const { plans, loading, error } = usePlans()

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-grey-light">
        <ArrowsClockwise size={14} weight="bold" className="animate-spin" />
        <span>Loading plans…</span>
      </div>
    )
  }

  if (error || plans.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-stroke bg-white p-6 text-center">
        <p className="text-sm text-grey-darkest mb-1">
          Couldn't load plans.
        </p>
        <p className="text-xs text-grey-light">
          Try again in a moment, or email{' '}
          <span className="font-medium">{CONTACT_EMAIL}</span> for help.
        </p>
      </div>
    )
  }

  // Resolve the user's current plan's display_order so each CTA
  // can decide whether it's an upgrade (CTA above) or a downgrade
  // (CTA below). On landing (signup variant) this stays null —
  // every CTA is a "Get X" link.
  const currentOrder = (() => {
    if (variant !== 'upgrade' || !currentPlanId) return null
    const found = plans.find(p => p.id === currentPlanId)
    return found?.displayOrder ?? null
  })()

  return (
    <>
      {/* Mobile — one card per plan, stacked. */}
      <div className="flex flex-col gap-4 md:hidden">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={variant === 'upgrade' && plan.id === currentPlanId}
            cta={
              <PlanCta
                plan={plan}
                isCurrent={variant === 'upgrade' && plan.id === currentPlanId}
                currentOrder={currentOrder}
                variant={variant}
                onSelect={onSelect}
              />
            }
          />
        ))}
      </div>

      {/* Desktop — CSS grid. One label column + one column per plan.
          We render every row with one cell-per-plan so the Pro
          column's tinted band can span the full table height as a
          continuous vertical stripe (a positioned overlay would
          fight the table's auto-sizing). */}
      <div
        className="hidden md:grid rounded-2xl border border-stroke bg-white shadow-card overflow-hidden"
        style={{
          gridTemplateColumns: `minmax(180px, 1.2fr) repeat(${plans.length}, minmax(0, 1fr))`,
        }}
      >
        {/* ── Header row ──────────────────────────────────────── */}
        <HeaderCell label="Feature" alignment="left" />
        {plans.map(plan => (
          <HeaderCell
            key={plan.id}
            label={plan.name}
            highlight={plan.id === 'pro'}
            alignment="center"
          />
        ))}

        {/* ── Price row ──────────────────────────────────────── */}
        <RowLabel>Price / month</RowLabel>
        {plans.map(plan => (
          <PriceCell
            key={plan.id}
            plan={plan}
            highlight={plan.id === 'pro'}
          />
        ))}

        {/* ── Projects ────────────────────────────────────────── */}
        <RowLabel>Projects</RowLabel>
        {plans.map(plan => (
          <ValueCell
            key={plan.id}
            highlight={plan.id === 'pro'}
            value={plan.isCustomPlan ? 'Custom' : String(plan.maxProjects)}
          />
        ))}

        {/* ── Views per project ────────────────────────────────── */}
        <RowLabel>Views per project</RowLabel>
        {plans.map(plan => (
          <ValueCell
            key={plan.id}
            highlight={plan.id === 'pro'}
            value={
              plan.isCustomPlan ? 'Custom' : String(plan.maxViewsPerProject)
            }
          />
        ))}

        {/* ── Connections per integration ─────────────────────── */}
        <RowLabel>Connections per integration</RowLabel>
        {plans.map(plan => (
          <ValueCell
            key={plan.id}
            highlight={plan.id === 'pro'}
            value={
              plan.isCustomPlan ? 'Custom' : String(plan.maxConnectionsPerType)
            }
          />
        ))}

        {/* ── Integrations included ───────────────────────────── */}
        <RowLabel>Integrations included</RowLabel>
        {plans.map(plan => (
          <IntegrationsCell
            key={plan.id}
            plan={plan}
            highlight={plan.id === 'pro'}
          />
        ))}

        {/* ── Support ─────────────────────────────────────────── */}
        <RowLabel>Support</RowLabel>
        {plans.map(plan => (
          <ValueCell
            key={plan.id}
            highlight={plan.id === 'pro'}
            value={plan.isCustomPlan ? 'Custom' : plan.support ?? '—'}
          />
        ))}

        {/* ── CTA row (last) ──────────────────────────────────── */}
        <RowLabel last />
        {plans.map((plan, i) => (
          <CtaCell
            key={plan.id}
            highlight={plan.id === 'pro'}
            isLast={i === plans.length - 1}
          >
            <PlanCta
              plan={plan}
              isCurrent={variant === 'upgrade' && plan.id === currentPlanId}
              currentOrder={currentOrder}
              variant={variant}
              onSelect={onSelect}
            />
          </CtaCell>
        ))}
      </div>
    </>
  )
}

// ─── Desktop grid sub-cells ────────────────────────────────────────────────

// Every grid cell uses `flex items-center` (plus `justify-center` for
// value/header/CTA columns, left-default for row labels). This vertical
// centering is what fixes the "first month $5" double-line row from
// shifting other plans' single-line prices to the top — Grid auto-rows
// make the row as tall as the tallest cell, and the flex centering
// vertically aligns each cell's content within that height.

function HeaderCell({
  label,
  highlight = false,
  alignment = 'left',
}: {
  label: string
  highlight?: boolean
  alignment?: 'left' | 'center'
}) {
  return (
    <div
      className={cn(
        'px-5 pt-5 pb-4 border-b border-stroke/60 bg-grey-50/40 flex items-center',
        alignment === 'center' ? 'justify-center' : 'justify-start',
        highlight && 'bg-brand/[0.07]',
      )}
    >
      <p className="text-sm font-bold text-grey-darkest">{label}</p>
    </div>
  )
}

function RowLabel({
  children,
  last = false,
}: {
  children?: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={cn(
        'px-5 py-4 text-sm text-grey-light font-medium flex items-center',
        !last && 'border-b border-stroke/60',
      )}
    >
      {children}
    </div>
  )
}

function ValueCell({
  value,
  highlight = false,
}: {
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'px-5 py-4 text-sm text-grey-darkest border-b border-stroke/60 flex items-center justify-center text-center',
        highlight && 'bg-brand/[0.07]',
      )}
    >
      {value}
    </div>
  )
}

function CtaCell({
  children,
  highlight = false,
  isLast = false,
}: {
  children: React.ReactNode
  highlight?: boolean
  isLast?: boolean
}) {
  return (
    <div
      className={cn(
        'px-5 py-5 flex items-center justify-center',
        highlight && 'bg-brand/[0.07]',
        highlight && isLast && 'rounded-br-2xl',
      )}
    >
      {children}
    </div>
  )
}

function PriceCell({
  plan,
  highlight = false,
}: {
  plan: Plan
  highlight?: boolean
}) {
  const hasIntro =
    plan.introPriceMonthlyCents != null && plan.introDurationMonths != null

  let body: React.ReactNode
  if (plan.isCustomPlan) {
    body = <p className="text-sm font-semibold text-grey-darkest">Contact us</p>
  } else if (plan.priceMonthlyCents === 0) {
    body = <p className="text-sm font-semibold text-grey-darkest">Free</p>
  } else {
    body = (
      <>
        <p className="text-sm font-semibold text-grey-darkest">
          {formatPrice(plan.priceMonthlyCents)}/mo
        </p>
        {hasIntro && (
          <p className="text-xs text-grey-light mt-0.5">
            first month {formatPrice(plan.introPriceMonthlyCents!)}
          </p>
        )}
      </>
    )
  }

  return (
    // Two-line layout (intro pricing) needs flex-col to stack; the outer
    // `items-center justify-center` centers both lines vertically against
    // single-line price cells in the same row.
    <div
      className={cn(
        'px-5 py-4 border-b border-stroke/60 flex flex-col items-center justify-center text-center',
        highlight && 'bg-brand/[0.07]',
      )}
    >
      {body}
    </div>
  )
}

function IntegrationsCell({
  plan,
  highlight = false,
}: {
  plan: Plan
  highlight?: boolean
}) {
  let label: React.ReactNode
  if (plan.isCustomPlan) {
    label = <span className="text-sm text-grey-darkest">Custom</span>
  } else if (plan.allowedConnectionTypes == null) {
    label = <span className="text-sm text-grey-darkest">All integrations</span>
  } else if (plan.allowedConnectionTypes.length === 0) {
    label = <span className="text-sm text-grey-light">—</span>
  } else {
    label = (
      <p className="text-xs text-grey-darkest leading-snug">
        {prettyConnectionList(plan.allowedConnectionTypes)}
      </p>
    )
  }

  return (
    <div
      className={cn(
        'px-5 py-4 border-b border-stroke/60 flex items-center justify-center text-center',
        highlight && 'bg-brand/[0.07]',
      )}
    >
      {label}
    </div>
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

// ─── Mobile cards ──────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  cta,
}: {
  plan: Plan
  isCurrent: boolean
  cta: React.ReactNode
}) {
  const isHighlighted = isCurrent || plan.id === 'pro'
  const hasIntro =
    plan.introPriceMonthlyCents != null && plan.introDurationMonths != null

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-white p-5 shadow-card',
        isHighlighted ? 'border-brand/40 ring-1 ring-brand/15' : 'border-stroke',
      )}
    >
      <h3 className="text-lg font-semibold text-grey-darkest">{plan.name}</h3>
      {plan.tagline && (
        <p className="text-xs text-grey-light mt-0.5 leading-snug">
          {plan.tagline}
        </p>
      )}

      <div className="mt-4 mb-5">
        {plan.isCustomPlan ? (
          <p className="text-3xl font-bold text-grey-darkest">Contact us</p>
        ) : plan.priceMonthlyCents === 0 ? (
          <p className="text-3xl font-bold text-grey-darkest">Free</p>
        ) : (
          <>
            <p className="text-3xl font-bold text-grey-darkest tabular-nums">
              {formatPrice(plan.priceMonthlyCents)}
              <span className="ml-1 text-xs font-normal text-grey-light">
                / month
              </span>
            </p>
            {hasIntro && (
              <p className="text-xs text-grey-light mt-1">
                first month {formatPrice(plan.introPriceMonthlyCents!)}
              </p>
            )}
          </>
        )}
      </div>

      <dl className="space-y-2 mb-5 text-sm">
        <CardRow
          label="Projects"
          value={plan.isCustomPlan ? 'Custom' : String(plan.maxProjects)}
        />
        <CardRow
          label="Views per project"
          value={
            plan.isCustomPlan ? 'Custom' : String(plan.maxViewsPerProject)
          }
        />
        <CardRow
          label="Connections per integration"
          value={
            plan.isCustomPlan ? 'Custom' : String(plan.maxConnectionsPerType)
          }
        />
        <CardRow
          label="Integrations"
          value={
            plan.isCustomPlan
              ? 'Custom'
              : plan.allowedConnectionTypes == null
                ? 'All'
                : prettyConnectionList(plan.allowedConnectionTypes)
          }
        />
        <CardRow
          label="Support"
          value={plan.isCustomPlan ? 'Custom' : plan.support ?? '—'}
        />
      </dl>

      {cta}
    </div>
  )
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-stroke/60 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-grey-light">{label}</dt>
      <dd className="font-medium text-grey-darkest text-right">{value}</dd>
    </div>
  )
}

// ─── Shared CTA ────────────────────────────────────────────────────────────
//
// Decides which of four pill flavours to render based on:
//   - `variant`: signup (landing) vs upgrade (dashboard)
//   - `plan.isCustomPlan`: forces "Contact us" treatment
//   - `currentOrder` + `plan.displayOrder`: upgrade vs downgrade direction
//
// Mapping (upgrade variant):
//   plan === current      → dashed brand outline,  "You're on this plan"
//   plan.order > current  → solid brand,           "Upgrade to X" ⌃
//   plan.order < current  → outlined neutral,      "Downgrade to X" ⌄
//   plan.isCustomPlan     → solid brand + chat icon, "Contact us"

function PlanCta({
  plan,
  isCurrent,
  currentOrder,
  variant,
  onSelect,
}: {
  plan: Plan
  isCurrent: boolean
  currentOrder: number | null
  variant: 'signup' | 'upgrade'
  onSelect?: (planId: PlanId) => void
}) {
  // Custom plans (Enterprise) → route the click to the landing
  // page's "Contact" section, regardless of variant:
  //
  //   - On the landing page itself (signup variant) the href is a
  //     same-page anchor — the browser smooth-scrolls to the
  //     `<section id="contact">` further down the page.
  //   - On the dashboard (upgrade variant) the leading `/` makes
  //     the browser perform a full navigation to the landing route,
  //     after which the hash resolves to the same anchor.
  //
  // Plain `<a>` (not `<Link>`) because we WANT a full navigation
  // from `/hub/*` — otherwise the BottomDialog would stay mounted
  // in a partial state during the App Router transition. The
  // anchor's default behavior gives us "unmount the dashboard,
  // mount the landing page, scroll to #contact" with zero JS.
  if (plan.isCustomPlan) {
    return (
      <a
        href="/#contact"
        className="inline-flex items-center justify-center gap-1.5 w-full rounded-full h-9 px-4 text-xs font-medium bg-brand hover:bg-brand/90 text-white transition-colors"
      >
        <ChatCircle size={12} weight="bold" />
        Contact us
      </a>
    )
  }

  if (variant === 'upgrade' && isCurrent) {
    return (
      <span className="inline-flex items-center justify-center w-full rounded-full h-9 px-4 text-xs font-medium border border-dashed border-brand/50 text-brand bg-brand/[0.04]">
        You're on this plan
      </span>
    )
  }

  // Signup variant — every CTA is a /signup link. No upgrade/downgrade
  // semantics because the user isn't on any plan yet.
  if (variant === 'signup') {
    const ctaLabel = plan.id === 'free' ? 'Start free' : `Get ${plan.name}`
    return (
      <Link
        href="/signup"
        className={cn(
          'inline-flex items-center justify-center gap-1.5 w-full rounded-full h-9 px-4 text-xs font-medium transition-colors',
          plan.id === 'free'
            ? 'border border-stroke bg-white text-grey-darkest hover:bg-hover-fill'
            : 'bg-brand hover:bg-brand/90 text-white',
        )}
      >
        {ctaLabel}
      </Link>
    )
  }

  // Upgrade variant — direction depends on plan.displayOrder vs
  // the user's current plan's order. If we can't resolve current
  // (currentOrder === null), treat as "neutral upgrade" — same
  // visual as upgrade. Defensive only; in practice currentOrder is
  // always set in upgrade variant.
  const direction =
    currentOrder == null
      ? 'up'
      : plan.displayOrder > currentOrder
        ? 'up'
        : plan.displayOrder < currentOrder
          ? 'down'
          : 'same' // unreachable because isCurrent caught it above
  const isDowngrade = direction === 'down'
  const label = isDowngrade
    ? `Downgrade to ${plan.name}`
    : `Upgrade to ${plan.name}`

  return (
    <Button
      onClick={() => onSelect?.(plan.id)}
      className={cn(
        'w-full rounded-full h-9 px-4 gap-1.5 text-xs font-medium',
        isDowngrade
          ? 'border border-stroke bg-white text-grey-darkest hover:bg-hover-fill shadow-none'
          : 'bg-brand hover:bg-brand/90 text-white shadow-none',
      )}
    >
      {isDowngrade ? (
        <CaretDown size={11} weight="bold" />
      ) : (
        <CaretUp size={11} weight="bold" />
      )}
      {label}
    </Button>
  )
}
