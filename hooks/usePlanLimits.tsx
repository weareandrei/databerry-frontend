'use client'

/**
 * `usePlanLimits` — single source of truth for "can the user
 * create another X right now?" decisions. Compares the user's
 * current plan limits (read from the `subscriptions` row via
 * `usePlans()`) against live counts (read from
 * `useDashboard()`).
 *
 * Three `enforce*` helpers wrap the boolean check and fire a
 * limit-error toast on failure. Returns `true` when the create
 * should proceed, `false` when it was blocked. Callers wire the
 * helper into the click handler that would open the create modal:
 *
 *   const { enforceProjectLimit } = usePlanLimits()
 *   const onCreate = () => {
 *     if (!enforceProjectLimit()) return  // toast already shown
 *     projects.openModal()
 *   }
 *
 * The toast embeds an "upgrade your plan" link that opens the
 * tier picker sheet via the module-level `openTierPicker()`
 * broadcast — same surface every other "you've hit a limit"
 * dead-end leads to.
 *
 * `isCustomPlan` (Enterprise) bypasses every limit — those tiers
 * are "Custom" by definition and their `max_*` columns are
 * placeholder zeros.
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useAccount } from '@/hooks/useAccount'
import { usePlans } from '@/hooks/usePlans'
import { useDashboard } from '@/contexts/DashboardContext'
import { openTierPicker } from '@/hooks/useTierPicker'
import type { ConnectionType } from '@/types/connection'

interface UsePlanLimitsResult {
  /** Returns true if the user can create another project; otherwise
   *  fires the limit toast and returns false. */
  enforceProjectLimit: () => boolean
  /** Returns true if the user can create another connection of the
   *  given type; otherwise fires the limit toast (which differentiates
   *  "type not on plan" from "max-per-type reached") and returns false. */
  enforceConnectionLimit: (type: ConnectionType) => boolean
  /** Returns true if the user can create another view in the given
   *  project; otherwise fires the limit toast and returns false.
   *  Caller passes the current view count for that project — we
   *  don't fetch here to keep the hook decoupled from per-project
   *  query state. */
  enforceViewLimit: (currentViewsInProject: number) => boolean
}

export function usePlanLimits(): UsePlanLimitsResult {
  const { planId } = useAccount()
  const { plansById } = usePlans()
  const { projects, connections } = useDashboard()

  const plan = plansById[planId]
  // Enterprise / custom plans bypass every limit — their `max_*`
  // columns are placeholder zeros (the DB column is NOT NULL so
  // we have to store something), so a naïve check would block
  // every create.
  const isCustomPlan = plan?.isCustomPlan ?? false

  const enforceProjectLimit = useCallback((): boolean => {
    if (!plan || isCustomPlan) return true

    const current = projects.projects.length
    if (current < plan.maxProjects) return true

    showLimitToast(
      <>
        You've hit your{' '}
        <span className="font-semibold">{plan.name}</span> plan's limit of{' '}
        {plan.maxProjects} project{plan.maxProjects === 1 ? '' : 's'}.
      </>,
    )
    return false
  }, [plan, isCustomPlan, projects.projects.length])

  const enforceConnectionLimit = useCallback(
    (type: ConnectionType): boolean => {
      if (!plan || isCustomPlan) return true

      // 1. Type-restriction check (Free's whitelist). When
      //    `allowedConnectionTypes` is null, every type is allowed.
      if (
        plan.allowedConnectionTypes != null &&
        !plan.allowedConnectionTypes.includes(type)
      ) {
        showLimitToast(
          <>
            Your <span className="font-semibold">{plan.name}</span> plan
            doesn't include this integration.
          </>,
          // No "remove some" alternative here — removing existing
          // connections doesn't unlock a new type, only an upgrade does.
          'upgrade-only',
        )
        return false
      }

      // 2. Per-type quantity check. Treat both Stripe variants
      //    (`stripe` + `stripe_manual`) as the same bucket so a user
      //    on the 1-of-each Free plan can't sneak two by mixing modes.
      const sameBucket = sameConnectionBucket(type)
      const count = connections.connections.filter(c =>
        sameBucket.includes(c.type as ConnectionType),
      ).length

      if (count < plan.maxConnectionsPerType) return true

      showLimitToast(
        <>
          You've hit your <span className="font-semibold">{plan.name}</span>{' '}
          plan's limit of {plan.maxConnectionsPerType} connection
          {plan.maxConnectionsPerType === 1 ? '' : 's'} of this type.
        </>,
      )
      return false
    },
    [plan, isCustomPlan, connections.connections],
  )

  const enforceViewLimit = useCallback(
    (currentViewsInProject: number): boolean => {
      if (!plan || isCustomPlan) return true

      if (currentViewsInProject < plan.maxViewsPerProject) return true

      showLimitToast(
        <>
          You've hit your <span className="font-semibold">{plan.name}</span>{' '}
          plan's limit of {plan.maxViewsPerProject} views per project.
        </>,
      )
      return false
    },
    [plan, isCustomPlan],
  )

  return {
    enforceProjectLimit,
    enforceConnectionLimit,
    enforceViewLimit,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Both Stripe variants count toward the same per-type bucket.
 * Users on Free (1 connection per type) shouldn't be able to
 * connect one Stripe OAuth + one Stripe manual key — that's
 * functionally two Stripe connections.
 */
function sameConnectionBucket(type: ConnectionType): ConnectionType[] {
  if (type === 'stripe' || type === 'stripe_manual') {
    return ['stripe', 'stripe_manual']
  }
  return [type]
}

/**
 * Fires a sonner error toast with a `message` body + a follow-up
 * line that ends in an underlined "upgrade your plan" button. The
 * button calls `openTierPicker()` which the sidebar profile
 * listens for; clicking it dismisses the toast (sonner closes on
 * action click) and the picker slides in.
 *
 * Two suggestion variants:
 *   - 'remove-or-upgrade' (default) — when removing some existing
 *     items would also unblock the create (project / connection /
 *     view limits).
 *   - 'upgrade-only' — when remove won't help (e.g. a connection
 *     type that isn't on the plan at all).
 */
function showLimitToast(
  message: React.ReactNode,
  suggestion: 'remove-or-upgrade' | 'upgrade-only' = 'remove-or-upgrade',
): void {
  toast.error(
    <div className="text-sm leading-snug">
      <p>{message}</p>
      <p className="mt-1 text-subtle">
        {suggestion === 'remove-or-upgrade'
          ? 'Remove some that you no longer need, or '
          : ''}
        <button
          type="button"
          onClick={() => {
            openTierPicker()
            // sonner auto-dismisses on JSX content click? safer to
            // dismiss explicitly. Done via the global dismiss.
            toast.dismiss()
          }}
          className="underline underline-offset-2 font-medium text-foreground hover:text-primary transition-colors"
        >
          upgrade your plan
        </button>
        .
      </p>
    </div>,
  )
}
