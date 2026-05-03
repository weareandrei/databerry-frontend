'use client'

/**
 * Wide PostHog cards (funnel, retention, recent users) — three sibling
 * renderers that each own one view-type's data hook + card component.
 * Used on the project page, the folder page (with `enabled: !historical`),
 * and the pinned-views composite lane.
 *
 * Three small renderers + one switch (instead of a single component
 * branching internally) so each hook is called unconditionally per
 * mount — keeping the rules-of-hooks invariant intact even though the
 * three view types use three different fetch hooks.
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
  /** Date range for the global picker. Pass `undefined`/omit on the
   *  folder page (the API defaults handle the historical day). */
  dateFrom?: string
  dateTo?: string
  /** True on the folder page when the user has rewound the date to a
   *  past day — the wide PostHog cards show the "Live data only"
   *  empty state. Default: false (current period). */
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
  const { view, historical = false, dateFrom, dateTo } = props
  const { steps, loading, error, refresh } = usePosthogFunnel(view, {
    dateFrom,
    dateTo,
    enabled: !historical,
  })
  return (
    <ViewCardFunnel
      view={view}
      steps={steps}
      loading={loading}
      error={error}
      historical={historical}
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
  const { view, historical = false, dateFrom, dateTo } = props
  const { cohorts, periodLabel, loading, error, refresh } = usePosthogRetention(view, {
    dateFrom,
    dateTo,
    enabled: !historical,
  })
  return (
    <ViewCardRetention
      view={view}
      cohorts={cohorts}
      periodLabel={periodLabel}
      loading={loading}
      error={error}
      historical={historical}
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
  const { view, historical = false, dateFrom, dateTo } = props
  const { users, loading, error, refresh } = usePosthogUsers(view, {
    dateFrom,
    dateTo,
    enabled: !historical,
  })
  return (
    <ViewCardUsers
      view={view}
      users={users}
      loading={loading}
      error={error}
      historical={historical}
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
