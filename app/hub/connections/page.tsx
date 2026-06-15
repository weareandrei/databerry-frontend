'use client'

import { Suspense, useState, useEffect } from 'react'
import {
  SquaresFour,
  Trash,
  Plus,
  ArrowsClockwise,
  CaretRight,
  Check,
  DotsThreeVertical,
} from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { ConnectionsList } from '@/app/hub/(components)/connections/ConnectionsList'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { useOAuthCallback } from '@/hooks/useOAuthCallback'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { ConnectionDetailModal } from '@/app/hub/(components)/modals/ConnectionDetailModal'
import { StripeProductPicker } from '@/app/hub/connections/(modals)/StripeProductPicker'
import { AddMcpConnectionModal } from '@/app/hub/connections/(modals)/AddMcpConnectionModal'
import { ProjectScopePill } from '@/app/hub/connections/(components)/ProjectScopePill'
import { Cpu } from '@phosphor-icons/react'
import { ALGORITHM, type GAProperty } from '@/lib/api'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Connection } from '@/types/connection'

function OAuthCallbacks() {
  useOAuthCallback('stripe')
  useOAuthCallback('calendly')
  useOAuthCallback('google_analytics')
  useOAuthCallback('sentry')
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
    <BottomDialog open onOpenChange={open => { if (!open) handleClose() }}>
      <BottomDialog.Page
        title="Select a GA4 property"
        bodyMaxWidth="32rem"
        headerRight={() => (
          <div className="flex shrink-0 items-center gap-2">
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
        )}
      >
        <p className="text-sm text-muted-foreground -mt-1 mb-3">
          Choose which Google Analytics 4 property to track.
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading properties…</p>
        ) : !hasProperties ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No GA4 properties found.</p>
        ) : (
          <div className="space-y-1.5">
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
      </BottomDialog.Page>
    </BottomDialog>
  )
}

export default function ConnectionsPage() {
  const router = useRouter()
  const { connections, projects: projectsCtx } = useDashboard()
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  // MCP add-modal lives at the page level so it's a sibling of the
  // section it's launched from — keeps it out of the connections list
  // re-render cycle and lets the BottomDialog's portal target stay
  // stable across opens.
  const [mcpModalOpen, setMcpModalOpen] = useState(false)
  // Split the connections array: regular ones go in the existing
  // section (top); MCP ones go in their own section (bottom). One
  // pass, no extra renders.
  const regularConnections = connections.connections.filter(c => c.type !== 'mcp')
  const mcpConnections = connections.connections.filter(c => c.type === 'mcp')

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
      <div className="flex-1 overflow-y-auto md:overflow-visible md:flex-none px-4 pt-4 pb-8 md:pl-4 md:pt-6 md:pr-6 md:pb-8 md:max-w-[1600px] flex flex-col">
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

      {/* Mobile-only "MCP Connections" nav pill. Routes to the
          dedicated `/hub/connections/mcp` subpage — same pattern as
          tapping a project on mobile home opening
          `/hub/project/[id]`. Splits the cognitive load: on a phone
          the user sees one list at a time, with a clear affordance
          to switch. Hidden on desktop, where vertical space lets
          both lists coexist on the same page. Sits ABOVE the
          regular connections card so it's the first thing the user
          sees when they arrive — same priority MCP has on desktop
          (its own dedicated card). */}
      <button
        type="button"
        onClick={() => router.push('/hub/connections/mcp')}
        className="md:hidden flex items-center gap-3 mb-3 rounded-xl border border-stroke bg-white shadow-card px-4 py-3 cursor-pointer hover:bg-hover-fill transition-colors text-left"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-main border border-stroke shrink-0">
          <Cpu size={16} weight="bold" className="text-grey-darkest" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-grey-darkest leading-tight">
            MCP Connections
          </span>
          <span className="block text-[11px] text-grey-light leading-tight mt-0.5">
            {mcpConnections.length === 0
              ? 'Connect any MCP server to Databerry.'
              : `${mcpConnections.length} connected — manage or add more.`}
          </span>
        </span>
        <CaretRight
          size={14}
          weight="bold"
          className="text-grey-light shrink-0"
        />
      </button>

      <div className="flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
        <div className="hidden md:block">
          <SectionHeader
            icon={
              <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
                <SquaresFour size={14} weight="bold" className="text-grey-darkest" />
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

        <ConnectionsList
          connections={regularConnections}
          projects={projectsCtx.projects}
          loading={connections.loading}
          emptyText="No connections yet."
          onSelect={setSelectedConnection}
          onDelete={connections.deleteConnection}
          onReassign={connections.reassignProject}
          onReloadStripe={connections.reloadStripe}
        />
      </div>

      {/* ── MCP Connections ────────────────────────────────────────
          Sibling section below the main Connections card, same chrome
          (rounded white card + sticky-style header), but the add
          button opens the MCP-specific `BottomDialog` form instead of
          the generic create-connection picker. The list is filtered
          on `type === 'mcp'` so MCP servers never bleed into the
          regular Connections section above (and vice versa).

          Why a separate section rather than reusing the existing
          modal: MCP is a generic "any remote server" connector with
          a flat form (URL + auth), and rolling it into the picker
          would conflate "I want to add Stripe" (vendor-specific
          OAuth/keys) with "I want to add an arbitrary MCP endpoint."
          Visually separating them keeps the mental model clean.

          DESKTOP ONLY (`hidden md:flex`). On mobile this whole block
          moves to `/hub/connections/mcp` — the user gets there via
          the nav pill at the top of this page. Splitting prevents
          the phone's vertical viewport from competing two lists for
          attention. */}
      <div className="hidden md:flex mt-4 flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
        <div className="hidden md:block">
          <SectionHeader
            icon={
              <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
                <Cpu size={14} weight="bold" className="text-grey-darkest" />
              </span>
            }
            title={
              <span className="text-base font-bold text-grey-darkest">
                MCP Connections
              </span>
            }
            rightSlot={
              <Button
                className="rounded-full gap-1.5 px-4 bg-brand hover:bg-brand/90 text-white"
                onClick={() => setMcpModalOpen(true)}
              >
                <Plus size={14} weight="bold" />
                Add MCP connection
              </Button>
            }
            className="bg-main"
          />
        </div>
        {/* (Mobile sub-header used to live here. Removed when the
            MCP section became desktop-only — the dedicated
            `/hub/connections/mcp` page now owns the mobile UX, with
            its own `<MobileTopBar>` carrying the title + add button.) */}

        {connections.loading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowsClockwise
              size={16}
              weight="bold"
              className="text-muted-foreground animate-spin"
            />
          </div>
        ) : mcpConnections.length === 0 ? (
          <p className="text-sm text-grey-light px-4 py-5">
            No MCP connections yet.
          </p>
        ) : (
          <div className="divide-y divide-stroke">
            {mcpConnections.map(connection => {
              const projectName = connection.projectId
                ? projectsCtx.projects.find(p => p.id === connection.projectId)?.name ?? 'Project'
                : 'Common'
              return (
                <div
                  key={connection.id}
                  onClick={() => setSelectedConnection(connection)}
                  className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-main"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ConnectionIcon
                      type={connection.type}
                      size={20}
                      className="text-grey-dark shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-grey-dark truncate">
                          {connection.name}
                        </p>
                        <ProjectScopePill
                          connection={connection}
                          projectName={projectName}
                          projects={projectsCtx.projects}
                          onReassign={id =>
                            connections.reassignProject(connection.id, id)
                          }
                        />
                      </div>
                      {/* MCP row shows the server URL underneath the
                          name (instead of the generic "Connected on …"
                          line) — the URL is the identifying piece of
                          info for an MCP connection, much more useful
                          than the creation date. */}
                      <p className="text-xs text-grey-light truncate">
                        {connection.mcpServerUrl ?? 'MCP'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Delete "${connection.name}"?`)) {
                          connections.deleteConnection(connection.id)
                        }
                      }}
                      aria-label="Delete connection"
                      className="md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded text-grey-light hover:text-grey-darkest hover:bg-black/[0.06] transition-colors"
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

      <AddMcpConnectionModal open={mcpModalOpen} onOpenChange={setMcpModalOpen} />
      </div>
    </>
  )
}
