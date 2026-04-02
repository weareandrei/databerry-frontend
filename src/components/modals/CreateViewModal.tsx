'use client'

import { useState } from 'react'
import {
  ChartLine,
  CreditCard,
  Bug,
  GitBranch,
  XLogo,
  RedditLogo,
  EnvelopeSimple,
  CaretRight,
  ArrowLeft,
} from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ALGORITHM, type PosthogEventDefinition } from '@/lib/api'

const INTEGRATIONS = [
  {
    type: 'posthog',
    label: 'PostHog',
    description: 'Product analytics & event tracking',
    icon: ChartLine,
  },
  {
    type: 'stripe',
    label: 'Stripe',
    description: 'Payments, revenue & subscriptions',
    icon: CreditCard,
  },
  {
    type: 'sentry',
    label: 'Sentry',
    description: 'Error monitoring & performance',
    icon: Bug,
  },
  {
    type: 'github',
    label: 'GitHub',
    description: 'Repositories, PRs & issues',
    icon: GitBranch,
  },
  {
    type: 'x',
    label: 'X (Twitter)',
    description: 'Followers, posts & engagement',
    icon: XLogo,
  },
  {
    type: 'reddit',
    label: 'Reddit',
    description: 'Subreddit stats & mentions',
    icon: RedditLogo,
  },
  {
    type: 'gmail',
    label: 'Gmail',
    description: 'Emails & threads',
    icon: EnvelopeSimple,
  },
] as const

type EventsStep = {
  connectionId: string
  connectionName: string
  events: PosthogEventDefinition[] | null
  loading: boolean
  error: string | null
}

export function CreateViewModal() {
  const { views, connections } = useDashboard()
  const router = useRouter()
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [eventsStep, setEventsStep] = useState<EventsStep | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [tracking, setTracking] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      views.closeModal()
      setExpandedType(null)
      setEventsStep(null)
      setSelectedEvents(new Set())
    }
  }

  const toggleEvent = (eventName: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(eventName)) next.delete(eventName)
      else next.add(eventName)
      return next
    })
  }

  const handleTrackEvents = async () => {
    if (!eventsStep || selectedEvents.size === 0 || !views.createViewFolderId) return
    setTracking(true)
    try {
      await views.createViews(
        Array.from(selectedEvents).map((eventName) => ({
          folderId: views.createViewFolderId!,
          connectionId: eventsStep.connectionId,
          connectionType: 'posthog',
          type: 'daily_counter',
          name: eventName,
          config: { eventName },
          value: null,
        }))
      )
      views.closeModal()
      setEventsStep(null)
      setSelectedEvents(new Set())
    } finally {
      setTracking(false)
    }
  }

  const toggleExpand = (type: string) => {
    setExpandedType((prev) => (prev === type ? null : type))
  }

  const handleCreateView = async (connectionId: string, connectionName: string) => {
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

  return (
    <Dialog open={views.isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('max-h-[80vh] flex flex-col', eventsStep ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <DialogHeader>
          {eventsStep ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEventsStep(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} weight="thin" />
              </button>
              <div>
                <DialogTitle className="text-base font-medium">
                  {eventsStep.connectionName} — Event types
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  All event types ever tracked in this project
                </DialogDescription>
              </div>
            </div>
          ) : (
            <>
              <DialogTitle className="text-base font-medium">Add a view</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Pick a connection to display in this folder.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {eventsStep ? (
          <div className="flex flex-col flex-1 min-h-0 mt-1">
            <div className="overflow-y-auto flex-1">
              {eventsStep.loading && (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading events…</p>
              )}
              {eventsStep.error && (
                <p className="text-sm text-destructive py-4 text-center">{eventsStep.error}</p>
              )}
              {eventsStep.events && eventsStep.events.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No events found.</p>
              )}
              {eventsStep.events && eventsStep.events.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pb-2">
                  {eventsStep.events.map((def, i) => {
                    const isSelected = selectedEvents.has(def.name)
                    return (
                      <div
                        key={def.id ?? i}
                        onClick={() => toggleEvent(def.name)}
                        className={cn(
                          'rounded-lg border p-3 flex flex-col gap-2 cursor-pointer transition-all select-none',
                          isSelected
                            ? 'border-foreground bg-foreground/5'
                            : 'bg-card hover:border-foreground/20'
                        )}
                      >
                        <p className="text-sm font-medium truncate">{def.name}</p>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">30d volume</span>
                            <span className="text-xs font-medium">
                              {def.volume_30_day != null ? def.volume_30_day.toLocaleString() : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Last seen</span>
                            <span className="text-xs font-medium">
                              {def.last_seen_at
                                ? new Date(def.last_seen_at).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {eventsStep.events && eventsStep.events.length > 0 && (
              <div className="pt-3 border-t mt-2">
                <Button
                  className="w-full"
                  disabled={selectedEvents.size === 0 || tracking}
                  onClick={handleTrackEvents}
                >
                  {tracking
                    ? 'Tracking…'
                    : selectedEvents.size === 0
                    ? 'Select events to track'
                    : `Track ${selectedEvents.size} event${selectedEvents.size > 1 ? 's' : ''}`}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-1">
            {INTEGRATIONS.map((integration, index) => {
              const Icon = integration.icon
              const isExpanded = expandedType === integration.type
              const existingConnections = connections.getConnectionsByType(integration.type)

              return (
                <div key={integration.type}>
                  <button
                    className="w-full flex items-center justify-between py-3 hover:bg-accent/40 rounded-md px-1 -mx-1 transition-colors"
                    onClick={() => toggleExpand(integration.type)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                        <Icon size={16} weight="thin" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{integration.label}</p>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <CaretRight
                      size={14}
                      weight="thin"
                      className={cn(
                        'text-muted-foreground transition-transform duration-150 shrink-0',
                        isExpanded && 'rotate-90'
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
                            onClick={() => { views.closeModal(); router.push('/connections') }}
                          >
                            Add one first.
                          </span>
                        </p>
                      ) : (
                        existingConnections.map((conn) => (
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
                              onClick={() => handleCreateView(conn.id, conn.name)}
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
        )}
      </DialogContent>
    </Dialog>
  )
}
