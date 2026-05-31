'use client'

import { useState } from 'react'
import { ArrowsClockwise, Warning } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { IntegrationReauthBanner } from './IntegrationReauthBanner'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import type { View } from '@/types/view'
import { formatViewValue } from '@/utils/formatters'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { ConnectionMissingError, IntegrationReauthError } from '@/lib/api'

// Note: `ViewCard` is a low-level reusable component — it intentionally
// reaches for NEITHER Redux nor Context. Anything that lives in app
// state (the global date range, the user's tz, the currently selected
// project, etc.) is supplied by the caller via props. Keeps the card
// renderable on the marketing landing page (which has no Redux Provider)
// and in any future unit-test or Storybook surface. The previous version
// of this file did `useSelector(s => s.ui.globalDateFrom)` for the MRR
// caption, which crashed every render of the demo cards on `/`.

export function FetchErrorBadge({ message }: { message: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium">
      <Warning size={11} weight="bold" />
      {message}
    </span>
  )
}

interface ViewCardProps {
  view: View
  onUntrack?: (id: string) => void
  liveValue?: string | null
  liveLoading?: boolean
  /**
   * `string` for legacy/generic fetch errors (rendered as a generic
   * "Couldn't load value" badge); an `IntegrationReauthError` when the
   * OAuth refresh token is dead — triggers the inline "Reconnect
   * <Integration>" banner that links into the existing OAuth start flow;
   * or a `ConnectionMissingError` when the underlying connection row no
   * longer exists — surfaces the same "click to reattach" badge as the
   * strict-orphan path (`!view.connectionId`) and opens
   * `ReassignConnectionDialog`. See `lib/api.ts#ConnectionMissingError`
   * and `lib/api.ts#IntegrationReauthError`.
   */
  liveError?: string | IntegrationReauthError | ConnectionMissingError | null
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  /**
   * Called when the user picks a fresh connection from the reassignment
   * dialog (only fires for orphan views — `view.connectionId == null`).
   * Consumers should swap the matching view in their local state so the
   * tile re-fetches with the new connection without a hard refresh.
   * If omitted, the dialog still works but the parent won't know to update.
   */
  onConnectionAssigned?: (updated: View) => void
  /**
   * Optional grey caption rendered immediately below the value
   * (e.g. `"Apr 27 – May 3"`). The caller decides whether the view
   * type benefits from a caption (currently only `stripe_mrr` does
   * — the date range answers "for which period was MRR computed?")
   * and computes the string from its own date-range source. Omitted
   * → no caption, no extra vertical space.
   *
   * `ViewCard` doesn't read the global date range itself because it
   * must remain renderable outside Redux/Context (marketing landing
   * demos, Storybook, etc.).
   */
  dateRangeLabel?: string
  /**
   * When true, the wrapper renders without its own border + shadow
   * (via `<ViewWrapper variant='borderless'>`). Used by the mobile
   * project body, where tiles sit flat inside an outer white card —
   * nesting border + shadow there would look bad. Default false →
   * desktop chrome unchanged.
   */
  chromeless?: boolean
  /**
   * Forwards to `<ViewHeader dense>`. Demo-only knob — shrinks the
   * header rung and drops the redundant connection label when a
   * project pill is present. Real-dashboard tiles leave this `false`.
   */
  dense?: boolean
}

export function ViewCard({
  view,
  onUntrack,
  liveValue = null,
  liveLoading = false,
  liveError = null,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
  dateRangeLabel,
  chromeless = false,
  dense = false,
}: ViewCardProps) {
  const isDisconnected = !view.connectionId
  // Connection FK still set on the row, but the row it points at is gone.
  // Treated as disconnected for UX purposes — same badge, same dialog.
  const isConnectionMissing = liveError instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing
  const displayValue = liveValue ?? view.value
  const isUnknown = !liveLoading && !needsReattach && !liveError && (displayValue == null || displayValue === '')
  const connectionLabel = CONNECTION_DISPLAY_NAMES[view.connectionType] ?? view.connectionType
  const isReauthError = liveError instanceof IntegrationReauthError
  const [reassignOpen, setReassignOpen] = useState(false)

  // Caller-supplied caption shown under the healthy value. The caller
  // (e.g. ProjectView's view-card dispatcher) decides which view types
  // get one and computes the string from the global date range. ViewCard
  // doesn't read Redux/Context for this — see component-level comment.
  const dateRangeCaption = dateRangeLabel ?? null

  return (
    <>
      <ViewWrapper className="col-span-1 row-span-1" variant={chromeless ? 'borderless' : 'default'}>
        <ViewHeader
          name={view.name}
          connectionType={view.connectionType}
          connectionLabel={connectionLabel}
          isDisconnected={isDisconnected}
          isConnectionMissing={isConnectionMissing}
          onReconnect={() => setReassignOpen(true)}
          onUntrack={onUntrack}
          viewId={view.id}
          projectName={projectName}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onPin={onPin}
          isPinned={isPinned}
          dense={dense}
          // `view` + `onUpdated` enable the convert-to-mode menu items
          // for multi-mode view types. Reuses `onConnectionAssigned`
          // as the generic "view was updated" callback — its shape
          // (`(updated: View) => void`) matches; the prop name is
          // legacy (predates display-mode conversion) but the
          // upstream handler simply replaces the view in state.
          view={view}
          onUpdated={onConnectionAssigned}
        />

        {/* Body marked `data-no-dnd` so dragging from inside the value
            block doesn't start a tile drag — header + outer padding
            stay the drag surface. See `FilteredPointerSensor`. */}
        <div data-no-dnd="true" className="px-4 pb-4 mt-3 flex-1 flex flex-col justify-center">
          {liveLoading ? (
            <ArrowsClockwise size={14} weight="bold" className="text-muted-foreground animate-spin" />
          ) : needsReattach ? (
            // Two flavours of "this view has no usable connection" share
            // one path:
            //   - `isDisconnected`     → `view.connectionId` is null
            //   - `isConnectionMissing` → FK still set but the connection
            //     row is gone (backend `ConnectionMissingException`, 410)
            // Both open the centred reassignment dialog. Stop event
            // propagation so the click doesn't bubble to any future
            // card-level handler.
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setReassignOpen(true)
              }}
              className="self-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label="Attach a connection to this view"
            >
              <FetchErrorBadge message="Connection missing — click to reattach" />
            </button>
          ) : isReauthError ? (
            <IntegrationReauthBanner error={liveError as IntegrationReauthError} />
          ) : liveError ? (
            // Generic transient fetch failure — distinct from "no
            // connection" (which has its own click-to-reattach badge
            // above) and from "credentials expired" (which has the
            // OAuth-restart banner). "Couldn't load value" describes
            // what didn't happen from the user's perspective.
            <FetchErrorBadge message="Couldn't load value" />
          ) : isUnknown ? (
            <span className="text-2xl font-semibold leading-none text-grey-light">Unknown</span>
          ) : (
            <>
              <span className="text-2xl font-semibold tabular-nums leading-none">
                {formatViewValue(displayValue, view.type)}
              </span>
              {/*
                Caption sits 4px below the value in muted grey. `truncate`
                guards against pathological long ranges (e.g. "Dec 30, 2025
                – Jan 2, 2026" worst-case, ~24 chars) overflowing the
                ~240-px tile width.
              */}
              {dateRangeCaption && (
                <span className="text-xs text-muted-foreground mt-1 truncate">
                  {dateRangeCaption}
                </span>
              )}
            </>
          )}
        </div>
      </ViewWrapper>

      {/*
        Mounted unconditionally so the dropdown's "Change connection" item
        can open it even when the view is in a healthy state. The dialog
        renders nothing while `open` is false, so this is cheap.
      */}
      <ReassignConnectionDialog
        view={view}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onAssigned={onConnectionAssigned}
      />
    </>
  )
}
