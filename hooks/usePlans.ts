'use client'

/**
 * `usePlans` — reads the public plan catalog from Supabase's
 * `subscriptions` table.
 *
 * Three rows today (free / starter / pro), but the hook is shape-
 * agnostic: it returns whatever's in the table, sorted by
 * `display_order`. Adding a new plan is a Studio insert; no code
 * change here.
 *
 * Why a direct Supabase select instead of a backend route:
 *   - The catalog is public (RLS policy allows SELECT to every
 *     role), so there's no auth-derivation work the backend
 *     would do. Going direct skips a network hop.
 *   - The data is small (~3 rows) and changes maybe once a
 *     quarter. A heavy caching layer would be overkill.
 *
 * Falls back to an empty array when:
 *   - The query is still in flight (consumers should gate on
 *     `loading` for a spinner / skeleton instead of treating
 *     empty as a real result).
 *   - The query errored. We log the error to console but don't
 *     surface a toast — the picker handles its own empty/error
 *     UI inline, no need for an app-level alarm.
 *
 * Also exposes `plansById` for O(1) lookups (e.g. the sidebar
 * subheader maps `accounts.plan_id` → plan name for display).
 */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { asPlanId, type Plan, type PlanId } from '@/constants/plans'
import type { ConnectionType } from '@/types/connection'

interface UsePlansResult {
  plans: Plan[]
  plansById: Record<PlanId, Plan | undefined>
  loading: boolean
  error: string | null
}

/**
 * snake_case → camelCase + light validation. The DB returns JSONB
 * columns as untyped objects, so we coerce to the application's TS
 * shape here, dropping any fields that look wrong rather than
 * crashing the chrome on a malformed row.
 */
interface SubscriptionRow {
  id: string
  name: string
  tagline: string | null
  price_monthly_cents: number
  intro_price_monthly_cents: number | null
  intro_duration_months: number | null
  features: unknown
  max_projects: number
  max_views_per_project: number
  max_connections_per_type: number
  allowed_connection_types: unknown
  display_order: number
  stripe_price_id: string | null
  stripe_intro_coupon_id: string | null
  support: string | null
  is_custom_plan: boolean
}

function rowToPlan(row: SubscriptionRow): Plan {
  return {
    id: asPlanId(row.id),
    name: row.name,
    tagline: row.tagline,
    priceMonthlyCents: row.price_monthly_cents,
    introPriceMonthlyCents: row.intro_price_monthly_cents,
    introDurationMonths: row.intro_duration_months,
    features: Array.isArray(row.features)
      ? row.features.filter((s): s is string => typeof s === 'string')
      : [],
    maxProjects: row.max_projects,
    maxViewsPerProject: row.max_views_per_project,
    maxConnectionsPerType: row.max_connections_per_type,
    allowedConnectionTypes: Array.isArray(row.allowed_connection_types)
      ? (row.allowed_connection_types.filter(
          (s): s is ConnectionType => typeof s === 'string',
        ) as ConnectionType[])
      : null,
    displayOrder: row.display_order,
    stripePriceId: row.stripe_price_id,
    stripeIntroCouponId: row.stripe_intro_coupon_id,
    support: row.support,
    isCustomPlan: row.is_custom_plan,
  }
}

export function usePlans(): UsePlansResult {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    void supabase
      .from('subscriptions')
      .select(
        'id, name, tagline, price_monthly_cents, intro_price_monthly_cents, intro_duration_months, features, max_projects, max_views_per_project, max_connections_per_type, allowed_connection_types, display_order, stripe_price_id, stripe_intro_coupon_id, support, is_custom_plan',
      )
      .order('display_order', { ascending: true })
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          // Don't toast — picker renders its own inline error state.
          // Log so a Supabase outage / RLS misconfig still shows up
          // in console for debugging.
          console.warn('usePlans: failed to load plans', queryError)
          setError(queryError.message)
          setPlans([])
        } else {
          setPlans((data ?? []).map(row => rowToPlan(row as SubscriptionRow)))
          setError(null)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Memoised id → plan map for O(1) lookups in callers that need a
  // single plan (e.g. sidebar subheader resolving the user's plan
  // name from their stored plan_id).
  const plansById = useMemo(() => {
    const map: Record<string, Plan> = {}
    for (const p of plans) map[p.id] = p
    return map as Record<PlanId, Plan | undefined>
  }, [plans])

  return { plans, plansById, loading, error }
}
