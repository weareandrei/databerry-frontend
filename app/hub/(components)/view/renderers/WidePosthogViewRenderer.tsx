'use client'

/**
 * Wide PostHog cards (funnel, retention, recent users) — three sibling
 * renderers that each own one view-type's data hook + card component.
 * Used on the project page, the folder page, and the pinned-views
 * composite lane.
 *
 * Three small renderers + one switch (instead of a single component
 * branching internally) so each hook is called unconditionally per
 * mount — keeping the rules-of-hooks invariant intact even though the
 * three view types use three different fetch hooks.
 *
 * History: these used to refuse to render on past dates ("Live data
 * only — unavailable for past dates."), gated by an `enabled:
 * !historical` flag. That was overly defensive — the PostHog backend
 * (`backend/src/posthog/views/live/{funnel,retention,users}.ts`) all
 * accept `dateFrom` / `dateTo` and run real HogQL queries against the
 * event store, so historical ranges work fine. Removed the gate; now
 * the cards always fetch and render, regardless of which date range
 * the page-level picker is on. Callers (project view, folder page,
 * pinned lane) just need to pass the right `dateFrom` / `dateTo`.
 */

import {
  usePosthogFunnel,
  usePosthogRetention,
  usePosthogUsers,
} from '../data'
import { ViewCardFunnel } from '../ViewCardFunnel'
import { ViewCardRetention } from '../ViewCardRetention'
import { ViewCardUsers } from '../ViewCardUsers'
import type { View } from '@/types/view'

interface WidePosthogProps {
  view: View
  /** Date range to fetch for. Callers should always pass these now —
   *  the renderer no longer falls back to "show empty state on past
   *  dates". When omitted, the underlying hooks default to the API's
   *  own date defaults (typically "today"). */
  dateFrom?: string
  dateTo?: string
  /**
   * @deprecated No longer drives the renderer — the cards always
   * fetch + render, regardless of historical-ness. Kept on the props
   * for backward compatibility with existing call sites; remove once
   * those have stopped passing it.
   */
  historical?: boolean
  projectName?: string
  pinned?: boolean
  onUntrack?: (id: string) => void
  /**
   * Pin / unpin handler. When `pinned=true`, the card menu shows
   * "Unpin"; when false (or undefined), it shows "Pin". The handler
   * itself is the same callback in both cases.
   */
  onPin?: (viewId: string) => void
  onConnectionAssigned?: (updated: View) => void
}

function PosthogFunnelRenderer(props: WidePosthogProps) {
  const { view, dateFrom, dateTo } = props
  const { steps, loading, error, refresh } = usePosthogFunnel(view, {
    dateFrom,
    dateTo,
  })
  return (
    <ViewCardFunnel
      view={view}
      steps={steps}
      loading={loading}
      error={error}
      projectName={props.projectName}
      isPinned={props.pinned ?? view.isPinned}
      onUntrack={props.onUntrack}
      onPin={props.onPin ? () => props.onPin!(view.id) : undefined}
      onRefresh={refresh}
      refreshing={loading}
      onConnectionAssigned={props.onConnectionAssigned}
    />
  )
}

function PosthogRetentionRenderer(props: WidePosthogProps) {
  const { view, dateFrom, dateTo } = props
  const { cohorts, periodLabel, loading, error, refresh } = usePosthogRetention(view, {
    dateFrom,
    dateTo,
  })
  return (
    <ViewCardRetention
      view={view}
      cohorts={cohorts}
      periodLabel={periodLabel}
      loading={loading}
      error={error}
      projectName={props.projectName}
      isPinned={props.pinned ?? view.isPinned}
      onUntrack={props.onUntrack}
      onPin={props.onPin ? () => props.onPin!(view.id) : undefined}
      onRefresh={refresh}
      refreshing={loading}
      onConnectionAssigned={props.onConnectionAssigned}
    />
  )
}

function PosthogUsersRenderer(props: WidePosthogProps) {
  const { view, dateFrom, dateTo } = props
  const { users, loading, error, refresh } = usePosthogUsers(view, {
    dateFrom,
    dateTo,
  })
  return (
    <ViewCardUsers
      view={view}
      users={users}
      loading={loading}
      error={error}
      projectName={props.projectName}
      isPinned={props.pinned ?? view.isPinned}
      onUntrack={props.onUntrack}
      onPin={props.onPin ? () => props.onPin!(view.id) : undefined}
      onRefresh={refresh}
      refreshing={loading}
      onConnectionAssigned={props.onConnectionAssigned}
    />
  )
}

const WIDE_POSTHOG_TYPES = new Set([
  'posthog_funnel',
  'posthog_retention',
  'posthog_users',
])

/** Wide PostHog views are full-width cards in the composite lane —
 *  they don't fit the 140px tile grid. */
export function isWidePosthogView(view: View): boolean {
  return view.connectionType === 'posthog' && WIDE_POSTHOG_TYPES.has(view.type)
}

/**
 * Dispatch wrapper — picks the right renderer for a wide PostHog view.
 * Returns `null` for non-PostHog or non-wide views; the caller is
 * expected to gate on `isWidePosthogView` first.
 */
export function WidePosthogViewRenderer(props: WidePosthogProps) {
  if (props.view.type === 'posthog_funnel')
    return <PosthogFunnelRenderer {...props} />
  if (props.view.type === 'posthog_retention')
    return <PosthogRetentionRenderer {...props} />
  if (props.view.type === 'posthog_users')
    return <PosthogUsersRenderer {...props} />
  return null
}
