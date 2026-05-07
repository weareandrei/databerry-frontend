'use client'

import { useState } from 'react'
import { ArrowLeft, CaretRight } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { useDemoContext } from './context/DemoContext'
import type { DemoConnection } from './context/DemoContext'
import {
  MOCK_POSTHOG_EVENTS,
  MOCK_STRIPE_CHARTS,
  MOCK_CALENDLY_MEETINGS,
  MOCK_STRIPE_TOP_CUSTOMERS,
} from './demoMocks'
import { STRIPE_VIEW_OPTIONS, CALENDLY_VIEW_OPTIONS } from '@/constants/viewOptions'

const INTEGRATIONS: { type: string; label: string; description: string }[] = [
  { type: 'stripe_manual', label: 'Stripe', description: 'Gross volume & revenue' },
  { type: 'posthog', label: 'PostHog', description: 'Product analytics & event tracking' },
  { type: 'calendly', label: 'Calendly', description: 'Scheduled meetings & booking links' },
  { type: 'github', label: 'GitHub', description: 'Repositories, PRs & issues' },
  { type: 'sentry', label: 'Sentry', description: 'Error monitoring & performance' },
]

type Step =
  | { kind: 'list' }
  | { kind: 'posthog'; conn: DemoConnection; selected: Set<string> }
  | { kind: 'stripe'; conn: DemoConnection; viewType: string | null }
  | { kind: 'calendly'; conn: DemoConnection; viewType: string | null }

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Project the new view will belong to. */
  projectId: string
  /** Folder inside that project. */
  folderId: string
}

export function DemoCreateViewModal({ open, onOpenChange, projectId, folderId }: Props) {
  const { connections, createView } = useDemoContext()
  const [step, setStep] = useState<Step>({ kind: 'list' })
  const [expandedType, setExpandedType] = useState<string | null>(null)

  function reset() {
    setStep({ kind: 'list' })
    setExpandedType(null)
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  // Construct a typed `DemoView` discriminated-union member per
  // integration. Each handler returns a payload that satisfies the
  // right `kind` variant — `createView` then assigns the `id`.

  function handleCreatePosthog(conn: DemoConnection, eventNames: string[]) {
    eventNames.forEach(name => {
      const event = MOCK_POSTHOG_EVENTS.find(e => e.name === name)
      createView({
        kind: 'value',
        name,
        projectId,
        folderId,
        connectionId: conn.id,
        connectionType: 'posthog',
        pinned: false,
        mockValue: event?.mockValue ?? '42',
      })
    })
    handleClose(false)
  }

  function handleCreateStripe(conn: DemoConnection, viewType: string) {
    const opt = STRIPE_VIEW_OPTIONS.find(o => o.type === viewType)!
    if (viewType === 'stripe_top_customers') {
      createView({
        kind: 'customers',
        name: opt.name,
        projectId,
        folderId,
        connectionId: conn.id,
        connectionType: 'stripe_manual',
        pinned: false,
        customers: MOCK_STRIPE_TOP_CUSTOMERS,
      })
    } else {
      const chart = MOCK_STRIPE_CHARTS[viewType]
      if (chart) {
        createView({
          kind: 'chart',
          name: opt.name,
          projectId,
          folderId,
          connectionId: conn.id,
          connectionType: 'stripe_manual',
          pinned: false,
          mockValue: String(chart.chartTotal),
          chartTotal: chart.chartTotal,
          chartPoints: chart.chartPoints,
          viewType,
        })
      } else {
        createView({
          kind: 'value',
          name: opt.name,
          projectId,
          folderId,
          connectionId: conn.id,
          connectionType: 'stripe_manual',
          pinned: false,
          mockValue: '192000',
          viewType,
        })
      }
    }
    handleClose(false)
  }

  function handleCreateCalendly(conn: DemoConnection, viewType: string) {
    const opt = CALENDLY_VIEW_OPTIONS.find(o => o.type === viewType)!
    if (viewType === 'calendly_meetings_list') {
      createView({
        kind: 'meetings',
        name: opt.name,
        projectId,
        folderId,
        connectionId: conn.id,
        connectionType: 'calendly',
        pinned: false,
        meetings: MOCK_CALENDLY_MEETINGS,
      })
    } else {
      createView({
        kind: 'value',
        name: opt.name,
        projectId,
        folderId,
        connectionId: conn.id,
        connectionType: 'calendly',
        pinned: false,
        mockValue: '2',
      })
    }
    handleClose(false)
  }

  function handleCreateDirect(conn: DemoConnection, connectionType: string) {
    const nameMap: Record<string, string> = { github: 'Stars', sentry: 'Open Issues' }
    const fallbackValue =
      connectionType === 'github' ? '892'
      : connectionType === 'sentry' ? '7'
      : '42'
    createView({
      kind: 'value',
      name: nameMap[connectionType] ?? conn.name,
      projectId,
      folderId,
      connectionId: conn.id,
      connectionType,
      pinned: false,
      mockValue: fallbackValue,
    })
    handleClose(false)
  }

  const renderHeader = () => {
    if (step.kind === 'posthog')
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep({ kind: 'list' })}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} weight="thin" />
          </button>
          <div>
            <DialogTitle className="text-base font-medium">{step.conn.name} — Events</DialogTitle>
            <DialogDescription>Select events to track</DialogDescription>
          </div>
        </div>
      )
    if (step.kind === 'stripe')
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep({ kind: 'list' })}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} weight="thin" />
          </button>
          <div>
            <DialogTitle className="text-base font-medium">
              {step.conn.name} — Choose a view
            </DialogTitle>
            <DialogDescription>Select which Stripe metric to display</DialogDescription>
          </div>
        </div>
      )
    if (step.kind === 'calendly')
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep({ kind: 'list' })}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} weight="thin" />
          </button>
          <div>
            <DialogTitle className="text-base font-medium">
              {step.conn.name} — Choose a view
            </DialogTitle>
            <DialogDescription>Select which Calendly data to display</DialogDescription>
          </div>
        </div>
      )
    return (
      <>
        <DialogTitle className="text-base font-medium">Add a view</DialogTitle>
        <DialogDescription>Pick a connection to display in this folder.</DialogDescription>
      </>
    )
  }

  const renderBody = () => {
    if (step.kind === 'posthog') {
      const selected = step.selected
      return (
        <div className="flex flex-col flex-1 min-h-0 mt-1">
          <div className="overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-2 pb-2">
              {MOCK_POSTHOG_EVENTS.map(ev => {
                const isSelected = selected.has(ev.name)
                return (
                  <div
                    key={ev.name}
                    onClick={() => {
                      const next = new Set(selected)
                      isSelected ? next.delete(ev.name) : next.add(ev.name)
                      setStep({ ...step, selected: next })
                    }}
                    className={cn(
                      'rounded-lg border p-3 flex flex-col gap-2 cursor-pointer transition-all select-none',
                      isSelected
                        ? 'border-foreground bg-foreground/5'
                        : 'bg-card hover:border-foreground/20',
                    )}
                  >
                    <p className="text-sm font-medium truncate">{ev.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">30d volume</span>
                      <span className="text-xs font-medium">{ev.volume.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="pt-3 border-t mt-2">
            <Button
              className="w-full"
              disabled={selected.size === 0}
              onClick={() => handleCreatePosthog(step.conn, Array.from(selected))}
            >
              {selected.size === 0
                ? 'Select events to track'
                : `Track ${selected.size} event${selected.size > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )
    }

    if (step.kind === 'stripe') {
      return (
        <div className="mt-1 space-y-3">
          {STRIPE_VIEW_OPTIONS.map(opt => (
            <div
              key={opt.type}
              onClick={() => setStep({ ...step, viewType: opt.type })}
              className={cn(
                'rounded-lg border p-3 cursor-pointer transition-all select-none',
                step.viewType === opt.type
                  ? 'border-foreground bg-foreground/5'
                  : 'hover:border-foreground/20',
              )}
            >
              <p className="text-sm font-medium">{opt.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </div>
          ))}
          <Button
            className="w-full"
            disabled={!step.viewType}
            onClick={() => step.viewType && handleCreateStripe(step.conn, step.viewType)}
          >
            Create view
          </Button>
        </div>
      )
    }

    if (step.kind === 'calendly') {
      return (
        <div className="mt-1 space-y-3">
          {CALENDLY_VIEW_OPTIONS.map(opt => (
            <div
              key={opt.type}
              onClick={() => setStep({ ...step, viewType: opt.type })}
              className={cn(
                'rounded-lg border p-3 cursor-pointer transition-all select-none',
                step.viewType === opt.type
                  ? 'border-foreground bg-foreground/5'
                  : 'hover:border-foreground/20',
              )}
            >
              <p className="text-sm font-medium">{opt.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </div>
          ))}
          <Button
            className="w-full"
            disabled={!step.viewType}
            onClick={() => step.viewType && handleCreateCalendly(step.conn, step.viewType)}
          >
            Create view
          </Button>
        </div>
      )
    }

    // Default: integration list
    return (
      <div className="mt-1">
        {INTEGRATIONS.map((integration, index) => {
          const conns = connections.filter(c => c.type === integration.type)
          const isExpanded = expandedType === integration.type
          return (
            <div key={integration.type}>
              <button
                className="w-full flex items-center justify-between py-3 hover:bg-accent/40 rounded-md px-1 -mx-1 transition-colors"
                onClick={() =>
                  setExpandedType(prev => (prev === integration.type ? null : integration.type))
                }
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
                  weight="thin"
                  className={cn(
                    'text-muted-foreground transition-transform duration-150 shrink-0',
                    isExpanded && 'rotate-90',
                  )}
                />
              </button>

              {isExpanded && (
                <div className="mb-2 ml-11 space-y-1">
                  {conns.map(conn => (
                    <div key={conn.id} className="flex items-center justify-between py-1.5">
                      <p className="text-sm">{conn.name}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (integration.type === 'posthog')
                            setStep({ kind: 'posthog', conn, selected: new Set() })
                          else if (integration.type === 'stripe_manual')
                            setStep({ kind: 'stripe', conn, viewType: null })
                          else if (integration.type === 'calendly')
                            setStep({ kind: 'calendly', conn, viewType: null })
                          else handleCreateDirect(conn, integration.type)
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {index < INTEGRATIONS.length - 1 && <Separator />}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'max-h-[80vh] flex flex-col',
          step.kind === 'posthog' ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <DialogHeader>{renderHeader()}</DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  )
}
