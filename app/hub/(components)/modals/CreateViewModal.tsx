'use client'

import { useState } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { useDashboard } from '@/contexts/DashboardContext'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ALGORITHM, type PosthogEventDefinition } from '@/lib/api'
import { STRIPE_VIEW_OPTIONS, CALENDLY_VIEW_OPTIONS, GA_VIEW_OPTIONS, VERCEL_VIEW_OPTIONS } from '@/constants/viewOptions'

const INTEGRATIONS = [
  { type: 'posthog', label: 'PostHog', description: 'Product analytics & event tracking' },
  {
    type: 'stripe',
    label: 'Stripe (Connect)',
    description: 'OAuth — payments, revenue & subscriptions',
  },
  {
    type: 'stripe_manual',
    label: 'Stripe (API key)',
    description: 'Manual key — gross volume & revenue',
  },
  { type: 'calendly', label: 'Calendly', description: 'Scheduled meetings & booking links' },
  { type: 'google_analytics', label: 'Google Analytics', description: 'Website traffic & user behavior' },
  { type: 'webhook', label: 'Custom Webhook', description: 'Accept POST requests from any source' },
  { type: 'sentry', label: 'Sentry', description: 'Error monitoring & performance' },
  { type: 'github', label: 'GitHub', description: 'Repositories, PRs & issues' },
  { type: 'x', label: 'X (Twitter)', description: 'Followers, posts & engagement' },
  { type: 'reddit', label: 'Reddit', description: 'Subreddit stats & mentions' },
  { type: 'gmail', label: 'Gmail', description: 'Emails & threads' },
] as const

type EventsStep = {
  connectionId: string
  connectionName: string
  events: PosthogEventDefinition[] | null
  loading: boolean
  error: string | null
}

type WebhookStep = {
  connectionId: string
  connectionName: string
  viewType: 'webhook_counter' | 'webhook_gauge' | 'webhook_append' | null
  field: string
}

type StripeManualStep = {
  connectionId: string
  connectionName: string
  viewType: 'stripe_gross' | 'stripe_revenue_today' | null
}

type CalendlyStep = {
  connectionId: string
  connectionName: string
  viewType: 'calendly_meetings_today' | 'calendly_meetings_list' | null
}

type GAStep = {
  connectionId: string
  connectionName: string
  viewType: 'ga_active_users' | 'ga_users_today' | 'ga_sessions_today' | 'ga_pageviews_today' | null
}

type VercelStep = {
  connectionId: string
  connectionName: string
  viewType: 'vercel_pageviews_today' | 'vercel_pageviews_week' | 'vercel_sources' | null
}

// ── Shared sub-components ─────────────────────────────────────────────────

interface ViewTypeOption {
  type: string
  name: string
  desc: string
}

function ViewTypePicker({
  options,
  selectedType,
  tracking,
  onSelect,
  onCreate,
}: {
  options: ViewTypeOption[]
  selectedType: string | null
  tracking: boolean
  onSelect: (type: string) => void
  onCreate: () => void
}) {
  return (
    <div className="mt-1 space-y-3">
      {options.map(opt => (
        <div
          key={opt.type}
          onClick={() => onSelect(opt.type)}
          className={cn(
            'rounded-lg border p-3 cursor-pointer transition-all select-none',
            selectedType === opt.type
              ? 'border-foreground bg-foreground/5'
              : 'hover:border-foreground/20',
          )}
        >
          <p className="text-sm font-medium">{opt.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
        </div>
      ))}
      <div className="pt-1">
        <Button
          className="w-full"
          disabled={!selectedType || tracking}
          onClick={onCreate}
        >
          {tracking ? 'Creating…' : 'Create view'}
        </Button>
      </div>
    </div>
  )
}

export function CreateViewModal() {
  const { views, connections } = useDashboard()
  const router = useRouter()
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [eventsStep, setEventsStep] = useState<EventsStep | null>(null)
  const [webhookStep, setWebhookStep] = useState<WebhookStep | null>(null)
  const [stripeManualStep, setStripeManualStep] = useState<StripeManualStep | null>(null)
  const [calendlyStep, setCalendlyStep] = useState<CalendlyStep | null>(null)
  const [gaStep, setGaStep] = useState<GAStep | null>(null)
  const [vercelStep, setVercelStep] = useState<VercelStep | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [tracking, setTracking] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      views.closeModal()
      setExpandedType(null)
      setEventsStep(null)
      setWebhookStep(null)
      setStripeManualStep(null)
      setCalendlyStep(null)
      setGaStep(null)
      setVercelStep(null)
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

  const toggleExpand = (type: string) => {
    setExpandedType(prev => (prev === type ? null : type))
  }

  // PostHog — fetches event list then transitions to eventsStep view
  const handleCreatePosthogView = async (connectionId: string, connectionName: string) => {
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

  // Stripe Connect — creates a single daily_revenue view immediately
  const handleCreateStripeView = async (connectionId: string, folderId: string | null) => {
    if (!views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId,
          connectionId,
          connectionType: 'stripe',
          type: 'daily_revenue',
          name: 'Daily Revenue',
          config: {},
          value: null,
        },
      ])
      views.closeModal()
    } finally {
      setTracking(false)
    }
  }

  // Stripe Manual — create the selected view type
  const handleCreateStripeManualView = async (
    connectionId: string,
    folderId: string | null,
    type: NonNullable<StripeManualStep['viewType']>,
    name: string,
  ) => {
    if (!views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId,
          connectionId,
          connectionType: 'stripe_manual',
          type,
          name,
          config: {},
          value: null,
        },
      ])
      views.closeModal()
      setStripeManualStep(null)
    } finally {
      setTracking(false)
    }
  }

  // Calendly — create the selected view type
  const handleCreateCalendlyView = async (
    connectionId: string,
    folderId: string | null,
    type: NonNullable<CalendlyStep['viewType']>,
    name: string,
  ) => {
    if (!views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId,
          connectionId,
          connectionType: 'calendly',
          type,
          name,
          config: {},
          value: null,
        },
      ])
      views.closeModal()
      setCalendlyStep(null)
    } finally {
      setTracking(false)
    }
  }

  // Google Analytics — create the selected view type
  const handleCreateGAView = async (
    connectionId: string,
    folderId: string | null,
    type: NonNullable<GAStep['viewType']>,
    name: string,
  ) => {
    if (!views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId,
          connectionId,
          connectionType: 'google_analytics',
          type,
          name,
          config: {},
          value: null,
        },
      ])
      views.closeModal()
      setGaStep(null)
    } finally {
      setTracking(false)
    }
  }

  // Vercel — create the selected view type
  const handleCreateVercelView = async (
    connectionId: string,
    folderId: string | null,
    type: NonNullable<VercelStep['viewType']>,
    name: string,
  ) => {
    if (!views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId,
          connectionId,
          connectionType: 'vercel',
          type,
          name,
          config: {},
          value: null,
        },
      ])
      views.closeModal()
      setVercelStep(null)
    } finally {
      setTracking(false)
    }
  }

  // Composite Overview — creates BOTH the chart and the sources views in one call.
  // They're independent DB rows so the user can later remove one without the other.
  const handleCreateOverviewView = async () => {
    if (!views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId: views.createViewFolderId,
          connectionId: null,
          connectionType: 'composite',
          type: 'project_overview',
          name: 'Overview',
          config: { primaryMetric: 'visitors', secondaryMetric: null },
          value: null,
        },
        {
          projectId: views.createViewProjectId,
          folderId: views.createViewFolderId,
          connectionId: null,
          connectionType: 'composite',
          type: 'project_overview_sources',
          name: 'Sources',
          config: { sourcesLimit: 10 },
          value: null,
        },
      ])
      views.closeModal()
    } finally {
      setTracking(false)
    }
  }

  // Detect existing overview at the target location (best effort — relies on Redux cache).
  // We consider the overview "present" when either half exists; picking the tile again
  // when only one half is missing would duplicate the other, so the user should re-add
  // the missing half individually (not supported in v1 — deletion removes one; this
  // tile is an all-or-nothing shortcut).
  const overviewAlreadyExists = views.views.some(
    v =>
      (v.type === 'project_overview' || v.type === 'project_overview_sources') &&
      v.projectId === views.createViewProjectId &&
      (v.folderId ?? null) === (views.createViewFolderId ?? null),
  )

  // Webhook — create the selected webhook view type
  const handleCreateWebhookView = async (
    connectionId: string,
    folderId: string | null,
    type: 'webhook_counter' | 'webhook_gauge' | 'webhook_append',
    name: string,
    field?: string,
  ) => {
    if (!views.createViewProjectId) return
    setTracking(true)
    try {
      await views.createViews([
        {
          projectId: views.createViewProjectId,
          folderId,
          connectionId,
          connectionType: 'webhook',
          type,
          name,
          config: field ? { field } : {},
          value: null,
        },
      ])
      views.closeModal()
    } finally {
      setTracking(false)
    }
  }

  // ── Body ─────────────────────────────────────────────────────────────────

  const renderBody = () => {
    // PostHog events picker — full-layout with section-wrapper style header
    if (eventsStep) {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-4 py-4">
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
            )}
          </div>

          {/* Footer button */}
          {eventsStep.events && eventsStep.events.length > 0 && (
            <div className="px-4 py-3 border-t border-stroke shrink-0">
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
          )}
        </div>
      )
    }

    // Stripe Manual — view type picker
    if (stripeManualStep) {
      const nameMap: Record<string, string> = {
        stripe_gross: 'Gross Volume',
        stripe_revenue_today: 'Total Gross Revenue',
      }
      return (
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <ViewTypePicker
            options={STRIPE_VIEW_OPTIONS}
            selectedType={stripeManualStep.viewType}
            tracking={tracking}
            onSelect={type => setStripeManualStep({ ...stripeManualStep, viewType: type as StripeManualStep['viewType'] })}
            onCreate={() => {
              if (!stripeManualStep.viewType) return
              handleCreateStripeManualView(
                stripeManualStep.connectionId,
                views.createViewFolderId,
                stripeManualStep.viewType,
                nameMap[stripeManualStep.viewType],
              )
            }}
          />
        </div>
      )
    }

    // Calendly — view type picker
    if (calendlyStep) {
      const nameMap: Record<string, string> = {
        calendly_meetings_today: 'Meetings',
        calendly_meetings_list: 'Meetings list',
      }
      return (
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <ViewTypePicker
            options={CALENDLY_VIEW_OPTIONS}
            selectedType={calendlyStep.viewType}
            tracking={tracking}
            onSelect={type => setCalendlyStep({ ...calendlyStep, viewType: type as CalendlyStep['viewType'] })}
            onCreate={() => {
              if (!calendlyStep.viewType) return
              handleCreateCalendlyView(
                calendlyStep.connectionId,
                views.createViewFolderId,
                calendlyStep.viewType,
                nameMap[calendlyStep.viewType],
              )
            }}
          />
        </div>
      )
    }

    // Google Analytics — view type picker
    if (gaStep) {
      const nameMap: Record<string, string> = {
        ga_active_users: 'Active Users Right Now',
        ga_users_today: 'Users',
        ga_sessions_today: 'Sessions',
        ga_pageviews_today: 'Pageviews',
      }
      return (
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <ViewTypePicker
            options={GA_VIEW_OPTIONS}
            selectedType={gaStep.viewType}
            tracking={tracking}
            onSelect={type => setGaStep({ ...gaStep, viewType: type as GAStep['viewType'] })}
            onCreate={() => {
              if (!gaStep.viewType) return
              handleCreateGAView(
                gaStep.connectionId,
                views.createViewFolderId,
                gaStep.viewType,
                nameMap[gaStep.viewType],
              )
            }}
          />
        </div>
      )
    }

    // Vercel — view type picker
    if (vercelStep) {
      const nameMap: Record<string, string> = {
        vercel_pageviews_today: 'Pageviews Today',
        vercel_pageviews_week: 'Pageviews This Week',
        vercel_sources: 'Traffic Sources',
      }
      return (
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <ViewTypePicker
            options={VERCEL_VIEW_OPTIONS}
            selectedType={vercelStep.viewType}
            tracking={tracking}
            onSelect={type => setVercelStep({ ...vercelStep, viewType: type as VercelStep['viewType'] })}
            onCreate={() => {
              if (!vercelStep.viewType) return
              handleCreateVercelView(
                vercelStep.connectionId,
                views.createViewFolderId,
                vercelStep.viewType,
                nameMap[vercelStep.viewType],
              )
            }}
          />
        </div>
      )
    }

    // Webhook — view type picker
    if (webhookStep) {
      return (
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <div className="space-y-3">
          {(['webhook_counter', 'webhook_gauge', 'webhook_append'] as const).map(type => {
            const labels: Record<string, { name: string; desc: string }> = {
              webhook_counter: { name: 'Event Counter', desc: 'Increments by +1 on every POST' },
              webhook_gauge: { name: 'Gauge', desc: 'Replaces value on every POST' },
              webhook_append: { name: 'Timeline', desc: 'Appends a new entry on every POST' },
            }
            const selected = webhookStep.viewType === type
            return (
              <div
                key={type}
                onClick={() => setWebhookStep({ ...webhookStep, viewType: type })}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition-all select-none',
                  selected ? 'border-foreground bg-foreground/5' : 'hover:border-foreground/20',
                )}
              >
                <p className="text-sm font-medium">{labels[type].name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{labels[type].desc}</p>
              </div>
            )
          })}

          {webhookStep.viewType && webhookStep.viewType !== 'webhook_counter' && (
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
          )}

          <div className="pt-1">
            <Button
              className="w-full"
              disabled={!webhookStep.viewType || tracking}
              onClick={() => {
                if (!webhookStep.viewType) return
                const nameMap: Record<string, string> = {
                  webhook_counter: 'Event Counter',
                  webhook_gauge: 'Gauge',
                  webhook_append: 'Timeline',
                }
                handleCreateWebhookView(
                  webhookStep.connectionId,
                  views.createViewFolderId,
                  webhookStep.viewType,
                  nameMap[webhookStep.viewType],
                  webhookStep.viewType !== 'webhook_counter' ? webhookStep.field : undefined,
                )
              }}
            >
              {tracking ? 'Creating…' : 'Create view'}
            </Button>
          </div>
          </div>
        </div>
      )
    }

    // Default — integration list (Overview tile pinned on top)
    return (
      <div className="overflow-y-auto flex-1 px-4 py-4">
        {/* Composite "Overview" tile */}
        <button
          disabled={tracking || overviewAlreadyExists}
          onClick={() => handleCreateOverviewView()}
          className={cn(
            'w-full flex items-center justify-between gap-3 py-3 px-1 -mx-1 rounded-md transition-colors mb-2',
            overviewAlreadyExists
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-accent/40 cursor-pointer',
          )}
          title={overviewAlreadyExists ? 'An overview already exists here' : undefined}
        >
          <div className="flex items-center gap-3">
            <ConnectionIcon type="composite" size={24} className="text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm font-medium">Project Overview</p>
              <p className="text-xs text-muted-foreground">
                {overviewAlreadyExists
                  ? 'Already added at this location'
                  : 'Adds a stacked visitors chart and a sources breakdown as two views'}
              </p>
            </div>
          </div>
          {!overviewAlreadyExists && (
            <span className="text-xs font-medium text-muted-foreground">
              {tracking ? 'Creating…' : 'Add'}
            </span>
          )}
        </button>
        <Separator className="mb-1" />
        {INTEGRATIONS.map((integration, index) => {
          const isExpanded = expandedType === integration.type
          const existingConnections = connections.getConnectionsByType(integration.type)

          return (
            <div key={integration.type}>
              <button
                className="w-full flex items-center justify-between py-3 hover:bg-accent/40 rounded-md px-1 -mx-1 transition-colors"
                onClick={() => toggleExpand(integration.type)}
              >
                <div className="flex items-center gap-3">
                  <ConnectionIcon
                    type={integration.type}
                    size={24}
                    className="text-muted-foreground"
                  />
                  <div className="text-left">
                    <p className="text-sm font-medium">{integration.label}</p>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                <CaretRight
                  size={14}
                  weight="bold"
                  className={cn(
                    'text-muted-foreground transition-transform duration-150 shrink-0',
                    isExpanded && 'rotate-90',
                  )}
                />
              </button>

              {isExpanded && (
                <div className="mb-2 ml-11 space-y-1">
                  {existingConnections.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No connections yet.{' '}
                      <span
                        className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                          views.closeModal()
                          router.push('/hub/connections')
                        }}
                      >
                        Add one first.
                      </span>
                    </p>
                  ) : (
                    existingConnections.map(conn => (
                      <div key={conn.id} className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-sm">{conn.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(conn.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={tracking}
                          onClick={() => {
                            if (integration.type === 'stripe') {
                              handleCreateStripeView(conn.id, views.createViewFolderId)
                            } else if (integration.type === 'stripe_manual') {
                              setStripeManualStep({
                                connectionId: conn.id,
                                connectionName: conn.name,
                                viewType: null,
                              })
                            } else if (integration.type === 'calendly') {
                              setCalendlyStep({
                                connectionId: conn.id,
                                connectionName: conn.name,
                                viewType: null,
                              })
                            } else if (integration.type === 'google_analytics') {
                              setGaStep({
                                connectionId: conn.id,
                                connectionName: conn.name,
                                viewType: null,
                              })
                            } else if (integration.type === 'webhook') {
                              setWebhookStep({
                                connectionId: conn.id,
                                connectionName: conn.name,
                                viewType: null,
                                field: 'value',
                              })
                            } else {
                              handleCreatePosthogView(conn.id, conn.name)
                            }
                          }}
                        >
                          Create view
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {index < INTEGRATIONS.length - 1 && <Separator />}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Derived header values ────────────────────────────────────────────────

  const headerTitle = eventsStep
    ? `${eventsStep.connectionName} — Event types`
    : stripeManualStep
      ? stripeManualStep.connectionName
      : calendlyStep
        ? calendlyStep.connectionName
        : gaStep
          ? gaStep.connectionName
          : vercelStep
            ? vercelStep.connectionName
            : webhookStep
              ? webhookStep.connectionName
              : 'Add a view'

  const headerSubtitle = eventsStep
    ? 'All event types ever tracked in this project'
    : stripeManualStep || calendlyStep || gaStep || vercelStep || webhookStep
      ? 'Select a view type'
      : 'Choose a connection to create a view'

  const onBack: (() => void) | null = eventsStep
    ? () => setEventsStep(null)
    : stripeManualStep
      ? () => setStripeManualStep(null)
      : calendlyStep
        ? () => setCalendlyStep(null)
        : gaStep
          ? () => setGaStep(null)
          : vercelStep
            ? () => setVercelStep(null)
            : webhookStep
              ? () => setWebhookStep(null)
              : null

  return (
    <Dialog open={views.isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'p-0 overflow-hidden gap-0 dashboard flex flex-col max-h-[80vh]',
          eventsStep ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <DialogTitle className="sr-only">{headerTitle}</DialogTitle>
        <DialogDescription className="sr-only">{headerSubtitle}</DialogDescription>
        <SectionHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          onBack={onBack ?? undefined}
          onClose={() => handleOpenChange(false)}
        />
        {renderBody()}
      </DialogContent>
    </Dialog>
  )
}
