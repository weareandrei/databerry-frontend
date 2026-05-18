'use client'

/**
 * TrafficConnectionPicker — modal opened from the project-overview
 * empty state ("No analytics tool connected yet"). Resolves the user's
 * intent IN PLACE on the project page instead of dumping them on
 * /hub/connections with no clear context.
 *
 * Logic, branching only on whether the user already has an eligible
 * (Google Analytics or PostHog) connection:
 *
 *   - HAS ≥1 GA/PostHog connection → list them and let the user pick
 *     which one should power this project's overview. Selecting one
 *     reassigns its `projectId` to this project (via the existing
 *     `reassignProject` API).
 *
 *   - HAS none                     → fall through to a single CTA that
 *     opens the standard `CreateConnectionModal`. The user creates a
 *     fresh GA/PostHog connection through the normal OAuth/API-key
 *     flow; on success the connection is already scoped (the create
 *     flow either picks the active project or leaves it Common, both
 *     of which serve this project on next overview fetch).
 *
 * Either way, the user never leaves the project page for the picker
 * step, and the URL-param-driven property picker that previously
 * auto-opened on /hub/connections arrival is bypassed entirely.
 */

import { useMemo } from 'react'
import { Cube, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { Button } from '@/components/ui/button'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { useDashboard } from '@/contexts/DashboardContext'
import { cn } from '@/lib/utils'

/**
 * Connection types that satisfy "traffic source" for the overview
 * chart's primary axis. Matches the backend's `pickTrafficProvider`
 * logic in `project-overview.service.ts`.
 */
const ELIGIBLE_TYPES = new Set(['google_analytics', 'posthog'])

interface Props {
  /** Project this picker is linking a connection to. */
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Called after a connection is successfully linked, OR after the
   * create-connection modal is opened (so the parent can refresh
   * the overview chart once the user finishes the create flow).
   * No-op default — parents that don't want a refresh trigger can
   * omit it.
   */
  onLinked?: () => void
}

export function TrafficConnectionPicker({
  projectId,
  open,
  onOpenChange,
  onLinked,
}: Props) {
  const { connections, projects } = useDashboard()

  const eligible = useMemo(
    () => connections.connections.filter(c => ELIGIBLE_TYPES.has(c.type)),
    [connections.connections],
  )
  const hasEligible = eligible.length > 0

  // Project-name lookup for the per-row scope chip ("Common", "Acme",
  // etc.) — tells the user where each connection is currently bound
  // before they commit to relinking it.
  const projectById = useMemo(
    () => new Map(projects.projects.map(p => [p.id, p.name])),
    [projects.projects],
  )
  const currentProjectName = projectById.get(projectId)

  async function handlePick(connectionId: string) {
    try {
      await connections.reassignProject(connectionId, projectId)
      toast.success(
        currentProjectName
          ? `Linked to ${currentProjectName}`
          : 'Connection linked to this project',
      )
      onLinked?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Couldn't link connection — ${err.message}`
          : "Couldn't link connection",
      )
    }
  }

  function handleCreateNew() {
    // Close the picker first so the create modal opens cleanly on top
    // of the project page (not stacked under another bottom sheet).
    onOpenChange(false)
    // `connections.openModal(null)` opens CreateConnectionModal at the
    // integration grid; the user picks GA / PostHog from there. The
    // post-OAuth property picker still runs as part of the normal
    // create flow (it's the right place for it — not when the user
    // just wants to pick an existing connection).
    connections.openModal(null)
    // Hint to the parent so they can refresh after the user comes back
    // from the create flow. Parent decides whether to fire immediately
    // or wait on a side channel (the create-modal close event).
    onLinked?.()
  }

  return (
    <BottomDialog open={open} onOpenChange={onOpenChange}>
      <BottomDialog.Page
        title={hasEligible ? 'Pick an analytics source' : 'Connect an analytics source'}
        bodyMaxWidth="32rem"
      >
        <p className="text-sm text-muted-foreground -mt-1 mb-3">
          {hasEligible
            ? `Choose which Google Analytics or PostHog connection should power ${currentProjectName ?? 'this project'}'s overview chart. Selecting one will link it to this project.`
            : `You don't have a Google Analytics or PostHog connection yet. Add one to see traffic data for ${currentProjectName ?? 'this project'}.`}
        </p>

        {hasEligible && (
          <div className="space-y-1.5">
            {eligible.map(c => {
              const scopeLabel =
                c.projectId == null
                  ? 'Common'
                  : projectById.get(c.projectId) ?? 'Other project'
              const alreadyHere = c.projectId === projectId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => !alreadyHere && handlePick(c.id)}
                  disabled={alreadyHere}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                    alreadyHere
                      ? 'border-stroke bg-muted opacity-60 cursor-not-allowed'
                      : 'border-stroke bg-card hover:border-foreground/30 cursor-pointer',
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                    <ConnectionIcon
                      type={c.type}
                      size={22}
                      className="text-muted-foreground/85"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Cube size={9} weight="bold" />
                      {scopeLabel}
                    </p>
                  </div>
                  {alreadyHere && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      Already linked
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Create-new affordance — always visible. When the user has
            no eligible connections it's the primary action; when they
            do, it's an "or, add another" escape hatch. */}
        <div className={cn('mt-4 pt-3', hasEligible && 'border-t border-stroke')}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNew}
            className="w-full justify-center gap-1.5"
          >
            <Plus size={12} weight="bold" />
            {hasEligible
              ? 'Add another connection'
              : 'Connect Google Analytics or PostHog'}
          </Button>
        </div>
      </BottomDialog.Page>
    </BottomDialog>
  )
}
