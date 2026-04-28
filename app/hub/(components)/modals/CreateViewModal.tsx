'use client'

import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { BottomDialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ALGORITHM, type PosthogEventDefinition } from '@/lib/api'
import {
  STRIPE_VIEW_OPTIONS,
  CALENDLY_VIEW_OPTIONS,
  GA_VIEW_OPTIONS,
  WEBHOOK_VIEW_OPTIONS,
  COMPOSITE_VIEW_OPTIONS,
  type ViewKind,
} from '@/constants/viewOptions'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import type { Connection } from '@/types/connection'
import { ViewPickerRow } from './ViewPickerRow'
import type { ViewTypeCardProps } from './ViewTypeCard'

type EventsStep = {
  connectionId: string
  connectionName: string
  events: PosthogEventDefinition[] | null
  loading: boolean
  error: string | null
}

// Webhook needs a field name for `gauge` / `append`, so when the user
// picks one of those from the picker we push this sub-page just to
// collect the field. `webhook_counter` doesn't need a field — it bypasses
// this step entirely and creates immediately.
type WebhookStep = {
  connectionId: string
  connectionName: string
  viewType: 'webhook_gauge' | 'webhook_append'
  field: string
}

// View-type display-name maps. The flat picker creates inline so it
// needs the human-readable name to write into `views_values.name`.
const STRIPE_NAME_MAP: Record<string, string> = {
  stripe_gross: 'Gross Volume',
  stripe_revenue_today: 'Total Gross Revenue',
}
const CALENDLY_NAME_MAP: Record<string, string> = {
  calendly_meetings_today: 'Meetings',
  calendly_meetings_list: 'Meetings list',
}
const GA_NAME_MAP: Record<string, string> = {
  ga_active_users: 'Active Users Right Now',
  ga_users_today: 'Users',
  ga_sessions_today: 'Sessions',
  ga_pageviews_today: 'Pageviews',
}
const WEBHOOK_NAME_MAP: Record<string, string> = {
  webhook_counter: 'Event Counter',
  webhook_gauge: 'Gauge',
  webhook_append: 'Timeline',
}

export function CreateViewModal() {
  const { views, connections } = useDashboard()
  const [eventsStep, setEventsStep] = useState<EventsStep | null>(null)
  const [webhookStep, setWebhookStep] = useState<WebhookStep | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [tracking, setTracking] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      views.closeModal()
      setEventsStep(null)
      setWebhookStep(null)
      setSelectedEvents(new Set())
    }
  }

  const toggleEvent = (eventName: string) => {
    setSelectedEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventName)) next.delete(eventName)
      else next.add(eventName)
      return next
    })
  }

  // ── PostHog event picker (sub-page) ──────────────────────────────────────

  const handleTrackEvents = async () => {
    if (!eventsStep || selectedEvents.size === 0 || !views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews(
        Array.from(selectedEvents).map(eventName => ({
          projectId: views.createViewProjectId!,
          folderId: views.createViewFolderId,
          connectionId: eventsStep.connectionId,
          connectionType: 'posthog',
          type: 'daily_counter',
          name: eventName,
          config: { eventName },
          value: null,
        })),
      )
      views.closeModal()
      setEventsStep(null)
      setSelectedEvents(new Set())
    } finally {
      setTracking(false)
    }
  }

  const openPosthogEventPicker = async (connectionId: string, connectionName: string) => {
    setEventsStep({ connectionId, connectionName, events: null, loading: true, error: null })
    try {
      const events = await ALGORITHM.getPosthogEventDefinitions(connectionId)
      setEventsStep({ connectionId, connectionName, events, loading: false, error: null })
    } catch (err) {
      setEventsStep({
        connectionId,
        connectionName,
        events: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch events',
      })
    }
  }

  // ── Direct creators (no sub-page) ────────────────────────────────────────

  const createView = async (
    body: {
      connectionId: string | null
      connectionType: string
      type: string
      name: string
      config: Record<string, unknown>
    } | {
      connectionId: string | null
      connectionType: string
      type: string
      name: string
      config: Record<string, unknown>
    }[],
  ) => {
    if (!views.createViewProjectId) return
    const list = Array.isArray(body) ? body : [body]
    setTracking(true)
    try {
      await views.createViews(
        list.map(b => ({
          projectId: views.createViewProjectId!,
          folderId: views.createViewFolderId,
          ...b,
          value: null,
        })),
      )
      views.closeModal()
    } finally {
      setTracking(false)
    }
  }

  // Stripe Connect — single auto-named view, no view-type choice.
  const handleCreateStripeConnect = (conn: Connection) =>
    createView({
      connectionId: conn.id,
      connectionType: 'stripe',
      type: 'daily_revenue',
      name: 'Daily Revenue',
      config: {},
    })

  const handleCreateStripeManual = (conn: Connection, type: 'stripe_gross' | 'stripe_revenue_today') =>
    createView({
      connectionId: conn.id,
      connectionType: 'stripe_manual',
      type,
      name: STRIPE_NAME_MAP[type],
      config: {},
    })

  const handleCreateCalendly = (conn: Connection, type: 'calendly_meetings_today' | 'calendly_meetings_list') =>
    createView({
      connectionId: conn.id,
      connectionType: 'calendly',
      type,
      name: CALENDLY_NAME_MAP[type],
      config: {},
    })

  const handleCreateGA = (
    conn: Connection,
    type: 'ga_active_users' | 'ga_users_today' | 'ga_sessions_today' | 'ga_pageviews_today',
  ) =>
    createView({
      connectionId: conn.id,
      connectionType: 'google_analytics',
      type,
      name: GA_NAME_MAP[type],
      config: {},
    })

  // Webhook counter doesn't need a field — `body.value ??= 1` is the
  // implicit increment. Gauge/append push the WebhookStep page so the
  // user can specify which body key to read.
  const handleCreateWebhookCounter = (conn: Connection) =>
    createView({
      connectionId: conn.id,
      connectionType: 'webhook',
      type: 'webhook_counter',
      name: WEBHOOK_NAME_MAP.webhook_counter,
      config: {},
    })

  const handleCreateWebhookWithField = async () => {
    if (!webhookStep || !views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId: views.createViewFolderId,
          connectionId: webhookStep.connectionId,
          connectionType: 'webhook',
          type: webhookStep.viewType,
          name: WEBHOOK_NAME_MAP[webhookStep.viewType],
          config: { field: webhookStep.field },
          value: null,
        },
      ])
      views.closeModal()
      setWebhookStep(null)
    } finally {
      setTracking(false)
    }
  }

  // Project Overview is connection-less and creates a pair of views
  // (chart + sources). Backend stores them as independent rows so the
  // user can later remove either.
  const handleCreateOverview = () =>
    createView([
      {
        connectionId: null,
        connectionType: 'composite',
        type: 'project_overview',
        name: 'Overview',
        config: { primaryMetric: 'visitors', secondaryMetric: null },
      },
      {
        connectionId: null,
        connectionType: 'composite',
        type: 'project_overview_sources',
        name: 'Sources',
        config: { sourcesLimit: 10 },
      },
    ])

  // ── Build the picker rows ────────────────────────────────────────────────

  // "Project Overview" already added at this folder/project? We treat it
  // as a pair, so existence of either half disables the card.
  const overviewAlreadyExists = views.views.some(
    v =>
      (v.type === 'project_overview' || v.type === 'project_overview_sources') &&
      v.projectId === views.createViewProjectId &&
      (v.folderId ?? null) === (views.createViewFolderId ?? null),
  )

  // Per-connection row builders. Each returns a `ViewTypeCardProps[]` that
  // ViewPickerRow renders as cards. Rows for connection types we don't
  // support yet (vercel, sentry, github, etc.) yield `null` and are
  // filtered out — the user only sees rows they can actually act on.
  function buildCardsForConnection(conn: Connection): ViewTypeCardProps[] | null {
    switch (conn.type) {
      case 'stripe':
        return [
          {
            type: 'stripe_daily_revenue',
            name: 'Daily Revenue',
            description: 'Stripe Connect — auto-synced daily totals',
            kind: 'chart' as ViewKind,
            iconType: 'stripe',
            disabled: tracking,
            onSelect: () => handleCreateStripeConnect(conn),
          },
        ]
      case 'stripe_manual':
        return STRIPE_VIEW_OPTIONS.map(opt => ({
          type: opt.type,
          name: opt.name,
          description: opt.desc,
          kind: opt.kind,
          iconType: 'stripe',
          disabled: tracking,
          onSelect: () => handleCreateStripeManual(conn, opt.type),
        }))
      case 'calendly':
        return CALENDLY_VIEW_OPTIONS.map(opt => ({
          type: opt.type,
          name: opt.name,
          description: opt.desc,
          kind: opt.kind,
          iconType: 'calendly',
          disabled: tracking,
          onSelect: () => handleCreateCalendly(conn, opt.type),
        }))
      case 'google_analytics':
        return GA_VIEW_OPTIONS.map(opt => ({
          type: opt.type,
          name: opt.name,
          description: opt.desc,
          kind: opt.kind,
          iconType: 'google_analytics',
          disabled: tracking,
          onSelect: () => handleCreateGA(conn, opt.type),
        }))
      case 'webhook':
        return WEBHOOK_VIEW_OPTIONS.map(opt => ({
          type: opt.type,
          name: opt.name,
          description: opt.desc,
          kind: opt.kind,
          iconType: 'webhook',
          disabled: tracking,
          onSelect: () => {
            if (opt.type === 'webhook_counter') {
              handleCreateWebhookCounter(conn)
            } else {
              setWebhookStep({
                connectionId: conn.id,
                connectionName: conn.name,
                viewType: opt.type,
                field: 'value',
              })
            }
          },
        }))
      case 'posthog':
        // PostHog views are user-supplied event names — surface a single
        // entrypoint card that opens the events sub-page.
        return [
          {
            type: 'posthog_track_events',
            name: 'Track events',
            description: 'Pick events to count daily — one tile per event',
            kind: 'value' as ViewKind,
            iconType: 'posthog',
            disabled: tracking,
            onSelect: () => openPosthogEventPicker(conn.id, conn.name),
          },
        ]
      // Vercel + the in-development integrations (sentry/github/x/reddit/gmail)
      // have no view-type implementations yet. Connections of those types
      // simply don't produce a row.
      default:
        return null
    }
  }

  // Project Overview row — connection-less, prepended above the
  // per-connection rows so the most-common compositional view is the
  // first thing the user sees.
  const overviewRow: ViewTypeCardProps[] = [
    {
      type: 'project_overview',
      name: COMPOSITE_VIEW_OPTIONS[0].name,
      description: 'Visitors chart + sources breakdown',
      kind: 'chart',
      iconType: 'composite',
      disabled: overviewAlreadyExists || tracking,
      badge: overviewAlreadyExists ? 'Added' : undefined,
      onSelect: handleCreateOverview,
    },
  ]

  // One row per connection. Empty/unsupported types drop out.
  const connectionRows: { conn: Connection; cards: ViewTypeCardProps[] }[] = []
  for (const conn of connections.connections) {
    const cards = buildCardsForConnection(conn)
    if (cards && cards.length > 0) connectionRows.push({ conn, cards })
  }

  return (
    <BottomDialog open={views.isModalOpen} onOpenChange={handleOpenChange}>
      {/* Page priority: PostHog event picker > Webhook field form > root.
          Only one Page renders at a time (BottomDialog picks the first
          truthy child). */}

      {eventsStep && (
        <BottomDialog.Page
          title={`${eventsStep.connectionName} — Event types`}
          pageKey={`events:${eventsStep.connectionId}`}
          onBack={() => {
            setEventsStep(null)
            setSelectedEvents(new Set())
          }}
        >
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            All event types ever tracked in this project
          </p>
          {eventsStep.loading && (
            <p className="text-sm text-grey-light py-4 text-center">Loading events…</p>
          )}
          {eventsStep.error && (
            <p className="text-sm text-destructive py-4 text-center">{eventsStep.error}</p>
          )}
          {eventsStep.events && eventsStep.events.length === 0 && (
            <p className="text-sm text-grey-light py-4 text-center">No events found.</p>
          )}
          {eventsStep.events && eventsStep.events.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {eventsStep.events.map((def, i) => {
                  const isSelected = selectedEvents.has(def.name)
                  const volume = def.volume_30_day ?? def.computed_volume
                  const urlPath = def.last_url ?? null
                  return (
                    <div
                      key={def.id ?? i}
                      onClick={() => toggleEvent(def.name)}
                      className={cn(
                        'rounded-lg border p-3 flex flex-col gap-2 cursor-pointer transition-all select-none',
                        isSelected
                          ? 'border-brand bg-brand/5'
                          : 'border-stroke bg-white hover:bg-hover-fill',
                      )}
                    >
                      <p className="text-sm font-semibold text-grey-darkest truncate">{def.name}</p>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-grey-light">30d events</span>
                          <span className="text-xs font-medium text-grey-dark">
                            {volume.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-grey-light">Last seen</span>
                          <span className="text-xs font-medium text-grey-dark">
                            {def.last_seen_at
                              ? new Date(def.last_seen_at).toLocaleDateString()
                              : '—'}
                          </span>
                        </div>
                        {urlPath && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-grey-light shrink-0">Last URL</span>
                            <span className="text-xs font-medium text-grey-dark truncate text-right">
                              {urlPath}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="sticky bottom-0 -mx-4 -mb-6 mt-3 border-t border-stroke bg-popover px-4 py-3">
                <button
                  disabled={selectedEvents.size === 0 || tracking}
                  onClick={handleTrackEvents}
                  className="w-full rounded-lg bg-brand text-white text-sm font-semibold py-3 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                >
                  {tracking
                    ? 'Tracking…'
                    : selectedEvents.size === 0
                      ? 'Select events to track'
                      : `Track ${selectedEvents.size} event${selectedEvents.size > 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </BottomDialog.Page>
      )}

      {!eventsStep && webhookStep && (
        <BottomDialog.Page
          title={`${webhookStep.connectionName} — ${WEBHOOK_NAME_MAP[webhookStep.viewType]}`}
          pageKey={`webhook:${webhookStep.connectionId}:${webhookStep.viewType}`}
          onBack={() => setWebhookStep(null)}
        >
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            Which key in the POST body should this view read?
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Body field name</label>
              <input
                className="w-full text-sm border rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                placeholder="value"
                value={webhookStep.field}
                onChange={e => setWebhookStep({ ...webhookStep, field: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The key to read from the POST body, e.g.{' '}
                <code className="bg-muted px-1 rounded">total_price</code>
              </p>
            </div>
            <Button
              className="w-full"
              disabled={!webhookStep.field || tracking}
              onClick={handleCreateWebhookWithField}
            >
              {tracking ? 'Creating…' : 'Create view'}
            </Button>
          </div>
        </BottomDialog.Page>
      )}

      {!eventsStep && !webhookStep && (
        <BottomDialog.Page title="Add a view">
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            Pick what to track. Each row groups views you can create from one of your connections.
          </p>

          <div className="space-y-5">
            {/* Project Overview always renders first — it's the headline
                composite tile and the most-likely click for a fresh project. */}
            <ViewPickerRow title="Project" cards={overviewRow} />

            {/* One row per connection. We label each row with the
                integration's display name plus the user's connection
                name so two connections of the same type are visually
                distinct ("Stripe — Main account" vs. "Stripe — Side hustle"). */}
            {connectionRows.map(({ conn, cards }) => (
              <ViewPickerRow
                key={conn.id}
                title={CONNECTION_DISPLAY_NAMES[conn.type] ?? conn.type}
                subtitle={conn.name}
                cards={cards}
              />
            ))}

            {/* "+ New connection" CTA. Always visible — even with zero
                connections (the empty state) and as a way to add more
                from this picker without leaving the flow. */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  views.closeModal()
                  connections.openModal(views.createViewFolderId)
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-foreground/15 bg-card/40 px-3 py-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-card hover:text-foreground"
              >
                <Plus size={13} weight="bold" />
                New connection
              </button>
            </div>
          </div>
        </BottomDialog.Page>
      )}
    </BottomDialog>
  )
}
