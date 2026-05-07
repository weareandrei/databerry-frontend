'use client'

import { Suspense, useState, useEffect } from 'react'
import {
  PlugsConnected,
  Trash,
  Plus,
  ArrowsClockwise,
  CaretDown,
  Check,
  Cube,
  DotsThreeVertical,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { useOAuthCallback } from '@/hooks/useOAuthCallback'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { ConnectionDetailModal } from '@/app/hub/(components)/modals/ConnectionDetailModal'
import { StripeProductPicker } from '@/app/hub/connections/(modals)/StripeProductPicker'
import { ALGORITHM, type GAProperty } from '@/lib/api'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Connection } from '@/types/connection'
import type { Project } from '@/types/project'

function OAuthCallbacks() {
  useOAuthCallback('stripe')
  useOAuthCallback('calendly')
  useOAuthCallback('google_analytics')
  return null
}

function GoogleAnalyticsPropertyPicker() {
  const searchParams = useSearchParams()
  const { connections } = useDashboard()
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [properties, setProperties] = useState<GAProperty[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // Two-step UX (matches StripeProductPicker): clicking a row only marks it as
  // selected, then the footer Save button commits. The previous one-click-
  // commit was confusing — users clicked expecting a "select" affordance and
  // got an immediate save (or, with no visual confirmation, thought nothing
  // happened and looked for a Confirm button that didn't exist).
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)

  useEffect(() => {
    const status = searchParams.get('google_analytics')
    const cid = searchParams.get('connectionId')
    if (status === 'no-properties') {
      // Connection succeeded but the user's Google account has no
      // GA4 properties accessible. Spell out what to do next so this
      // doesn't dead-end as a vague "no properties" toast.
      toast.error(
        "We connected to Google Analytics, but your account doesn't have any GA4 properties. Create one in analytics.google.com, then come back and reconnect.",
      )
      window.history.replaceState({}, '', '/hub/connections')
    } else if (status === 'select-property' && cid) {
      setConnectionId(cid)
      setLoading(true)
      ALGORITHM.getGoogleAnalyticsProperties(cid)
        .then(res => {
          setProperties(res.properties)
          // Pre-select the first property so Save is immediately actionable
          // and the highlight gives the user a visual anchor on open.
          if (res.properties.length > 0) setSelectedPropertyId(res.properties[0].id)
        })
        .catch(() => {
          toast.error(
            "Couldn't load your Google Analytics properties. Try refreshing the page, or reconnect Google Analytics from the Connections list.",
          )
          window.history.replaceState({}, '', '/hub/connections')
        })
        .finally(() => setLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setProperties(null)
    setConnectionId(null)
    setSelectedPropertyId(null)
    window.history.replaceState({}, '', '/hub/connections')
  }

  // Skip / close without explicit save: persist the currently-highlighted
  // property (= the pre-selected first one if untouched). Connection works
  // out of the box; user can revisit later. No write if nothing's selected
  // or save is in flight.
  const handleClose = async () => {
    if (selectedPropertyId && connectionId && !saving) {
      try {
        await ALGORITHM.saveGoogleAnalyticsProperty(connectionId, selectedPropertyId)
        const picked = properties?.find(p => p.id === selectedPropertyId)
        if (picked) {
          toast.success(`Auto-selected "${picked.displayName}". You can change this by clicking the connection.`)
        }
        connections.loadConnections()
      } catch {
        // silently ignore — user can click the connection to re-select
      }
    }
    dismiss()
  }

  const handleSave = async () => {
    if (!connectionId || !selectedPropertyId) return
    setSaving(true)
    try {
      await ALGORITHM.saveGoogleAnalyticsProperty(connectionId, selectedPropertyId)
      toast.success('Google Analytics connected successfully!')
      connections.loadConnections()
      dismiss()
    } catch {
      toast.error('Failed to save property. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!connectionId) return null

  const hasProperties = !!properties && properties.length > 0

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Select a GA4 property</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose which Google Analytics 4 property to track.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading properties…</p>
        ) : !hasProperties ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No GA4 properties found.</p>
        ) : (
          <div className="mt-1 max-h-72 overflow-y-auto pr-1 space-y-1.5">
            {properties!.map(prop => {
              const checked = selectedPropertyId === prop.id
              return (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => setSelectedPropertyId(prop.id)}
                  disabled={saving}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                    checked ? 'border-foreground bg-muted' : 'border-stroke hover:bg-main cursor-pointer'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      checked ? 'border-foreground bg-foreground text-background' : 'border-stroke'
                    }`}
                  >
                    {checked && <Check size={10} weight="bold" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{prop.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{prop.name}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        {/* Primary CTA uses bg-brand to match the rest of the dashboard
            (Add connection pill, Create view, etc.). The default Button
            variant's `bg-primary` doesn't render reliably through the
            base-ui Button primitive in this Dialog — the rest of the app
            sidesteps it the same way. */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            {hasProperties ? 'Skip' : 'Cancel'}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !selectedPropertyId}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Project-scope pill ──────────────────────────────────────────────────────
//
// Renders the "Common" / project-name badge AS the dropdown trigger so users
// can change the project assignment by clicking the pill itself — the
// affordance the badge already implies. Previously the trigger was a separate
// 14px ⇄ icon next to the row's trash button: too discreet, users couldn't
// find it. We keep the existing visual style (border-stroke pill) and add a
// caret hint to signal "this opens a menu". Clicks stopPropagation so the
// row's onClick (detail modal) doesn't also fire.

function ProjectScopePill({
  connection,
  projectName,
  projects,
  onReassign,
}: {
  connection: Connection
  projectName: string
  projects: Project[]
  onReassign: (projectId: string | null) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={e => e.stopPropagation()}
        className="flex items-center gap-1 text-[10px] border border-stroke rounded-full px-2 py-0.5 text-grey-light leading-tight shrink-0 hover:bg-main hover:text-grey-darkest transition-colors cursor-pointer aria-expanded:bg-main aria-expanded:text-grey-darkest"
        title="Click to reassign to a different project"
      >
        <Cube size={9} weight="bold" />
        <span>{projectName}</span>
        <CaretDown size={9} weight="bold" className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onClick={e => e.stopPropagation()}
        className="min-w-[220px]"
      >
        <DropdownMenuItem
          onClick={e => {
            e.stopPropagation()
            onReassign(null)
          }}
          className="gap-2 text-sm"
        >
          <span className="w-4 shrink-0">
            {connection.projectId == null && <Check size={12} weight="bold" />}
          </span>
          <span className="flex-1">Common (shared)</span>
        </DropdownMenuItem>
        {projects.map(p => (
          <DropdownMenuItem
            key={p.id}
            onClick={e => {
              e.stopPropagation()
              onReassign(p.id)
            }}
            className="gap-2 text-sm"
          >
            <span className="w-4 shrink-0">
              {connection.projectId === p.id && <Check size={12} weight="bold" />}
            </span>
            <Cube size={12} weight="bold" className="shrink-0 text-grey-dark" />
            <span className="flex-1 truncate">{p.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ConnectionsPage() {
  const { connections, projects: projectsCtx } = useDashboard()
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)

  return (
    /*
      Single-tree layout. Chrome forks via Tailwind responsive
      prefixes — same approach as `/hub/settings`:
        - `<MobileTopBar variant="page">` is internally `md:hidden`,
          carries the title + a brand-coloured `+` icon button on the
          right (icon-only at <md to fit beside the title at 320 px).
        - Desktop's `<SectionHeader>` (with the labelled "Add
          connection" pill in its `rightSlot`) wraps in
          `hidden md:block` so it disappears on mobile.
      Padding mirrors the home page: balanced 16-px on mobile,
      desktop reverts to "no left (sidebar fills it), 24-px right".
    */
    <>
      <MobileTopBar
        variant="page"
        title="Connections"
        rightSlot={
          <button
            type="button"
            onClick={() => connections.openModal(null)}
            aria-label="Add connection"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-brand text-white shadow-pill hover:bg-brand/90 transition-colors shrink-0"
          >
            <Plus size={14} weight="bold" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto md:overflow-visible md:flex-none px-4 pt-4 pb-8 md:px-0 md:pt-6 md:pr-6 md:pb-8 md:max-w-[1600px] flex flex-col">
      <Suspense>
        <OAuthCallbacks />
        <GoogleAnalyticsPropertyPicker />
        <StripeProductPicker />
      </Suspense>

      <ConnectionDetailModal
        connection={selectedConnection}
        onClose={() => {
          setSelectedConnection(null)
          connections.loadConnections()
        }}
      />

      <div className="flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
        <div className="hidden md:block">
          <SectionHeader
            icon={
              <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
                <PlugsConnected size={14} weight="bold" className="text-grey-darkest" />
              </span>
            }
            title={<span className="text-base font-bold text-grey-darkest">Connections</span>}
            rightSlot={
              <Button
                className="rounded-full gap-1.5 px-4 bg-brand hover:bg-brand/90 text-white"
                onClick={() => connections.openModal(null)}
              >
                <Plus size={14} weight="bold" />
                Add connection
              </Button>
            }
            // `bg-main` was previously the SectionHeader default; pass
            // it explicitly now that the component no longer hardcodes
            // a bg.
            className="bg-main"
          />
        </div>

        {connections.loading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
          </div>
        ) : connections.connections.length === 0 ? (
          <p className="text-sm text-grey-light px-4 py-5">
            No connections yet.
          </p>
        ) : (
          <div className="divide-y divide-stroke">
            {connections.connections.map(connection => {
              // Resolve the project label. null == "Common" (shared across
              // every project this user owns). Type-specific pills
              // (gaPropertyName, vercelProjectName) live in the detail modal
              // now — the row shows exactly one badge: the project scope.
              const projectName = connection.projectId
                ? (projectsCtx.projects.find(p => p.id === connection.projectId)?.name ?? 'Project')
                : 'Common'
              return (
                <div
                  key={connection.id}
                  onClick={() => setSelectedConnection(connection)}
                  className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-main"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ConnectionIcon type={connection.type} size={20} className="text-grey-dark shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-grey-dark truncate">
                          {connection.name}
                        </p>
                        <ProjectScopePill
                          connection={connection}
                          projectName={projectName}
                          projects={projectsCtx.projects}
                          onReassign={id => connections.reassignProject(connection.id, id)}
                        />
                      </div>
                      <p className="text-xs text-grey-light">
                        {CONNECTION_DISPLAY_NAMES[connection.type] ?? connection.type} · Connected{' '}
                        {new Date(connection.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(connection.type === 'stripe' || connection.type === 'stripe_manual') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={e => e.stopPropagation()}
                          // `md:opacity-0 md:group-hover:opacity-100` keeps
                          // the desktop hover-reveal behaviour but always
                          // shows the button on mobile (no hover events on
                          // touch devices). `aria-expanded:opacity-100`
                          // covers the case where the menu is open without
                          // the cursor on the row.
                          className="md:opacity-0 md:group-hover:opacity-100 aria-expanded:opacity-100 flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded text-grey-light hover:text-grey-darkest transition-colors cursor-pointer"
                          title="More actions"
                        >
                          <DotsThreeVertical size={16} weight="bold" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={e => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation()
                              connections.reloadStripe(connection.id)
                            }}
                            className="gap-2 text-sm"
                          >
                            <ArrowsClockwise size={12} weight="bold" />
                            <span>Refresh data from Stripe</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); connections.deleteConnection(connection.id) }}
                      // Same `md:opacity-0 md:group-hover:opacity-100`
                      // pattern as the dots-menu trigger above —
                      // hover-reveal on desktop, always visible on
                      // mobile (44 × 44 → 28 × 28 at md+).
                      className="md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded text-grey-light hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </>
  )
}
