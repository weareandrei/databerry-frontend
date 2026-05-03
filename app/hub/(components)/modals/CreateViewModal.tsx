'use client'

import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  BottomDialog,
  type BottomDialogPageSlotContext,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { HeaderSaveCancel } from './HeaderSaveCancel'
import { cn } from '@/lib/utils'
import { ALGORITHM, type PosthogEventDefinition } from '@/lib/api'
import {
  STRIPE_VIEW_OPTIONS,
  CALENDLY_VIEW_OPTIONS,
  GA_VIEW_OPTIONS,
  WEBHOOK_VIEW_OPTIONS,
  COMPOSITE_VIEW_OPTIONS,
  POSTHOG_VIEW_OPTIONS,
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

// Funnel sub-page: between 2 and 5 ordered events plus a conversion-window
// pick. We load the connection's event definitions once and reuse the same
// list as the events step (PostHog-typed source of truth for event names).
type FunnelStep = {
  connectionId: string
  connectionName: string
  events: PosthogEventDefinition[] | null
  loading: boolean
  error: string | null
  // Each row is the event name (or '' before the user picks). We keep an
  // empty string in the array so a row renders even if the user hasn't
  // chosen yet — visually clearer than juggling row count + values.
  steps: string[]
  conversionWindowSeconds: number
}

// Retention sub-page: a start event, a return event (default same), and the
// matrix shape (period × cohortCount × retentionPeriods).
type RetentionStep = {
  connectionId: string
  connectionName: string
  events: PosthogEventDefinition[] | null
  loading: boolean
  error: string | null
  startEvent: string
  returnEvent: string
  period: 'day' | 'week'
  cohortCount: number
  retentionPeriods: number
}

// Conversion-window options for the funnel sub-page. Numbers in seconds —
// matches the backend default (7 days) and offers the most-common buckets.
const CONVERSION_WINDOW_OPTIONS: { label: string; seconds: number }[] = [
  { label: '1 hour', seconds: 60 * 60 },
  { label: '24 hours', seconds: 60 * 60 * 24 },
  { label: '7 days', seconds: 60 * 60 * 24 * 7 },
  { label: '30 days', seconds: 60 * 60 * 24 * 30 },
]

// View-type display-name maps. The flat picker creates inline so it
// needs the human-readable name to write into `views_values.name`.
const STRIPE_NAME_MAP: Record<string, string> = {
  stripe_gross: 'Gross Volume',
  stripe_revenue_today: 'Total Gross Revenue',
  stripe_mrr: 'MRR',
  stripe_active_subs: 'Active Subscriptions',
  stripe_top_customers: 'Top Customers',
  stripe_churn_rate: 'Churn Rate',
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
const POSTHOG_NAME_MAP: Record<string, string> = {
  posthog_funnel: 'Funnel',
  posthog_retention: 'Retention',
  posthog_users: 'Recent users',
}

export function CreateViewModal() {
  const { views, connections } = useDashboard()
  const [eventsStep, setEventsStep] = useState<EventsStep | null>(null)
  const [webhookStep, setWebhookStep] = useState<WebhookStep | null>(null)
  const [funnelStep, setFunnelStep] = useState<FunnelStep | null>(null)
  const [retentionStep, setRetentionStep] = useState<RetentionStep | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [tracking, setTracking] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      views.closeModal()
      setEventsStep(null)
      setWebhookStep(null)
      setFunnelStep(null)
      setRetentionStep(null)
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

  // ── Funnel sub-page ──────────────────────────────────────────────────────

  const openPosthogFunnelPicker = async (connectionId: string, connectionName: string) => {
    setFunnelStep({
      connectionId,
      connectionName,
      events: null,
      loading: true,
      error: null,
      // Two empty rows up front — the picker is useless with fewer than 2.
      steps: ['', ''],
      conversionWindowSeconds: 60 * 60 * 24 * 7,
    })
    try {
      const events = await ALGORITHM.getPosthogEventDefinitions(connectionId)
      setFunnelStep(prev => (prev ? { ...prev, events, loading: false } : prev))
    } catch (err) {
      setFunnelStep(prev =>
        prev
          ? {
              ...prev,
              events: null,
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch events',
            }
          : prev,
      )
    }
  }

  const updateFunnelStep = (idx: number, eventName: string) => {
    setFunnelStep(prev => {
      if (!prev) return prev
      const next = [...prev.steps]
      next[idx] = eventName
      return { ...prev, steps: next }
    })
  }

  const addFunnelStep = () => {
    setFunnelStep(prev => {
      if (!prev || prev.steps.length >= 5) return prev
      return { ...prev, steps: [...prev.steps, ''] }
    })
  }

  const removeFunnelStep = (idx: number) => {
    setFunnelStep(prev => {
      if (!prev || prev.steps.length <= 2) return prev
      return { ...prev, steps: prev.steps.filter((_, i) => i !== idx) }
    })
  }

  const handleCreateFunnel = async () => {
    if (!funnelStep || !views.createViewProjectId) return
    const filled = funnelStep.steps.map(s => s.trim()).filter(s => s.length > 0)
    if (filled.length < 2) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId: views.createViewFolderId,
          connectionId: funnelStep.connectionId,
          connectionType: 'posthog',
          type: 'posthog_funnel',
          name: POSTHOG_NAME_MAP.posthog_funnel,
          config: {
            steps: filled.map(eventName => ({ eventName })),
            conversionWindowSeconds: funnelStep.conversionWindowSeconds,
          },
          value: null,
        },
      ])
      views.closeModal()
      setFunnelStep(null)
    } finally {
      setTracking(false)
    }
  }

  // ── Retention sub-page ───────────────────────────────────────────────────

  const openPosthogRetentionPicker = async (connectionId: string, connectionName: string) => {
    setRetentionStep({
      connectionId,
      connectionName,
      events: null,
      loading: true,
      error: null,
      startEvent: '$pageview',
      returnEvent: '$pageview',
      period: 'day',
      cohortCount: 7,
      retentionPeriods: 7,
    })
    try {
      const events = await ALGORITHM.getPosthogEventDefinitions(connectionId)
      setRetentionStep(prev => (prev ? { ...prev, events, loading: false } : prev))
    } catch (err) {
      setRetentionStep(prev =>
        prev
          ? {
              ...prev,
              events: null,
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch events',
            }
          : prev,
      )
    }
  }

  const handleCreateRetention = async () => {
    if (!retentionStep || !views.createViewProjectId) return
    if (!retentionStep.startEvent || !retentionStep.returnEvent) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId: views.createViewFolderId,
          connectionId: retentionStep.connectionId,
          connectionType: 'posthog',
          type: 'posthog_retention',
          name: POSTHOG_NAME_MAP.posthog_retention,
          config: {
            startEvent: retentionStep.startEvent,
            returnEvent: retentionStep.returnEvent,
            period: retentionStep.period,
            cohortCount: retentionStep.cohortCount,
            retentionPeriods: retentionStep.retentionPeriods,
          },
          value: null,
        },
      ])
      views.closeModal()
      setRetentionStep(null)
    } finally {
      setTracking(false)
    }
  }

  // ── Users (no sub-page — direct creation) ────────────────────────────────

  const handleCreatePosthogUsers = (conn: Connection) =>
    createView({
      connectionId: conn.id,
      connectionType: 'posthog',
      type: 'posthog_users',
      name: POSTHOG_NAME_MAP.posthog_users,
      config: {},
    })

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

  const handleCreateStripeManual = (
    conn: Connection,
    type:
      | 'stripe_gross'
      | 'stripe_revenue_today'
      | 'stripe_mrr'
      | 'stripe_active_subs'
      | 'stripe_top_customers'
      | 'stripe_churn_rate',
  ) =>
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
        // Four cards under one PostHog connection: the existing event-counter
        // entrypoint plus three richer view types (funnel, retention, users).
        // Funnel + retention push their own sub-page for config; users
        // creates immediately (no per-view config in v1).
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
          ...POSTHOG_VIEW_OPTIONS.map(opt => ({
            type: opt.type,
            name: opt.name,
            description: opt.desc,
            kind: opt.kind,
            iconType: 'posthog',
            disabled: tracking,
            onSelect: () => {
              if (opt.type === 'posthog_funnel') {
                openPosthogFunnelPicker(conn.id, conn.name)
              } else if (opt.type === 'posthog_retention') {
                openPosthogRetentionPicker(conn.id, conn.name)
              } else {
                handleCreatePosthogUsers(conn)
              }
            },
          })),
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

  // Only show connections that are eligible for *this* project: either
  // scoped to it directly (`projectId === createViewProjectId`) or shared
  // across all projects ("Common", `projectId == null`). Connections
  // scoped to a different project are filtered out — surfacing them in
  // the picker would let the user create a view that immediately fails
  // the backend's project-scope checks. Mirrors the same predicate used
  // in `ReassignConnectionDialog`.
  const eligibleConnections = connections.connections.filter(
    c => c.projectId == null || c.projectId === views.createViewProjectId,
  )

  // One row per connection. Empty/unsupported types drop out.
  const connectionRows: { conn: Connection; cards: ViewTypeCardProps[] }[] = []
  for (const conn of eligibleConnections) {
    const cards = buildCardsForConnection(conn)
    if (cards && cards.length > 0) connectionRows.push({ conn, cards })
  }

  // `dirty` drives the bounce-on-dismiss behaviour for the BottomDialog —
  // when the user has typed/picked something on a sub-page and tries to
  // close the dialog by backdrop click / Esc, the close is intercepted
  // and the save/cancel cluster bounces. Computed per active sub-page so
  // we don't bounce on the picker grid where there's nothing to save.
  const dirty =
    (eventsStep != null && selectedEvents.size > 0) ||
    (webhookStep != null && webhookStep.field.trim() !== '') ||
    (funnelStep != null &&
      funnelStep.steps.some(s => s.trim() !== '')) ||
    (retentionStep != null &&
      (retentionStep.startEvent !== '' || retentionStep.returnEvent !== ''))

  return (
    <BottomDialog
      open={views.isModalOpen}
      onOpenChange={handleOpenChange}
      dirty={dirty}
    >
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
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handleTrackEvents}
              onCancel={() => {
                setEventsStep(null)
                setSelectedEvents(new Set())
              }}
              saving={tracking}
              disabled={selectedEvents.size === 0}
              bounce={ctx.bounce}
              saveLabel={
                selectedEvents.size === 0
                  ? 'Track events'
                  : `Track ${selectedEvents.size} event${selectedEvents.size > 1 ? 's' : ''}`
              }
              savingLabel="Tracking…"
            />
          )}
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
              {/* Responsive density: 2 cols up to ~1280px (small laptops),
                  3 cols on bigger laptops, 4 on 16"+ / external monitors.
                  Each card's content (event name + 3 metadata rows) is
                  compact and reads cleanly down to ~280px wide, so we'd
                  rather show more cards at once than stretch fewer to the
                  full width of a 27"/32" display. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
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
            </>
          )}
        </BottomDialog.Page>
      )}

      {!eventsStep && webhookStep && (
        <BottomDialog.Page
          title={`${webhookStep.connectionName} — ${WEBHOOK_NAME_MAP[webhookStep.viewType]}`}
          pageKey={`webhook:${webhookStep.connectionId}:${webhookStep.viewType}`}
          onBack={() => setWebhookStep(null)}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handleCreateWebhookWithField}
              onCancel={() => setWebhookStep(null)}
              saving={tracking}
              disabled={!webhookStep.field.trim()}
              bounce={ctx.bounce}
              saveLabel="Create view"
              savingLabel="Creating…"
            />
          )}
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
          </div>
        </BottomDialog.Page>
      )}

      {!eventsStep && !webhookStep && funnelStep && (
        <BottomDialog.Page
          title={`${funnelStep.connectionName} — Funnel`}
          pageKey={`funnel:${funnelStep.connectionId}`}
          onBack={() => setFunnelStep(null)}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handleCreateFunnel}
              onCancel={() => setFunnelStep(null)}
              saving={tracking}
              disabled={
                funnelStep.steps.filter(s => s.trim().length > 0).length < 2
              }
              bounce={ctx.bounce}
              saveLabel="Create funnel"
              savingLabel="Creating…"
            />
          )}
        >
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            Pick 2–5 ordered events. We'll show how many users complete each step
            within the conversion window.
          </p>
          {funnelStep.loading && (
            <p className="text-sm text-grey-light py-4 text-center">Loading events…</p>
          )}
          {funnelStep.error && (
            <p className="text-sm text-destructive py-4 text-center">{funnelStep.error}</p>
          )}
          {funnelStep.events && funnelStep.events.length === 0 && (
            <p className="text-sm text-grey-light py-4 text-center">
              No events found in this PostHog project.
            </p>
          )}
          {funnelStep.events && funnelStep.events.length > 0 && (
            <>
              <div className="flex flex-col gap-2">
                {funnelStep.steps.map((stepEvent, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums text-right">
                      {idx + 1}.
                    </span>
                    <select
                      className="flex-1 text-sm border rounded-md px-2 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                      value={stepEvent}
                      onChange={e => updateFunnelStep(idx, e.target.value)}
                    >
                      <option value="">Select an event…</option>
                      {funnelStep.events!.map(def => (
                        <option key={def.id ?? def.name} value={def.name}>
                          {def.name}
                        </option>
                      ))}
                    </select>
                    {funnelStep.steps.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeFunnelStep(idx)}
                        className="shrink-0 text-xs text-muted-foreground hover:text-destructive px-1"
                        aria-label={`Remove step ${idx + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {funnelStep.steps.length < 5 && (
                <button
                  type="button"
                  onClick={addFunnelStep}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus size={11} weight="bold" />
                  Add step
                </button>
              )}

              <div className="mt-4 space-y-1.5">
                <label className="text-sm font-medium">Conversion window</label>
                <select
                  className="w-full text-sm border rounded-md px-2 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                  value={funnelStep.conversionWindowSeconds}
                  onChange={e =>
                    setFunnelStep(prev =>
                      prev ? { ...prev, conversionWindowSeconds: Number(e.target.value) } : prev,
                    )
                  }
                >
                  {CONVERSION_WINDOW_OPTIONS.map(opt => (
                    <option key={opt.seconds} value={opt.seconds}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Max time between step 1 and the final step to still count as a conversion.
                </p>
              </div>

            </>
          )}
        </BottomDialog.Page>
      )}

      {!eventsStep && !webhookStep && !funnelStep && retentionStep && (
        <BottomDialog.Page
          title={`${retentionStep.connectionName} — Retention`}
          pageKey={`retention:${retentionStep.connectionId}`}
          onBack={() => setRetentionStep(null)}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handleCreateRetention}
              onCancel={() => setRetentionStep(null)}
              saving={tracking}
              disabled={
                !retentionStep.startEvent || !retentionStep.returnEvent
              }
              bounce={ctx.bounce}
              saveLabel="Create retention view"
              savingLabel="Creating…"
            />
          )}
        >
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            Cohort users by their first <em>start event</em>, then count how many
            return for the <em>return event</em> in each subsequent period.
          </p>
          {retentionStep.loading && (
            <p className="text-sm text-grey-light py-4 text-center">Loading events…</p>
          )}
          {retentionStep.error && (
            <p className="text-sm text-destructive py-4 text-center">{retentionStep.error}</p>
          )}
          {retentionStep.events && retentionStep.events.length === 0 && (
            <p className="text-sm text-grey-light py-4 text-center">
              No events found in this PostHog project.
            </p>
          )}
          {retentionStep.events && retentionStep.events.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Start event</label>
                  <select
                    className="w-full text-sm border rounded-md px-2 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                    value={retentionStep.startEvent}
                    onChange={e =>
                      setRetentionStep(prev =>
                        prev ? { ...prev, startEvent: e.target.value } : prev,
                      )
                    }
                  >
                    <option value="">Select an event…</option>
                    {retentionStep.events!.map(def => (
                      <option key={def.id ?? def.name} value={def.name}>
                        {def.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Return event</label>
                  <select
                    className="w-full text-sm border rounded-md px-2 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                    value={retentionStep.returnEvent}
                    onChange={e =>
                      setRetentionStep(prev =>
                        prev ? { ...prev, returnEvent: e.target.value } : prev,
                      )
                    }
                  >
                    <option value="">Select an event…</option>
                    {retentionStep.events!.map(def => (
                      <option key={def.id ?? def.name} value={def.name}>
                        {def.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Period</label>
                  <div className="flex gap-2">
                    {(['day', 'week'] as const).map(p => (
                      <label
                        key={p}
                        className={cn(
                          'flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm capitalize transition-colors',
                          retentionStep.period === p
                            ? 'border-brand bg-brand/5 text-foreground'
                            : 'border-stroke bg-background text-muted-foreground hover:bg-hover-fill',
                        )}
                      >
                        <input
                          type="radio"
                          name="retention-period"
                          value={p}
                          checked={retentionStep.period === p}
                          onChange={() =>
                            setRetentionStep(prev => (prev ? { ...prev, period: p } : prev))
                          }
                          className="hidden"
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Cohort rows</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      className="w-full text-sm border rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                      value={retentionStep.cohortCount}
                      onChange={e =>
                        setRetentionStep(prev =>
                          prev
                            ? { ...prev, cohortCount: Math.max(1, Math.min(30, Number(e.target.value) || 1)) }
                            : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Periods (cols)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      className="w-full text-sm border rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                      value={retentionStep.retentionPeriods}
                      onChange={e =>
                        setRetentionStep(prev =>
                          prev
                            ? { ...prev, retentionPeriods: Math.max(1, Math.min(30, Number(e.target.value) || 1)) }
                            : prev,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

            </>
          )}
        </BottomDialog.Page>
      )}

      {!eventsStep && !webhookStep && !funnelStep && !retentionStep && (
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
