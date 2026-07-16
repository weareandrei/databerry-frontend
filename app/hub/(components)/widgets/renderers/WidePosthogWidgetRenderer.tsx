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
  // `usePosthogFunnel` no longer imported here — funnel dispatch
  // moved to `<WidgetRenderer>` so funnels can sit in the regular
  // tile grid with proper `col-span` sizing.
  usePosthogRetention,
  usePosthogUsers,
} from '../data'
import { RetentionWidget } from '@/app/hub/(components)/widgets/retention/RetentionWidget'
import { UsersWidget } from '@/app/hub/(components)/widgets/users/UsersWidget'
import type { Widget } from '@/types/widget'

interface WidePosthogProps {
  view: Widget
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
  onConnectionAssigned?: (updated: Widget) => void
  /**
   * Forwarded to the picked tile component (`<FunnelWidget>` /
   * `<RetentionWidget>` / `<UsersWidget>`), which threads it
   * into `<BaseWidget variant=…>` — `'borderless'` when
   * `chromeless`. Used by the mobile project body so wide PostHog
   * tiles sit flat inside its outer white card. Default false →
   * desktop chrome unchanged.
   */
  chromeless?: boolean
}

// `PosthogFunnelRenderer` is intentionally GONE from this file.
// Funnels no longer ride in the wide-PostHog lane — they slot into
// the regular tile grid (sized via `<FunnelWidget>`'s own
// `col-span-2 row-span-2` / 1×1 wrapper). `<WidgetRenderer>` in
// `WidgetRenderer.tsx` dispatches funnel views directly. This
// keeps retention + users as the only "wide" types here.

function PosthogRetentionRenderer(props: WidePosthogProps) {
  const { view, dateFrom, dateTo } = props
  const { cohorts, periodLabel, loading, error, refresh } = usePosthogRetention(view, {
    dateFrom,
    dateTo,
  })
  return (
    <RetentionWidget
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
      chromeless={props.chromeless}
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
    <UsersWidget
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
      chromeless={props.chromeless}
    />
  )
}

const WIDE_POSTHOG_TYPES = new Set([
  // Funnel is NOT wide anymore — it slots into the regular tile grid
  // via `<WidgetRenderer>`, sized 2×2 (chart mode) or 1×1 (value
  // mode) via `<FunnelWidget>`'s own `col-span` wrapper.
  'posthog_retention',
  'posthog_users',
])

/** Wide PostHog views are full-width cards in the composite lane —
 *  they don't fit the 140px tile grid. */
export function isWidePosthogView(view: Widget): boolean {
  return view.connectionType === 'posthog' && WIDE_POSTHOG_TYPES.has(view.type)
}

/**
 * Dispatch wrapper — picks the right renderer for a wide PostHog view.
 * Returns `null` for non-PostHog or non-wide views; the caller is
 * expected to gate on `isWidePosthogView` first.
 */
export function WidePosthogWidgetRenderer(props: WidePosthogProps) {
  if (props.view.type === 'posthog_retention')
    return <PosthogRetentionRenderer {...props} />
  if (props.view.type === 'posthog_users')
    return <PosthogUsersRenderer {...props} />
  return null
}
