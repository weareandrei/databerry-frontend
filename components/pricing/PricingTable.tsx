'use client'

/**
 * Plan-comparison table — renders on the landing page (above the
 * FAQ) AND inside `<TierPickerSheet>` (the dashboard upgrade sheet).
 * One component, one set of cells, responsive sizing for both
 * contexts.
 *
 * Layout (every viewport):
 *   - First column is feature labels, left-aligned. The top-left
 *     cell is intentionally empty so the plan-header cards anchor
 *     the visual top of each column.
 *   - Each plan column starts with a rich PLAN-HEADER CARD:
 *     plan name + optional "Popular" badge + large price +
 *     tagline. NO CTA at the top — the only CTA lives at the
 *     bottom of the column.
 *   - Feature rows fill the middle (Projects, Views per project,
 *     Connections per integration, Integrations, Support). Values
 *     center-align under their plan columns.
 *   - The bottom row is the CTA — "Get started" pill button for
 *     every plan (Enterprise / custom plans surface "Contact us"
 *     instead, since they route to a different flow).
 *   - The "Pro" column carries a subtle brand-tinted vertical band
 *     that runs from the plan-header card to the CTA, anchoring
 *     it as the highlighted upsell tier.
 *
 * Layout (mobile, `<md`):
 *   - Same grid structure, smaller padding + text. A `min-w` floor
 *     on the inner grid (~620 px) means phones smaller than that
 *     scroll horizontally — the rounded outer card frames the
 *     scroll region cleanly so it still reads as one table.
 *
 * Data comes from `usePlans()` (Supabase `subscriptions` table)
 * sorted by `display_order`. Custom plans (`isCustomPlan: true`)
 * display "Custom" for every limit and "Contact us" for both price
 * and CTA — Enterprise is the only such plan today.
 *
 * Two CTA modes via `variant`:
 *   - `'signup'`: landing-page mode. CTAs are "Get started" links
 *     to /signup (or contact for Enterprise). No "Current plan"
 *     concept since there's no signed-in user on the landing page.
 *   - `'upgrade'`: dashboard mode. CTAs call `onSelect(planId)`
 *     and label themselves "Upgrade to X" / "Downgrade to X" /
 *     dashed "Current plan" depending on direction relative to
 *     `currentPlanId`.
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
import { EVENT, trackEvent } from '@/lib/posthog'

/** Email used by the Enterprise / contact CTAs. */
const CONTACT_EMAIL = 'team@heavenmade.org'

interface PricingTableProps {
  /**
   * `signup` — landing page: CTAs link to /signup (or open a
   *            mailto for Enterprise), no "Current plan" markup.
   * `upgrade` — dashboard: CTAs call `onSelect(planId)` (free →
   *            handled by caller; pro/starter → Stripe Checkout;
   *            enterprise → mailto). The plan whose id matches
   *            `currentPlanId` gets the dashed badge.
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
  // every CTA is a "Get started" link.
  const currentOrder = (() => {
    if (variant !== 'upgrade' || !currentPlanId) return null
    const found = plans.find(p => p.id === currentPlanId)
    return found?.displayOrder ?? null
  })()

  return (
    // Outer card chrome — rounded, soft shadow. `overflow-hidden`
    // crops the Pro column's brand-tint band to the rounded outer
    // corners cleanly. `overflow-x-auto` on the inner wrapper
    // turns ON the horizontal scroll for phones; `md:overflow-
    // visible` switches it off on desktop so a sticky header
    // wouldn't capture wheel events.
    <div className="rounded-2xl border border-stroke bg-white shadow-card overflow-hidden">
      <div className="overflow-x-auto md:overflow-visible">
        <div
          className="grid min-w-[760px] md:min-w-0"
          style={{
            // Label column: `minmax(110px, 0.8fr)` — narrower than
            // the plan columns since it only holds short labels
            // ("Projects", "Views", "Support"). The 0.8fr ratio
            // keeps it slim on desktop (~155 px on a max-w-7xl
            // container) so the plan cards get the visual weight.
            // Plan columns: `minmax(160px, 1fr)` — wide enough on
            // mobile that "$15/mo" + "first month $5" fits on one
            // line and "Get started" doesn't pinch. On desktop the
            // 1fr ratio expands them evenly.
            gridTemplateColumns: `minmax(110px, 0.8fr) repeat(${plans.length}, minmax(160px, 1fr))`,
          }}
        >
          {/* ── Top row: empty leading cell + plan-header cards ── */}
          <EmptyCell which="top-left" />
          {plans.map(plan => (
            <PlanHeaderCell
              key={plan.id}
              plan={plan}
              highlight={plan.id === 'pro'}
            />
          ))}

          {/* ── Projects ────────────────────────────────────────── */}
          <RowLabel mobileLabel="Projects">Projects</RowLabel>
          {plans.map(plan => (
            <ValueCell
              key={plan.id}
              highlight={plan.id === 'pro'}
              value={plan.isCustomPlan ? 'Custom' : String(plan.maxProjects)}
            />
          ))}

          {/* ── Views per project ────────────────────────────────── */}
          <RowLabel mobileLabel="Views">Views per project</RowLabel>
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
          <RowLabel mobileLabel="Conn./type">Connections per integration</RowLabel>
          {plans.map(plan => (
            <ValueCell
              key={plan.id}
              highlight={plan.id === 'pro'}
              value={
                plan.isCustomPlan
                  ? 'Custom'
                  : String(plan.maxConnectionsPerType)
              }
            />
          ))}

          {/* ── Integrations included ───────────────────────────── */}
          <RowLabel mobileLabel="Integrations">Integrations included</RowLabel>
          {plans.map(plan => (
            <IntegrationsCell
              key={plan.id}
              plan={plan}
              highlight={plan.id === 'pro'}
            />
          ))}

          {/* ── Support ─────────────────────────────────────────── */}
          <RowLabel mobileLabel="Support">Support</RowLabel>
          {plans.map(plan => (
            <ValueCell
              key={plan.id}
              highlight={plan.id === 'pro'}
              value={plan.isCustomPlan ? 'Custom' : plan.support ?? '—'}
            />
          ))}

          {/* ── Bottom row: empty leading cell + CTAs ───────────── */}
          <EmptyCell which="bottom-left" />
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
      </div>
    </div>
  )
}

// ─── Cells ─────────────────────────────────────────────────────────────────

/**
 * Empty spacer cell — used in the leftmost column of both the top
 * (plan-header) row and the bottom (CTA) row. The plan-header
 * cards visually anchor the column starts; a "Feature" label cell
 * to their left would compete. Same for the CTA row.
 *
 * The top variant carries the bottom border so the divider
 * between header and feature rows runs uninterrupted across the
 * grid. The bottom variant has no bottom border (it's the last
 * row).
 */
function EmptyCell({ which }: { which: 'top-left' | 'bottom-left' }) {
  return (
    <div
      className={cn(
        which === 'top-left' && 'border-b border-stroke/60',
      )}
    />
  )
}

/**
 * Plan-header card — the rich top cell for each plan column. Left-
 * aligned (reads as a card, not a table header). Contains:
 *   - Plan name (bold) + optional "Popular" badge inline.
 *   - Price (big numeric for `$X/mo`, large "Free" or "Custom"
 *     fallbacks for the edge cases).
 *   - Intro-pricing subline if applicable.
 *   - Tagline (grey, smaller).
 *
 * No CTA here — the only CTA per column lives at the bottom of
 * the table.
 */
function PlanHeaderCell({
  plan,
  highlight = false,
}: {
  plan: Plan
  highlight?: boolean
}) {
  const hasIntro =
    plan.introPriceMonthlyCents != null && plan.introDurationMonths != null
  return (
    <div
      className={cn(
        'px-4 md:px-6 pt-5 md:pt-7 pb-5 md:pb-7 border-b border-stroke/60 flex flex-col items-start text-left',
        highlight && 'bg-brand/[0.07]',
      )}
    >
      {/* Plan name + Popular badge */}
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <h3 className="text-base md:text-xl font-bold text-grey-darkest leading-none">
          {plan.name}
        </h3>
        {plan.id === 'pro' && (
          <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-brand">
            Popular
          </span>
        )}
      </div>

      {/* Price block — structured as two stacked rows of RESERVED
          height so every plan card shares the same price baseline
          AND the same total price-area height:
            1. Price line (`leading-none`, top-aligned in the block)
               — "$15", "Free", "Custom" all sit at the same Y.
            2. Intro-pricing line — reserved row even when empty so
               the tagline below stays vertically aligned across all
               four columns. Pro is the only plan that fills it
               today; the empty reserved space under Free/Starter/
               Enterprise is intentional. */}
      <div className="mb-3 md:mb-4">
        <div className="flex items-baseline gap-1">
          {plan.isCustomPlan ? (
            <p className="text-2xl md:text-4xl font-bold text-grey-darkest leading-none tabular-nums">
              Custom
            </p>
          ) : plan.priceMonthlyCents === 0 ? (
            <p className="text-2xl md:text-4xl font-bold text-grey-darkest leading-none">
              Free
            </p>
          ) : (
            <>
              <p className="text-2xl md:text-4xl font-bold text-grey-darkest leading-none tabular-nums">
                {formatPrice(plan.priceMonthlyCents)}
              </p>
              <p className="text-xs md:text-sm text-grey-light">/mo</p>
            </>
          )}
        </div>
        {/* Reserved intro-line slot. `h-4 md:h-5 mt-1.5` matches the
            line-height + margin we'd use if intro pricing exists,
            so Free/Starter/Enterprise have an empty gap of exactly
            the same size as Pro's "first month $5" line. */}
        <div className="h-4 md:h-5 mt-1.5">
          {hasIntro && (
            <p className="text-[10px] md:text-xs text-grey-light leading-tight">
              first month {formatPrice(plan.introPriceMonthlyCents!)}
            </p>
          )}
        </div>
      </div>

      {/* Tagline — small grey, 1-3 lines depending on length. The
          `min-h` keeps all four plan-header cards the same height
          even when one plan has a long tagline and another has
          none (otherwise the grid rows below would slide up under
          the shorter cards). */}
      <p className="text-xs md:text-sm text-grey-light leading-snug min-h-[2.5em]">
        {plan.tagline ?? ''}
      </p>
    </div>
  )
}

/**
 * Row label — first column of every feature row. Renders the
 * full descriptive label on desktop and a shorter version on
 * mobile (via the `mobileLabel` prop) so labels like "Connections
 * per integration" don't wrap to three lines in the narrow mobile
 * label column.
 */
function RowLabel({
  children,
  mobileLabel,
}: {
  children: React.ReactNode
  mobileLabel?: string
}) {
  // Slim horizontal padding — the label column is intentionally the
  // narrowest in the grid, and the labels themselves are short
  // ("Projects", "Views per project", "Support"). Bigger padding
  // here just shoves the labels off the left edge and creates dead
  // space between them and the plan-value columns.
  return (
    <div className="pl-3 md:pl-4 pr-2 md:pr-3 py-3 md:py-4 text-xs md:text-sm text-grey-dark font-semibold flex items-center border-b border-stroke/60 leading-tight">
      {mobileLabel ? (
        <>
          <span className="md:hidden">{mobileLabel}</span>
          <span className="hidden md:inline">{children}</span>
        </>
      ) : (
        children
      )}
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
        'px-3 md:px-5 py-3 md:py-4 text-xs md:text-sm text-grey-darkest border-b border-stroke/60 flex items-center justify-center text-center leading-tight',
        highlight && 'bg-brand/[0.07]',
      )}
    >
      {value}
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
  // Two parallel labels — the comma-separated list is unreadable
  // when squeezed into the mobile plan column, so we show just
  // the count there. Desktop gets the full list. The Pro / "All"
  // / "Custom" cases collapse to the same short word at both
  // widths.
  let mobileLabel: React.ReactNode
  let desktopLabel: React.ReactNode
  if (plan.isCustomPlan) {
    mobileLabel = desktopLabel = 'Custom'
  } else if (plan.allowedConnectionTypes == null) {
    mobileLabel = desktopLabel = 'All'
  } else if (plan.allowedConnectionTypes.length === 0) {
    mobileLabel = desktopLabel = '—'
  } else {
    const count = plan.allowedConnectionTypes.length
    mobileLabel = `${count} ${count === 1 ? 'tool' : 'tools'}`
    desktopLabel = prettyConnectionList(plan.allowedConnectionTypes)
  }

  return (
    <div
      className={cn(
        'px-3 md:px-5 py-3 md:py-4 text-xs md:text-sm text-grey-darkest border-b border-stroke/60 flex items-center justify-center text-center leading-tight',
        highlight && 'bg-brand/[0.07]',
      )}
    >
      <span className="md:hidden">{mobileLabel}</span>
      <span className="hidden md:inline">{desktopLabel}</span>
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
        'px-3 md:px-5 py-4 md:py-6 flex items-center justify-center',
        highlight && 'bg-brand/[0.07]',
        // The Pro column's bottom-right is the table's rounded
        // corner ONLY when Pro happens to be the last plan in
        // order; otherwise the rounding belongs to whichever
        // column is last. `isLast` + `highlight` overlap only when
        // Pro is the last plan.
        highlight && isLast && 'rounded-br-2xl',
      )}
    >
      {children}
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

// ─── Plan CTA ──────────────────────────────────────────────────────────────
//
// Decides which of four pill flavours to render based on:
//   - `variant`: signup (landing) vs upgrade (dashboard)
//   - `plan.isCustomPlan`: forces "Contact us" treatment
//   - `currentOrder` + `plan.displayOrder`: upgrade vs downgrade direction
//
// Mapping:
//   plan.isCustomPlan         → solid brand + chat icon, "Contact us"
//   variant === 'signup'      → "Get started" (every non-custom plan).
//                               Free plan uses an outlined treatment so
//                               it doesn't compete with the upsell tiers'
//                               solid-brand fills.
//   variant === 'upgrade':
//     plan === current        → dashed brand outline, "Current plan"
//     plan.order > current    → solid brand,           "Upgrade to X" ⌃
//     plan.order < current    → outlined neutral,      "Downgrade to X" ⌄

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
  // Sizing + label classes paired so the same component renders
  // compact on mobile (fits the narrow mobile plan column) and
  // full-sized on desktop.
  if (plan.isCustomPlan) {
    return (
      <a
        href="/#contact"
        onClick={() =>
          trackEvent(EVENT.LANDING_TIER_CTA_CLICKED, {
            tier: plan.id,
            destination: 'contact',
            location: variant === 'signup' ? 'landing_pricing' : 'dashboard_picker',
          })
        }
        className="inline-flex items-center justify-center gap-1 md:gap-1.5 w-full rounded-full h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm font-medium bg-brand hover:bg-brand/90 text-white transition-colors"
      >
        <ChatCircle size={12} weight="bold" className="md:hidden" />
        <ChatCircle size={14} weight="bold" className="hidden md:inline" />
        <span className="md:hidden">Contact</span>
        <span className="hidden md:inline">Contact us</span>
      </a>
    )
  }

  if (variant === 'upgrade' && isCurrent) {
    return (
      <span className="inline-flex items-center justify-center w-full rounded-full h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm font-medium border border-dashed border-brand/50 text-brand bg-brand/[0.04] text-center leading-tight">
        <span className="md:hidden">Current</span>
        <span className="hidden md:inline">Current plan</span>
      </span>
    )
  }

  // Signup variant — every CTA is a "Get started" /signup link.
  // Free uses outlined chrome; upsell tiers use solid brand fill.
  if (variant === 'signup') {
    return (
      <Link
        href="/signup"
        onClick={() =>
          trackEvent(EVENT.LANDING_TIER_CTA_CLICKED, {
            tier: plan.id,
            destination: 'signup',
            location: 'landing_pricing',
          })
        }
        className={cn(
          'inline-flex items-center justify-center w-full rounded-full h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm font-medium transition-colors',
          plan.id === 'free'
            ? 'border border-stroke bg-white text-grey-darkest hover:bg-hover-fill'
            : 'bg-brand hover:bg-brand/90 text-white',
        )}
      >
        Get started
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
  const desktopLabel = isDowngrade
    ? `Downgrade to ${plan.name}`
    : `Upgrade to ${plan.name}`
  // Mobile: just the plan name — the caret already signals direction.
  const mobileLabel = plan.name

  return (
    <Button
      onClick={() => onSelect?.(plan.id)}
      className={cn(
        'w-full rounded-full h-8 md:h-10 px-3 md:px-4 gap-1 md:gap-1.5 text-xs md:text-sm font-medium',
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
      <span className="md:hidden">{mobileLabel}</span>
      <span className="hidden md:inline">{desktopLabel}</span>
    </Button>
  )
}
