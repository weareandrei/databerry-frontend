/**
 * Finish-time view creation for the onboarding flow.
 *
 * Maps the user's starter-view selections to concrete `POST /views`
 * payloads. Kept free of React so it can be unit-reasoned in isolation
 * and shared between the onboarding page and any future caller.
 */

import type { View } from '@/types/view'
import type { Connection } from '@/types/connection'

export type ViewCreateBody = Omit<View, 'id' | 'userId' | 'createdAt' | 'isPinned'>

/**
 * Connection-backed view definitions the onboarding can auto-create.
 * Every entry is ZERO-CONFIG (or carries a safe default like
 * `$pageview`) — anything needing real user input (funnels,
 * retention) is deliberately not offered. `source` names which
 * connection the view attaches to.
 */
export const SIMPLE_VIEW_DEFS: Record<
  string,
  { source: 'posthog' | 'stripe' | 'google_analytics' | 'sentry'; name: string; config: Record<string, unknown> }
> = {
  // `$pageview` is PostHog's auto-captured event — present on
  // virtually every install, so the tile shows data immediately and
  // the user can repoint it at any event later.
  daily_counter: {
    source: 'posthog',
    name: 'Pageviews',
    config: { eventName: '$pageview', displayMode: 'chart' },
  },
  posthog_users: { source: 'posthog', name: 'Recent users', config: {} },
  stripe_gross: { source: 'stripe', name: 'Gross Volume', config: { displayMode: 'chart' } },
  stripe_mrr: { source: 'stripe', name: 'MRR', config: { displayMode: 'value' } },
  ga_users_today: { source: 'google_analytics', name: 'Users', config: { displayMode: 'chart' } },
  ga_pageviews_today: { source: 'google_analytics', name: 'Pageviews', config: { displayMode: 'value' } },
  sentry_issues_list: { source: 'sentry', name: 'Errors', config: { displayMode: 'list' } },
}

/**
 * Map the user's view selections to concrete `POST /views` payloads.
 * Mirrors the dashboard's `CreateViewModal` payload shapes exactly
 * (same types, names, configs) so onboarding-created tiles are
 * indistinguishable from dashboard-created ones.
 *
 * Composite views (Project Overview pair) are intentionally NOT
 * handled here — the backend's `createProject` auto-creates them
 * with the project itself.
 *
 * Connection-backed selections need their source connection — if the
 * user selected views for a tool they ended up not connecting
 * (skipped it, cancelled the OAuth consent), those payloads are
 * SKIPPED and the affected sources reported, rather than creating
 * dead tiles bound to nothing.
 */
export function buildViewPayloads(args: {
  selected: Set<string>
  projectId: string
  /** Latest connection per source type; absent key = not connected. */
  connBySource: Partial<Record<'posthog' | 'stripe' | 'google_analytics' | 'sentry', Connection>>
  /** Event picked in the Track-event dialog; falls back to
   *  `$pageview` only if somehow absent (e.g. stale persisted
   *  selection from before the picker existed). */
  posthogEventName?: string | null
}): { payloads: ViewCreateBody[]; skippedSources: string[] } {
  const { selected, projectId, connBySource, posthogEventName } = args
  const payloads: ViewCreateBody[] = []
  const skippedSources = new Set<string>()

  const base = { projectId, folderId: null, value: null }

  // Connection-backed selections — generic over SIMPLE_VIEW_DEFS.
  for (const id of selected) {
    const def = SIMPLE_VIEW_DEFS[id]
    if (!def) continue // unknown / stale ids are ignored
    const conn = connBySource[def.source]
    if (!conn) {
      skippedSources.add(def.source)
      continue
    }
    // Track-event carries the event picked in the dialog — both as
    // the config the renderer queries by AND as the tile name
    // (dashboard convention: daily_counter tiles are named after
    // their event).
    const isTrackEvent = id === 'daily_counter'
    const eventName = posthogEventName ?? '$pageview'
    payloads.push({
      ...base,
      connectionId: conn.id,
      // The connection's REAL type (a manual Stripe key is
      // 'stripe_manual', not 'stripe') — the dashboard's renderers
      // dispatch on this.
      connectionType: conn.type,
      type: id,
      name: isTrackEvent ? eventName : def.name,
      config: isTrackEvent
        ? { eventName, displayMode: 'chart' }
        : def.config,
    })
  }

  return { payloads, skippedSources: Array.from(skippedSources) }
}
