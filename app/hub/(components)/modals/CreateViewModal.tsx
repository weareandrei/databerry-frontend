'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  BottomDialog,
  type BottomDialogPageSlotContext,
} from '@/components/ui/Dialog'
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
  SENTRY_VIEW_OPTIONS,
  type ViewOption,
  type ViewKind,
} from '@/constants/viewOptions'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import type { Connection } from '@/types/connection'
import { ViewPickerBar } from './ViewPickerBar'
import { DisplayModePicker } from './DisplayModePicker'
import {
  ViewScopePicker,
  connectionMatchesScope,
  projectIdForScope,
  type ViewScope,
} from './ViewScopePicker'

// ── Sub-page state types ────────────────────────────────────────────────────

type EventsStep = {
  connectionId: string
  connectionName: string
  /** Display mode picked on the previous step — 'value' or 'chart'.
   *  Each selected event becomes one `daily_counter` row with this
   *  baked into `config.displayMode`. */
  displayMode: ViewKind
  events: PosthogEventDefinition[] | null
  loading: boolean
  error: string | null
}

type WebhookStep = {
  connectionId: string
  connectionName: string
  viewType: 'webhook_gauge' | 'webhook_append'
  field: string
}

type FunnelStep = {
  connectionId: string
  connectionName: string
  events: PosthogEventDefinition[] | null
  loading: boolean
  error: string | null
  steps: string[]
  conversionWindowSeconds: number
}

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

/**
 * Mode-pick sub-page state. Pushed when the user clicks a multi-mode
 * `ViewPickerBar` (e.g. Stripe Gross Volume, GA Users). Single-mode
 * picks skip this state and go straight to commit / next sub-page.
 *
 * `next` describes what to do once a mode is chosen — either commit a
 * view directly (`type: 'commit'`) or push another sub-page
 * (`type: 'events'` for PostHog daily_counter). Wrapping the commit
 * detail here keeps the sub-page agnostic of which integration / view
 * it was launched from.
 */
type DisplayModeStep = {
  viewName: string
  modes: ViewKind[]
  next:
    | {
        type: 'commit'
        connectionId: string
        connectionType: string
        viewType: string
        name: string
        baseConfig?: Record<string, unknown>
      }
    | {
        type: 'events'
        connectionId: string
        connectionName: string
      }
}

const CONVERSION_WINDOW_OPTIONS: { label: string; seconds: number }[] = [
  { label: '1 hour', seconds: 60 * 60 },
  { label: '24 hours', seconds: 60 * 60 * 24 },
  { label: '7 days', seconds: 60 * 60 * 24 * 7 },
  { label: '30 days', seconds: 60 * 60 * 24 * 30 },
]

// ── Per-integration helpers ─────────────────────────────────────────────────

/**
 * Resolve the brand-icon key for a given integration. Stripe Connect and
 * Stripe Manual share the same icon. Webhook + Calendly + GA + PostHog
 * each map to their own logo.
 */
function iconTypeForIntegration(integration: string): string {
  switch (integration) {
    case 'stripe':
    case 'stripe_manual':
      return 'stripe'
    case 'google_analytics':
      return 'google_analytics'
    case 'calendly':
      return 'calendly'
    case 'posthog':
      return 'posthog'
    case 'webhook':
      return 'webhook'
    case 'sentry':
      return 'sentry'
    case 'composite':
      return 'composite'
    default:
      return integration
  }
}

const INTEGRATION_DISPLAY_ORDER = [
  'composite',
  'stripe_manual',
  'stripe',
  'google_analytics',
  'posthog',
  'calendly',
  'sentry',
  'webhook',
]

function viewOptionsForIntegration(integration: string): ViewOption[] {
  switch (integration) {
    case 'stripe_manual':
      return STRIPE_VIEW_OPTIONS
    case 'stripe':
      // Stripe Connect has only one auto-named view; expose it here as
      // a synthetic single-mode option so the bar shows up alongside
      // the rest. (Not in viewOptions.ts because the type 'daily_revenue'
      // is unique to the Stripe Connect path.)
      return [
        {
          type: 'daily_revenue',
          name: 'Daily Revenue',
          desc: 'Stripe Connect — auto-synced daily totals',
          kind: 'chart',
          modes: ['chart'],
        },
      ]
    case 'google_analytics':
      return GA_VIEW_OPTIONS
    case 'calendly':
      return CALENDLY_VIEW_OPTIONS
    case 'posthog':
      return POSTHOG_VIEW_OPTIONS
    case 'webhook':
      return WEBHOOK_VIEW_OPTIONS
    case 'sentry':
      return SENTRY_VIEW_OPTIONS
    case 'composite':
      // Project Overview is connection-less. Expose only the chart
      // entry — picking it creates the chart+sources pair under the hood.
      return [COMPOSITE_VIEW_OPTIONS[0]]
    default:
      return []
  }
}

// ── The modal ───────────────────────────────────────────────────────────────

export function CreateViewModal() {
  const { views, connections, projects } = useDashboard()
  const [eventsStep, setEventsStep] = useState<EventsStep | null>(null)
  const [webhookStep, setWebhookStep] = useState<WebhookStep | null>(null)
  const [funnelStep, setFunnelStep] = useState<FunnelStep | null>(null)
  const [retentionStep, setRetentionStep] = useState<RetentionStep | null>(null)
  const [displayModeStep, setDisplayModeStep] = useState<DisplayModeStep | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [tracking, setTracking] = useState(false)
  // Synchronous re-entry gate paired with `tracking`. State alone
  // doesn't stop button-mash double-clicks (the disabled prop hasn't
  // propagated to the DOM by the time the second click fires); the
  // ref does. Shared across every submit handler in this modal
  // (createView / handleTrackEvents / handleCreateFunnel /
  // handleCreateRetention / handleCreateWebhookWithField) because
  // only one is ever in flight at a time — they all live on
  // mutually-exclusive sub-pages.
  const trackingRef = useRef(false)

  // Initial scope = project the modal opened from. If null (rare —
  // most paths set a project), fall back to 'all'.
  const [scope, setScope] = useState<ViewScope>(
    views.createViewProjectId
      ? { kind: 'project', projectId: views.createViewProjectId }
      : { kind: 'all' },
  )

  // Project the new view should be saved to. Derived from the dropdown
  // selection; `'all'` falls back to the original opened-from project.
  const targetProjectId = projectIdForScope(scope, views.createViewProjectId)

  // Reset scope when the modal re-opens against a different project, so
  // a user who swaps projects doesn't see stale dropdown state. Keyed
  // on `createViewProjectId` (changes when the modal is re-opened).
  // (Doing it here instead of `handleOpenChange(true)` keeps the
  // BottomDialog primitive unaware of "open" vs. "first open".)
  useEffect(() => {
    if (views.createViewProjectId) {
      setScope({ kind: 'project', projectId: views.createViewProjectId })
    } else {
      setScope({ kind: 'all' })
    }
  }, [views.createViewProjectId])

  const resetSubPages = () => {
    setEventsStep(null)
    setWebhookStep(null)
    setFunnelStep(null)
    setRetentionStep(null)
    setDisplayModeStep(null)
    setSelectedEvents(new Set())
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      views.closeModal()
      resetSubPages()
    }
  }

  // ── Filtered connections — per scope ─────────────────────────────────────
  //
  // The dropdown is the source of truth: filter connections by scope.
  // 'common' → projectId === null. 'project:X' → projectId === X.
  // 'all' → no filter (every connection visible).
  const visibleConnections = useMemo(
    () => connections.connections.filter(c => connectionMatchesScope(c, scope)),
    [connections.connections, scope],
  )

  // Group available connections by integration so we know which
  // integrations to show bars for, AND which connection to attach the
  // new view to. If multiple connections of a single integration exist,
  // we still render ONE set of bars per integration; the click handler
  // resolves the connection at action time (currently: pick the first
  // available; future: push a connection-picker sub-page if needed).
  const connectionsByIntegration = useMemo(() => {
    const map = new Map<string, Connection[]>()
    for (const conn of visibleConnections) {
      const key = conn.type
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(conn)
    }
    return map
  }, [visibleConnections])

  // ── Project Overview availability ────────────────────────────────────────
  //
  // Treat the chart + sources pair as a single thing: existence of either
  // half disables the bar in the current target project.
  const overviewAlreadyExists = views.views.some(
    v =>
      (v.type === 'project_overview' || v.type === 'project_overview_sources') &&
      v.projectId === targetProjectId &&
      (v.folderId ?? null) === (views.createViewFolderId ?? null),
  )

  // ── View creation primitives ─────────────────────────────────────────────

  const createView = async (
    body:
      | {
          connectionId: string | null
          connectionType: string
          type: string
          name: string
          config: Record<string, unknown>
        }
      | {
          connectionId: string | null
          connectionType: string
          type: string
          name: string
          config: Record<string, unknown>
        }[],
  ) => {
    const list = Array.isArray(body) ? body : [body]
    if (trackingRef.current) return
    trackingRef.current = true
    setTracking(true)
    try {
      await views.createViews(
        list.map(b => ({
          projectId: targetProjectId!,
          folderId: views.createViewFolderId,
          ...b,
          value: null,
        })),
      )
      views.closeModal()
      resetSubPages()
    } finally {
      trackingRef.current = false
      setTracking(false)
    }
  }

  const createComposite = () => {
    // Default secondary metric: 'revenue' iff Stripe is actually
    // eligible for this project, otherwise leave it off (`null` =
    // "no secondary line"). Scoping rule MIRRORS the backend's
    // `fetchStripeRevenueForProject` — Stripe (manual or Connect)
    // counts as "connected" when the connection is project-scoped
    // to THIS project OR scoped Common (project_id IS NULL, which
    // the backend includes). Without this guard, a user who never
    // connected Stripe would see the chart default to a "Revenue"
    // overlay that flatlines at $0 — confusing and noisy.
    const hasStripeForProject = connections.connections.some(
      c =>
        (c.type === 'stripe' || c.type === 'stripe_manual') &&
        (c.projectId === null || c.projectId === targetProjectId),
    )
    return createView([
      {
        connectionId: null,
        connectionType: 'composite',
        type: 'project_overview',
        name: COMPOSITE_VIEW_OPTIONS[0].name,
        config: {
          primaryMetric: 'visitors',
          secondaryMetric: hasStripeForProject ? 'revenue' : null,
        },
      },
      {
        connectionId: null,
        connectionType: 'composite',
        type: 'project_overview_sources',
        name: COMPOSITE_VIEW_OPTIONS[1].name,
        config: { sourcesLimit: 10 },
      },
    ])
  }

  // ── Click flow per ViewPickerBar ─────────────────────────────────────────

  const handlePickViewOption = async (
    integration: string,
    option: ViewOption,
  ) => {
    if (integration === 'composite') {
      createComposite()
      return
    }

    const connList = connectionsByIntegration.get(integration) ?? []
    if (connList.length === 0) return // bar should be disabled
    // For now, when multiple connections of the same integration exist,
    // attach the view to the first one (matches the current behavior of
    // the modal's per-connection rows, which exposed each separately).
    // Future iteration: push a connection-picker sub-page when count > 1.
    const conn = connList[0]

    // Webhook gauge / append → field-name sub-page (single mode each;
    // the value/list distinction is just visual, no displayMode picker).
    if (
      integration === 'webhook' &&
      (option.type === 'webhook_gauge' || option.type === 'webhook_append')
    ) {
      setWebhookStep({
        connectionId: conn.id,
        connectionName: conn.name,
        viewType: option.type,
        field: 'value',
      })
      return
    }

    // PostHog funnel / retention / users — bespoke sub-pages, each
    // single-mode so we never pre-pick a displayMode.
    if (integration === 'posthog' && option.type === 'posthog_funnel') {
      openPosthogFunnelPicker(conn.id, conn.name)
      return
    }
    if (integration === 'posthog' && option.type === 'posthog_retention') {
      openPosthogRetentionPicker(conn.id, conn.name)
      return
    }
    if (integration === 'posthog' && option.type === 'posthog_users') {
      handleCreatePosthogUsers(conn)
      return
    }

    // PostHog daily_counter — needs displayMode pick FIRST (multi-mode),
    // then the events sub-page where the user selects which event(s) to
    // track. The displayMode is held in `displayModeStep.next` and
    // baked into each created row in `handleTrackEvents`.
    if (integration === 'posthog' && option.type === 'daily_counter') {
      if (option.modes.length > 1) {
        setDisplayModeStep({
          viewName: option.name,
          modes: option.modes,
          next: {
            type: 'events',
            connectionId: conn.id,
            connectionName: conn.name,
          },
        })
      } else {
        // Hypothetical single-mode daily_counter — go straight to events.
        openPosthogEventPicker(conn.id, conn.name, option.modes[0])
      }
      return
    }

    // Multi-mode (chart vs value) but otherwise direct-create:
    // Stripe Gross Volume, GA Users / Sessions / Pageviews. Push the
    // displayMode picker; on choice, commit immediately.
    if (option.modes.length > 1) {
      setDisplayModeStep({
        viewName: option.name,
        modes: option.modes,
        next: {
          type: 'commit',
          connectionId: conn.id,
          connectionType: integration,
          viewType: option.type,
          name: option.name,
        },
      })
      return
    }

    // Single-mode → commit directly with displayMode baked in (so the
    // renderer's dispatch-on-displayMode logic works for new rows even
    // for view types that ignore it today).
    createView({
      connectionId: conn.id,
      connectionType: integration,
      type: option.type,
      name: option.name,
      config: { displayMode: option.modes[0] },
    })
  }

  const handlePickDisplayMode = (mode: ViewKind) => {
    if (!displayModeStep) return
    const { next } = displayModeStep
    if (next.type === 'commit') {
      createView({
        connectionId: next.connectionId,
        connectionType: next.connectionType,
        type: next.viewType,
        name: next.name,
        config: { ...(next.baseConfig ?? {}), displayMode: mode },
      })
      setDisplayModeStep(null)
      return
    }
    // Events flow → store the mode and fetch events.
    openPosthogEventPicker(next.connectionId, next.connectionName, mode)
    setDisplayModeStep(null)
  }

  // ── PostHog event picker ─────────────────────────────────────────────────

  const toggleEvent = (eventName: string) => {
    setSelectedEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventName)) next.delete(eventName)
      else next.add(eventName)
      return next
    })
  }

  const openPosthogEventPicker = async (
    connectionId: string,
    connectionName: string,
    displayMode: ViewKind,
  ) => {
    setEventsStep({
      connectionId,
      connectionName,
      displayMode,
      events: null,
      loading: true,
      error: null,
    })
    try {
      const events = await ALGORITHM.getPosthogEventDefinitions(connectionId)
      setEventsStep(prev => (prev ? { ...prev, events, loading: false } : prev))
    } catch (err) {
      setEventsStep(prev =>
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

  const handleTrackEvents = async () => {
    if (!eventsStep || selectedEvents.size === 0) return
    if (trackingRef.current) return
    trackingRef.current = true
    setTracking(true)
    try {
      await views.createViews(
        Array.from(selectedEvents).map(eventName => ({
          projectId: targetProjectId!,
          folderId: views.createViewFolderId,
          connectionId: eventsStep.connectionId,
          connectionType: 'posthog',
          type: 'daily_counter',
          name: eventName,
          config: {
            eventName,
            displayMode: eventsStep.displayMode,
          },
          value: null,
        })),
      )
      views.closeModal()
      resetSubPages()
    } finally {
      trackingRef.current = false
      setTracking(false)
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

  const updateFunnelStep = (idx: number, eventName: string) =>
    setFunnelStep(prev => {
      if (!prev) return prev
      const next = [...prev.steps]
      next[idx] = eventName
      return { ...prev, steps: next }
    })

  const addFunnelStep = () =>
    setFunnelStep(prev => {
      if (!prev || prev.steps.length >= 5) return prev
      return { ...prev, steps: [...prev.steps, ''] }
    })

  const removeFunnelStep = (idx: number) =>
    setFunnelStep(prev => {
      if (!prev || prev.steps.length <= 2) return prev
      return { ...prev, steps: prev.steps.filter((_, i) => i !== idx) }
    })

  const handleCreateFunnel = async () => {
    if (!funnelStep) return
    const filled = funnelStep.steps.map(s => s.trim()).filter(s => s.length > 0)
    if (filled.length < 2) return
    if (trackingRef.current) return
    trackingRef.current = true
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: targetProjectId!,
          folderId: views.createViewFolderId,
          connectionId: funnelStep.connectionId,
          connectionType: 'posthog',
          type: 'posthog_funnel',
          name: 'Funnel',
          config: {
            steps: filled.map(eventName => ({ eventName })),
            conversionWindowSeconds: funnelStep.conversionWindowSeconds,
          },
          value: null,
        },
      ])
      views.closeModal()
      resetSubPages()
    } finally {
      trackingRef.current = false
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
    if (!retentionStep) return
    if (!retentionStep.startEvent || !retentionStep.returnEvent) return
    if (trackingRef.current) return
    trackingRef.current = true
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: targetProjectId!,
          folderId: views.createViewFolderId,
          connectionId: retentionStep.connectionId,
          connectionType: 'posthog',
          type: 'posthog_retention',
          name: 'Retention',
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
      resetSubPages()
    } finally {
      trackingRef.current = false
      setTracking(false)
    }
  }

  // ── Webhook sub-page ─────────────────────────────────────────────────────

  const handleCreateWebhookWithField = async () => {
    if (!webhookStep) return
    const conn = visibleConnections.find(c => c.id === webhookStep.connectionId)
    if (!conn) return
    const opt = WEBHOOK_VIEW_OPTIONS.find(o => o.type === webhookStep.viewType)
    if (!opt) return
    if (trackingRef.current) return
    trackingRef.current = true
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: targetProjectId!,
          folderId: views.createViewFolderId,
          connectionId: webhookStep.connectionId,
          connectionType: 'webhook',
          type: webhookStep.viewType,
          name: opt.name,
          config: { field: webhookStep.field },
          value: null,
        },
      ])
      views.closeModal()
      resetSubPages()
    } finally {
      trackingRef.current = false
      setTracking(false)
    }
  }

  // ── PostHog users (no sub-page) ──────────────────────────────────────────

  const handleCreatePosthogUsers = (conn: Connection) =>
    createView({
      connectionId: conn.id,
      connectionType: 'posthog',
      type: 'posthog_users',
      name: 'Recent users',
      config: {},
    })

  // ── Build the list of integration sections ──────────────────────────────

  // Set of integration keys that should appear in the picker. Always
  // includes 'composite' (Project Overview is connection-less). Beyond
  // that, only integrations where the user has at least one connection
  // matching the current scope filter — bars without a backing
  // connection would just be permanently disabled clutter.
  const integrationKeys = useMemo(() => {
    const keys = new Set<string>(['composite'])
    for (const conn of visibleConnections) keys.add(conn.type)
    return Array.from(keys).sort((a, b) => {
      const ai = INTEGRATION_DISPLAY_ORDER.indexOf(a)
      const bi = INTEGRATION_DISPLAY_ORDER.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [visibleConnections])

  // ── `dirty` for the BottomDialog bounce-on-dismiss behavior ─────────────
  const dirty =
    (eventsStep != null && selectedEvents.size > 0) ||
    (webhookStep != null && webhookStep.field.trim() !== '') ||
    (funnelStep != null && funnelStep.steps.some(s => s.trim() !== '')) ||
    (retentionStep != null &&
      (retentionStep.startEvent !== '' || retentionStep.returnEvent !== ''))

  // Has the modal got a usable target project? If false we still render
  // the picker, but bars are disabled (we don't know where to save).
  // This is mostly defensive — every entry point sets a project.
  const canCreate = targetProjectId != null

  return (
    <BottomDialog
      open={views.isModalOpen}
      onOpenChange={handleOpenChange}
      dirty={dirty}
    >
      {/* Page priority: deepest sub-page wins. Display-mode picker sits
          above the events page so a user mid-pick of a daily_counter
          mode can back out without losing the events context. */}

      {eventsStep && (
        <BottomDialog.Page
          title={`${eventsStep.connectionName} — Event types`}
          pageKey={`events:${eventsStep.connectionId}:${eventsStep.displayMode}`}
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
            Each selected event becomes a {eventsStep.displayMode === 'chart' ? 'chart' : 'value'} tile.
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
          )}
        </BottomDialog.Page>
      )}

      {!eventsStep && webhookStep && (
        <BottomDialog.Page
          title={`${webhookStep.connectionName} — ${webhookStep.viewType === 'webhook_gauge' ? 'Gauge' : 'Timeline'}`}
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
            Pick 2–5 ordered events. We&apos;ll show how many users complete each step
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
                          ? {
                              ...prev,
                              cohortCount: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                            }
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
                          ? {
                              ...prev,
                              retentionPeriods: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                            }
                          : prev,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </BottomDialog.Page>
      )}

      {!eventsStep &&
        !webhookStep &&
        !funnelStep &&
        !retentionStep &&
        displayModeStep && (
          <BottomDialog.Page
            title="Pick display mode"
            pageKey={`displayMode:${displayModeStep.viewName}`}
            onBack={() => setDisplayModeStep(null)}
          >
            <DisplayModePicker
              viewName={displayModeStep.viewName}
              modes={displayModeStep.modes}
              onSelect={handlePickDisplayMode}
            />
          </BottomDialog.Page>
        )}

      {!eventsStep &&
        !webhookStep &&
        !funnelStep &&
        !retentionStep &&
        !displayModeStep && (
          <BottomDialog.Page
            // Title slot is replaced by the headerLeft cluster (title +
            // subheader stack). Rendering both would put the title in
            // the centered fallback slot, which doesn't compose with our
            // left-aligned header design.
            headerLeft={
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base font-semibold leading-tight">Add data view</h2>
                <p className="text-[12px] leading-snug text-muted-foreground">
                  Pick what data to track. You can change this any time.
                </p>
              </div>
            }
            // The right cluster pairs the scope picker (filter + save
            // target) with a close button. Replacing `headerRight`
            // means we lose the BottomDialog default close, so we
            // render our own — same visual treatment (round white pill
            // with X) — and route it through `views.closeModal()` so
            // the BottomDialog `onOpenChange(false)` codepath fires.
            headerRight={
              <div className="flex shrink-0 items-center gap-2">
                <ViewScopePicker
                  scope={scope}
                  onScopeChange={setScope}
                  projects={projects.projects}
                  defaultProjectId={views.createViewProjectId}
                />
                <button
                  type="button"
                  onClick={() => {
                    views.closeModal()
                    resetSubPages()
                  }}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white text-grey-darkest shadow-pill transition-colors hover:bg-hover-fill"
                  aria-label="Close"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            }
          >
            <div className="space-y-5">
              {integrationKeys.map(integration => {
                const opts = viewOptionsForIntegration(integration)
                if (opts.length === 0) return null

                const connList =
                  integration === 'composite'
                    ? []
                    : connectionsByIntegration.get(integration) ?? []
                // Composite is connection-less; everything else needs a
                // connection of the right type.
                const integrationAvailable =
                  integration === 'composite' || connList.length > 0
                if (!integrationAvailable) return null

                const sectionLabel =
                  CONNECTION_DISPLAY_NAMES[integration] ?? integration

                return (
                  <section key={integration}>
                    <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
                      {sectionLabel}
                      {integration !== 'composite' && connList.length > 1 && (
                        <span className="ml-2 normal-case font-normal text-foreground/60">
                          {connList.length} connections — saves to {connList[0].name}
                        </span>
                      )}
                    </p>
                    {/* Bar grid — column count scales with viewport so the
                        bars stay short and scannable instead of stretching
                        full-width on a 16-inch MacBook:
                          base  (mobile)        → 1 col
                          sm    (≥640 px)       → 2
                          lg    (≥1024 px)      → 3
                          xl    (≥1280 px)      → 4   ← typical 16" MacBook
                          2xl   (≥1536 px)      → 5   ← larger desktops
                        Tighter than the previous `lg:grid-cols-3` cap which
                        left every bar uncomfortably long on big screens. */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {opts.map(opt => {
                        const isOverview =
                          integration === 'composite' && opt.type === 'project_overview'
                        const disabled =
                          tracking ||
                          !canCreate ||
                          (isOverview && overviewAlreadyExists)
                        const badge =
                          isOverview && overviewAlreadyExists ? 'Added' : undefined
                        return (
                          <ViewPickerBar
                            key={`${integration}:${opt.type}`}
                            id={`${integration}:${opt.type}`}
                            iconType={iconTypeForIntegration(integration)}
                            name={opt.name}
                            description={opt.desc}
                            modes={opt.modes}
                            disabled={disabled}
                            disabledReason={
                              isOverview && overviewAlreadyExists
                                ? 'Already added to this project'
                                : undefined
                            }
                            badge={badge}
                            onSelect={() => handlePickViewOption(integration, opt)}
                          />
                        )
                      })}
                    </div>
                  </section>
                )
              })}

              {/* Empty state — no integrations match the current scope.
                  Render a soft prompt to connect a tool from inside this
                  picker. Always-rendered "+ New connection" CTA below
                  duplicates this; we surface BOTH so the empty state
                  has something to read besides the heading. */}
              {integrationKeys.length === 1 &&
                integrationKeys[0] === 'composite' && (
                  <p className="rounded-lg border border-dashed border-foreground/15 bg-card/40 px-4 py-6 text-center text-[12px] text-muted-foreground">
                    No integrations connected under this scope.
                    <br />
                    Connect one to start adding views.
                  </p>
                )}

              <div className="rounded-xl border border-dashed border-foreground/15 bg-card/40 px-4 py-4 text-center transition-colors hover:border-foreground/30 hover:bg-card">
                <p className="text-[12.5px] font-medium text-foreground">
                  Don&apos;t see what you&apos;re looking for?
                </p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  Each integration unlocks its own set of views. Connect another
                  tool to expand the picker.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    views.closeModal()
                    connections.openModal(views.createViewFolderId)
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-3 py-1.5 text-[12px] font-medium text-grey-darkest shadow-sm transition-colors hover:bg-hover-fill"
                >
                  <Plus size={12} weight="bold" />
                  New connection
                </button>
              </div>
            </div>
          </BottomDialog.Page>
        )}
    </BottomDialog>
  )
}
