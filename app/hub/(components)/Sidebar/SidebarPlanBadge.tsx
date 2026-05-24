'use client'

/**
 * Sidebar row that exposes the user's current plan + opens the
 * tier picker. Visually a nav-item lookalike (icon + label on the
 * left, value on the right) so it feels like a peer of Home / Ask
 * AI / Connections / Settings rather than a piece of the profile
 * header — which is where it used to live, awkwardly squeezed
 * under the email.
 *
 * Owns the `<TierPickerSheet>` instance for the whole dashboard.
 * The shared `useTierPickerListener` bus still works, so limit-
 * error toasts that call `openTierPicker()` from far away pop the
 * sheet open without prop-drilling.
 *
 * Plan-id → badge color is hardcoded in `BADGE_STYLES`. Adding a
 * new plan to `PlanId` should add a matching entry there; missing
 * entries silently fall back to the neutral grey treatment so a
 * new plan never crashes the chrome.
 */

import { useCallback, useState } from 'react'
import { Crown } from '@phosphor-icons/react'
import { useAccount } from '@/hooks/useAccount'
import { usePlans } from '@/hooks/usePlans'
import { useTierPickerListener } from '@/hooks/useTierPicker'
import { TierPickerSheet } from './TierPickerSheet'
import { EVENT, trackEvent } from '@/lib/posthog'
import type { PlanId } from '@/constants/plans'

// Per-plan badge palette — anchored to the OverviewChart's stacked-
// bar palette (`constants/trafficSources.ts`) so the sidebar feels
// like part of the same visual system the dashboard's charts use,
// not a different colour world. Each plan gets ONE source hex; the
// `bg` / `border` / `text` for the pill are derived from it via
// `color-mix` so we don't have to hand-tune three values per plan.
//
// Mapping (intensity rises with tier):
//   free       → `#C6C6C6` (grey         — chart's neutral "direct/other" bucket)
//   starter    → `#FFA446` (light orange — bar palette's 3rd slot, slightly
//                                          darker than the lightest yellow)
//   pro        → `#FF4852` (deep coral   — bar palette's biggest/bottom slot,
//                                          the deepest "almost red" hue)
//   enterprise → `#FF4852` (same as pro — enterprise sits alongside pro at the
//                                          top of the catalog and rarely
//                                          renders today; the colour can
//                                          diverge once a distinct visual
//                                          identity is wanted for it)
const PLAN_HEX: Record<PlanId, string> = {
  free: '#C6C6C6',
  starter: '#FFA446',
  pro: '#FF4852',
  enterprise: '#FF4852',
}
const NEUTRAL_HEX = '#C6C6C6'

/**
 * Inline-style triple for a plan's pill — background, border, text.
 * Uses `color-mix` so a single `hex` drives all three derived shades:
 *   - bg: 18 % of the hue mixed with white → soft tint, badge reads
 *         as a label not a hot CTA.
 *   - border: 50 % → defined edge without competing with the bg.
 *   - text: 80 % mixed with BLACK so the hue stays recognisable
 *           while contrast against the soft bg stays readable
 *           (yellow especially — pure `#FFD239` would be illegible).
 *
 * `color-mix` is supported in every evergreen browser since 2023
 * (Chrome 111+, Firefox 113+, Safari 16.2+).
 */
function planBadgeStyle(planId: PlanId): React.CSSProperties {
  const hex = PLAN_HEX[planId] ?? NEUTRAL_HEX
  return {
    backgroundColor: `color-mix(in srgb, ${hex} 18%, white)`,
    borderColor: `color-mix(in srgb, ${hex} 50%, white)`,
    color: `color-mix(in srgb, ${hex} 80%, black)`,
  }
}

export function SidebarPlanBadge() {
  const { planId, loading: accountLoading } = useAccount()
  const { plansById } = usePlans()

  // Local sheet state. Mirrors the pattern that used to live in
  // `<SidebarUserProfile>` — single instance per dashboard, opened
  // either by the local click or by a `openTierPicker()` broadcast
  // from elsewhere (e.g. plan-limit toasts).
  const [tierSheetOpen, setTierSheetOpen] = useState(false)
  const openTracked = useCallback((source: 'plan_row' | 'broadcast') => {
    trackEvent(EVENT.TIER_PICKER_OPENED, { source })
    setTierSheetOpen(true)
  }, [])
  const handleBroadcast = useCallback(() => openTracked('broadcast'), [openTracked])
  useTierPickerListener(handleBroadcast)

  // Plan name resolution mirrors the previous `<SidebarUserProfile>`
  // logic: prefer the catalog row (`usePlans()`), fall back to a
  // title-cased plan id while the fetch is in flight. The catalog is
  // ~3 rows of public data and usually settles in <500 ms; the
  // fallback keeps the sidebar from showing a blank chip on first
  // paint.
  const currentPlan = plansById[planId]
  const fallbackName = planId.charAt(0).toUpperCase() + planId.slice(1)
  const planName = currentPlan?.name ?? fallbackName
  // The badge gets two inline-style merges below: one for the
  // plan's colour triple (always present), and one for the
  // first-paint `visibility: hidden` gate (only while account is
  // loading). Keeping them as separate objects keeps the JSX
  // readable; React's style merge handles the rest.
  const badgeColorStyle = planBadgeStyle(planId)

  return (
    <>
      {/* `px-2` matches the section wrapper used by `<SidebarNavItem>`
          elsewhere so this row's hover-fill spans the same width as
          the other nav rows above. The button owns `px-3 py-1.5`
          internally — identical to `<SidebarNavItem>`'s Link — so the
          icon + label sit on the same vertical baseline as Home /
          Ask AI / Connections / Settings. */}
      <div className="px-2 mb-1">
        <button
          type="button"
          onClick={() => openTracked('plan_row')}
          disabled={accountLoading}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors text-grey-dark hover:bg-hover-fill hover:text-grey-darkest disabled:opacity-60 disabled:cursor-default"
        >
          <Crown size={16} weight="bold" className="shrink-0" />
          <span className="flex-1 text-left">Subscription</span>
          {/* Plan badge — `visibility: hidden` reserves the row's
              width while `useAccount` resolves so the layout doesn't
              jump on first paint. Colours come from `planBadgeStyle`
              (inline CSS using the chart palette + color-mix). */}
          <span
            className="inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-semibold tracking-wide"
            style={accountLoading ? { ...badgeColorStyle, visibility: 'hidden' } : badgeColorStyle}
          >
            {planName}
          </span>
        </button>
      </div>

      <TierPickerSheet
        open={tierSheetOpen}
        onOpenChange={setTierSheetOpen}
        currentPlanId={planId}
      />
    </>
  )
}
