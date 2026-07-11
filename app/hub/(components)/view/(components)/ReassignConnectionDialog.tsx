'use client'

/**
 * ReassignConnectionDialog — small centred picker for re-attaching an orphan
 * view to a fresh connection.
 *
 * Why this exists: when a user deletes a stale connection (e.g. revoked GA
 * refresh token) and creates a new one, the project-overview chart self-
 * heals because it resolves its provider per-request. Per-view tiles store
 * `connection_id` directly and become orphans. The backend tries to
 * auto-reattach on view-fetch when there's exactly one eligible candidate;
 * this dialog covers the ambiguous case (multiple candidates) and the case
 * where the user is curious to manually pick.
 *
 * The list shows ONLY connections that are:
 *   1. The same `type` as the view's `connectionType` (e.g. a GA view only
 *      sees Google Analytics connections — no Stripe, no PostHog).
 *   2. Eligible for the view's project — `project-scoped to view.projectId`
 *      OR `Common (project_id null)`. Connections scoped to a *different*
 *      project are not shown.
 *
 * Mirrors the centred-dialog convention used by `ProjectConversionsDialog`,
 * not the bottom-sheet flow.
 */

import { useEffect, useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  CenterDialog,
  CenterDialogContent,
  CenterDialogDescription,
  CenterDialogFooter,
  CenterDialogHeader,
  CenterDialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { ALGORITHM } from '@/lib/api'
import type { View } from '@/types/view'
import type { Connection } from '@/types/connection'

interface ReassignConnectionDialogProps {
  view: View
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the updated view after a successful reassignment. */
  onAssigned?: (updated: View) => void
}

/**
 * Outer shell — splits the dialog into a context-free shell + a body that
 * actually reads `useDashboard`. The split exists because `ViewCard` and
 * its sibling card components mount this dialog UNCONDITIONALLY (with
 * `open={false}` initially) so a kebab-menu "Reconnect" item can later
 * flip it open without re-mounting. The previous implementation called
 * `useDashboard()` at the top of the function body, which fired every
 * render — including when `open={false}`. That's fine inside `/hub/*`
 * (`DashboardProvider` is in scope) but the marketing landing's
 * `Features` / `ConnectSection` render `<ViewCard>` instances OUTSIDE of
 * `DashboardProvider` to demo the dashboard look — and the always-on
 * `useDashboard()` call would throw.
 *
 * By gating the inner `<ReassignDialogBody>` on `open`, the hook only
 * runs when the dialog is actually being opened — i.e. only inside the
 * dashboard, where the provider exists. The outer keeps `<CenterDialog>`
 * mounted with the right `open` prop the whole time, so the dialog's own
 * open/close transitions still drive off a single component instance.
 */
export function ReassignConnectionDialog(props: ReassignConnectionDialogProps) {
  return (
    <CenterDialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ReassignDialogBody {...props} /> : null}
    </CenterDialog>
  )
}

function ReassignDialogBody({
  view,
  onOpenChange,
  onAssigned,
}: ReassignConnectionDialogProps) {
  const { connections } = useDashboard()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Filter to candidates this view could legitimately attach to:
  //   - same provider type as the view (`view.connectionType`)
  //   - project-eligible: scoped to this view's project OR Common
  const eligible: Connection[] = connections.connections.filter(
    c =>
      c.type === view.connectionType &&
      (c.projectId == null || c.projectId === view.projectId),
  )

  // When there's exactly one eligible connection, preselect it on mount
  // so the primary CTA is immediately actionable. The list still shows
  // the candidate (so the action stays observable — the user knows what
  // they're attaching), they just don't have to click twice. We mount
  // only when the dialog opens (see the parent), so this effect runs
  // exactly once per open/close cycle — no stale-state cleanup needed.
  useEffect(() => {
    if (eligible.length === 1 && selectedId == null) {
      setSelectedId(eligible[0].id)
    }
  }, [eligible.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const updated = await ALGORITHM.updateView(view.id, { connectionId: selectedId })
      toast.success('Connection attached')
      onAssigned?.(updated)
      onOpenChange(false)
      setSelectedId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to attach connection')
    } finally {
      setSaving(false)
    }
  }

  const providerLabel =
    CONNECTION_DISPLAY_NAMES[view.connectionType] ?? view.connectionType

  return (
    <CenterDialogContent className="sm:max-w-md">
      <CenterDialogHeader>
        <CenterDialogTitle>Attach a connection</CenterDialogTitle>
        <CenterDialogDescription>
          Pick a {providerLabel} connection to power this view. Only connections
          available to this project are shown.
        </CenterDialogDescription>
      </CenterDialogHeader>

      <div className="space-y-1.5 pt-1">
        {eligible.length === 0 ? (
          <div className="rounded-lg border border-stroke bg-surface/30 px-3 py-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              No {providerLabel} connections available for this project.
            </p>
            <a
              href="/hub/connections"
              className="text-xs font-medium text-primary hover:underline"
            >
              Create one →
            </a>
          </div>
        ) : (
          eligible.map(c => {
            const isSelected = selectedId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                disabled={saving}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-60 ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-stroke bg-white text-foreground hover:bg-surface'
                }`}
              >
                <ConnectionIcon
                  type={c.type}
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="flex-1 truncate">{c.name}</span>
                {c.projectId == null && (
                  <span className="text-[10px] text-subtle shrink-0">Common</span>
                )}
                <span className="w-4 shrink-0 flex justify-end">
                  {isSelected && <Check size={13} weight="bold" className="text-primary" />}
                </span>
              </button>
            )
          })
        )}
      </div>

      <CenterDialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!selectedId || saving || eligible.length === 0}
          // Override the default `disabled:opacity-50` (which renders the
          // brand-coloured CTA as a near-invisible ghost). When disabled,
          // fall back to a solid grey: still legible, still obviously
          // not-clickable.
          className="bg-primary hover:bg-primary/90 text-white disabled:bg-subtle disabled:text-white disabled:opacity-100"
        >
          {saving ? 'Attaching…' : 'Attach'}
        </Button>
      </CenterDialogFooter>
    </CenterDialogContent>
  )
}
