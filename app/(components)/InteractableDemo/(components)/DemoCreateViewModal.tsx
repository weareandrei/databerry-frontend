'use client'

/**
 * Demo create-view modal.
 *
 * Single-page picker (matches the real `<CreateViewModal>` shape): a
 * grid of `<ViewPickerBar>` elements grouped by integration. Click a
 * bar → the demo immediately creates that view using the first
 * available connection of the matching integration type. The one
 * exception is PostHog's "Track an event", which needs an event to
 * be picked first — that bar pushes a second `BottomDialog.Page`
 * with the event grid.
 *
 * All data is mock; no API calls. Uses the same `BottomDialog`
 * primitive as the real dashboard, and now the same `ViewPickerBar`
 * picker primitive — so the demo bottom-sheet looks/feels identical
 * to what users land in after signup.
 */

import { useState } from 'react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { Button } from '@/components/ui/button'
import { ViewPickerBar } from '@/app/hub/(components)/modals/(components)/ViewPickerBar'
import { cn } from '@/lib/utils'
import { useDemoContext } from './context/DemoContext'
import type { DemoConnection } from './context/DemoContext'
import {
  MOCK_POSTHOG_EVENTS,
  MOCK_STRIPE_CHARTS,
  MOCK_CALENDLY_MEETINGS,
  MOCK_STRIPE_TOP_CUSTOMERS,
} from './demoMocks'
import {
  STRIPE_VIEW_OPTIONS,
  CALENDLY_VIEW_OPTIONS,
  POSTHOG_VIEW_OPTIONS,
  SENTRY_VIEW_OPTIONS,
  type ViewOption,
} from '@/constants/viewOptions'

// Integration groups in display order — mirrors the real
// CreateViewModal's section ordering (Stripe → PostHog → Calendly →
// Sentry). The demo doesn't surface GA/webhook/composite in this
// picker; they aren't in the demo's seed connection set.
const VIEW_GROUPS: Array<{
  integration: string
  label: string
  options: ViewOption[]
}> = [
  { integration: 'stripe_manual', label: 'Stripe',   options: STRIPE_VIEW_OPTIONS   },
  { integration: 'posthog',       label: 'PostHog',  options: POSTHOG_VIEW_OPTIONS  },
  { integration: 'calendly',      label: 'Calendly', options: CALENDLY_VIEW_OPTIONS },
  { integration: 'sentry',        label: 'Sentry',   options: SENTRY_VIEW_OPTIONS   },
]

type Step =
  | { kind: 'list' }
  | { kind: 'posthog'; conn: DemoConnection; selected: Set<string> }

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Project the new view will belong to. */
  projectId: string
  /** Folder inside that project. */
  folderId: string
}

export function DemoCreateViewModal({ open, onOpenChange, projectId, folderId }: Props) {
  const { connections, createView, dialogContainer } = useDemoContext()
  const [step, setStep] = useState<Step>({ kind: 'list' })

  function reset() {
    setStep({ kind: 'list' })
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  const backToList = () => setStep({ kind: 'list' })

  // ── Per-integration view creators ──────────────────────────────────────
  // Each takes the (auto-picked) connection plus the picked ViewOption
  // and writes the appropriate `DemoView` discriminated-union member
  // through `createView`. The shapes mirror the real backend's view
  // payloads as closely as the mock data allows.

  function createPosthogTrackedEvents(conn: DemoConnection, eventNames: string[]) {
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

  function createStripeView(conn: DemoConnection, opt: ViewOption) {
    if (opt.type === 'stripe_top_customers') {
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
      return
    }
    // For chart-capable Stripe types we look up a mock series. The
    // demo's mock map is keyed by the older `stripe_gross_week` /
    // `stripe_gross_today` view types; the real STRIPE_VIEW_OPTIONS
    // collapsed those into a polymorphic `stripe_gross`. We fall back
    // to the week series when the option matches `stripe_gross`.
    const mockKey = opt.type === 'stripe_gross' ? 'stripe_gross_week' : opt.type
    const chart = MOCK_STRIPE_CHARTS[mockKey]
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
        viewType: opt.type,
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
        viewType: opt.type,
      })
    }
  }

  function createCalendlyView(conn: DemoConnection, opt: ViewOption) {
    if (opt.type === 'calendly_meetings_list') {
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
  }

  function createSimpleValueView(conn: DemoConnection, opt: ViewOption, fallbackValue: string) {
    createView({
      kind: 'value',
      name: opt.name,
      projectId,
      folderId,
      connectionId: conn.id,
      connectionType: conn.type,
      pinned: false,
      mockValue: fallbackValue,
      viewType: opt.type,
    })
  }

  // Click handler for any bar in the grid. Auto-picks the first
  // connection of the matching integration type (same approach as
  // the real picker shows under its section header when there are
  // multiple connections: "saves to <first connection>").
  function handlePickOption(integration: string, opt: ViewOption) {
    const conn = connections.find(c => c.type === integration)
    if (!conn) return // shouldn't happen — the bar is disabled in this case

    // PostHog's "Track an event" needs an event picked first — push
    // the second page. Every other PostHog option (funnel, retention,
    // recent users) creates immediately with mock seed data.
    if (integration === 'posthog' && opt.type === 'daily_counter') {
      setStep({ kind: 'posthog', conn, selected: new Set() })
      return
    }

    if (integration === 'stripe_manual') {
      createStripeView(conn, opt)
    } else if (integration === 'calendly') {
      createCalendlyView(conn, opt)
    } else if (integration === 'sentry') {
      createSimpleValueView(conn, opt, '7')
    } else if (integration === 'posthog') {
      createSimpleValueView(conn, opt, '42')
    } else {
      createSimpleValueView(conn, opt, '42')
    }
    handleClose(false)
  }

  return (
    <BottomDialog open={open} onOpenChange={handleClose} container={dialogContainer}>
      {/* Page 1: the bar-per-view-option grid grouped by integration.
          Single page (no per-integration sub-step) — same shape as
          the real CreateViewModal's first page. */}
      {step.kind === 'list' && (
        <BottomDialog.Page title="Add a view" bodyMaxWidth="42rem">
          <div className="space-y-5">
            {VIEW_GROUPS.map(group => {
              if (group.options.length === 0) return null
              const conn = connections.find(c => c.type === group.integration)
              const integrationAvailable = !!conn
              return (
                <section key={group.integration}>
                  <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
                    {group.label}
                    {!integrationAvailable && (
                      <span className="ml-2 normal-case font-normal text-foreground/60">
                        — connect {group.label} to enable
                      </span>
                    )}
                  </p>
                  {/* Bar grid — column count mirrors the real picker's
                      responsive breakpoints, capped at 2 here because
                      the demo card is narrower than the full
                      hub-dashboard surface. */}
                  <div
                    className={cn(
                      'grid gap-2',
                      'grid-cols-1 sm:grid-cols-2',
                    )}
                  >
                    {group.options.map(opt => (
                      <ViewPickerBar
                        key={`${group.integration}:${opt.type}`}
                        id={`${group.integration}:${opt.type}`}
                        iconType={group.integration}
                        name={opt.name}
                        description={opt.desc}
                        modes={opt.modes}
                        disabled={!integrationAvailable}
                        disabledReason={
                          !integrationAvailable
                            ? `No ${group.label} connection in the demo yet`
                            : undefined
                        }
                        onSelect={() => handlePickOption(group.integration, opt)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </BottomDialog.Page>
      )}

      {/* Page 2: PostHog event picker (only the "Track an event" path
          opens this; every other view-type creates directly). */}
      {step.kind === 'posthog' && (
        <BottomDialog.Page
          title={`${step.conn.name} — Events`}
          pageKey="demo-create-view-posthog"
          onBack={backToList}
          bodyMaxWidth="42rem"
        >
          <p className="text-sm text-muted-foreground -mt-1 mb-3">
            Select events to track
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_POSTHOG_EVENTS.map(ev => {
              const isSelected = step.selected.has(ev.name)
              return (
                <div
                  key={ev.name}
                  onClick={() => {
                    const next = new Set(step.selected)
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
          <div className="pt-4 mt-4 border-t">
            <Button
              className="w-full"
              disabled={step.selected.size === 0}
              onClick={() => createPosthogTrackedEvents(step.conn, Array.from(step.selected))}
            >
              {step.selected.size === 0
                ? 'Select events to track'
                : `Track ${step.selected.size} event${step.selected.size > 1 ? 's' : ''}`}
            </Button>
          </div>
        </BottomDialog.Page>
      )}
    </BottomDialog>
  )
}
