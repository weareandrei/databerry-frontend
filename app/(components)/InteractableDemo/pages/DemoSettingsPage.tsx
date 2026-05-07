'use client'

/**
 * Demo settings page — three sections, all mock:
 *
 *   1. Traffic source — Auto / Google Analytics / PostHog (radio).
 *   2. Timezone        — small dropdown of common zones.
 *   3. Notifications   — three toggle rows (email / connection /
 *      Slack).
 *
 * State is purely local — flipping a toggle updates this component's
 * `useState` but never persists. That's deliberate per the demo's
 * "no backend" constraint, and is acceptable for a settings showcase
 * (the user just sees what's configurable).
 *
 * Visual style mirrors the real `/hub/settings` (white card →
 * section heading → small body copy → control). Dropdowns reuse the
 * shadcn `<Select>`-style chrome via the same `<DropdownMenu>`
 * primitive every other demo widget uses.
 */

import { useState } from 'react'
import { CaretDown, Check, Gear } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type TrafficSource = 'auto' | 'google_analytics' | 'posthog'

const TRAFFIC_OPTIONS: { value: TrafficSource; label: string; description: string }[] = [
  { value: 'auto',             label: 'Auto',              description: 'Pick GA if available, else PostHog' },
  { value: 'google_analytics', label: 'Google Analytics', description: 'Force GA4 for traffic data' },
  { value: 'posthog',          label: 'PostHog',           description: 'Force PostHog for traffic data' },
]

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
]

interface NotificationToggle {
  id: string
  label: string
  description: string
}

const NOTIFICATION_TOGGLES: NotificationToggle[] = [
  {
    id: 'weekly',
    label: 'Email me weekly summaries',
    description: 'A digest of your projects every Monday morning.',
  },
  {
    id: 'connection-broken',
    label: 'Notify me when a connection breaks',
    description: 'Get pinged immediately when an integration\'s OAuth refresh dies.',
  },
  {
    id: 'slack',
    label: 'Daily digest in Slack',
    description: 'Post yesterday\'s headline metrics to a Slack channel each morning.',
  },
]

const INITIAL_TOGGLES: Record<string, boolean> = {
  weekly: true,
  'connection-broken': true,
  slack: false,
}

export function DemoSettingsPage() {
  const [trafficSource, setTrafficSource] = useState<TrafficSource>('auto')
  const [timezone, setTimezone] = useState('UTC')
  const [toggles, setToggles] = useState<Record<string, boolean>>(INITIAL_TOGGLES)

  return (
    <div className="flex-1 overflow-y-auto bg-background p-3 pt-8 md:pt-3">
      <div className="rounded-xl border bg-card overflow-hidden shadow-card">
        {/* Header — gear pill + title + subtitle, same chrome as the
            real settings page's `<SectionHeader>`. */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b">
          <span className="flex items-center justify-center rounded-full border bg-background p-1.5 shrink-0">
            <Gear size={12} weight="thin" className="text-muted-foreground" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Settings</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Global preferences shared across every project.
            </p>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Traffic source — radio-list of the three options. */}
          <section>
            <h3 className="text-xs font-semibold text-foreground mb-1">Traffic source</h3>
            <p className="text-[11px] text-muted-foreground mb-2">
              Which connection provides the stacked visitors chart and sources list.
              When set to Auto, GA wins if available; otherwise PostHog.
            </p>
            <div className="space-y-1.5">
              {TRAFFIC_OPTIONS.map(opt => {
                const checked = trafficSource === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTrafficSource(opt.value)}
                    className={`flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${
                      checked
                        ? 'border-foreground bg-accent'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        checked
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {checked && <Check size={9} weight="bold" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Timezone — single dropdown. */}
          <section>
            <h3 className="text-xs font-semibold text-foreground mb-1">Timezone</h3>
            <p className="text-[11px] text-muted-foreground mb-2">
              Used for date ranges and the &ldquo;Now&rdquo; reference line across
              every view.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors cursor-pointer">
                <span>{timezone}</span>
                <CaretDown size={9} weight="bold" className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px] max-h-[200px] overflow-y-auto">
                {TIMEZONE_OPTIONS.map(tz => (
                  <DropdownMenuItem
                    key={tz}
                    onClick={() => setTimezone(tz)}
                    className="text-sm"
                  >
                    {tz}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </section>

          {/* Notifications — three toggles. Pure local state. */}
          <section>
            <h3 className="text-xs font-semibold text-foreground mb-1">Notifications</h3>
            <p className="text-[11px] text-muted-foreground mb-2">
              Control which proactive alerts you receive.
            </p>
            <div className="space-y-1">
              {NOTIFICATION_TOGGLES.map(t => (
                <ToggleRow
                  key={t.id}
                  label={t.label}
                  description={t.description}
                  checked={toggles[t.id]!}
                  onChange={next => setToggles(prev => ({ ...prev, [t.id]: next }))}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Tiny inline toggle, no shadcn switch primitive in the demo ────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border px-2.5 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 inline-flex h-4 w-7 items-center rounded-full transition-colors ${
          checked ? 'bg-foreground' : 'bg-muted-foreground/40'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-background transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
