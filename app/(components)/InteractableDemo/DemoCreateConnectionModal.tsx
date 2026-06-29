'use client'

/**
 * Demo create-connection modal.
 *
 * Mirrors the real `<CreateConnectionModal>` flow as far as it can
 * WITHOUT performing a real connection:
 *
 *   1. Pick an integration from the grid.
 *   2. Land on that integration's REAL setup form — the same
 *      `<PostHogForm>` / `<StripeManualForm>` / `<WebhookForm>`
 *      (or an OAuth-instructions card) the live app renders, with all
 *      the "create an API key with these scopes / paste it here"
 *      instructions intact. The visitor can read the process and fill
 *      the fields.
 *   3. Clicking **Connect** does NOT create anything — it surfaces an
 *      inline "demo only" note. The flow deliberately stops one step
 *      before a real connection is made.
 *
 * The forms are imported straight from the shared
 * `components/connections/ConnectionForms` — they're fully controlled
 * (value + onChange props, no backend/context coupling), so the demo
 * holds the field state locally and feeds them the same way the real
 * modal does. No OAuth, no API calls, no `createConnection`.
 */

import { useState } from 'react'
import { Warning } from '@phosphor-icons/react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { Button } from '@/components/ui/button'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import {
  PostHogForm,
  StripeManualForm,
  WebhookForm,
  PrerequisitesCard,
  SetupStep,
} from '@/components/connections/ConnectionForms'
import { POSTHOG_HOSTS } from '@/lib/connections/connectionFlows'
import { cn } from '@/lib/utils'
import { useDemoContext } from './context/DemoContext'

type Flow = 'posthog' | 'stripe' | 'webhook' | 'oauth'

interface IntegrationOption {
  type: string
  label: string
  description: string
  flow: Flow
}

// Aligned with the real modal's enabled integrations. `type` doubles
// as the `<ConnectionIcon>` key; `flow` picks which setup form renders
// in step 2.
const INTEGRATIONS: IntegrationOption[] = [
  { type: 'posthog',          label: 'PostHog',          description: 'Product analytics & event tracking', flow: 'posthog' },
  { type: 'stripe_manual',    label: 'Stripe',           description: 'Payments, revenue & subscriptions',  flow: 'stripe' },
  { type: 'calendly',         label: 'Calendly',         description: 'Scheduled meetings & booking links', flow: 'oauth' },
  { type: 'google_analytics', label: 'Google Analytics', description: 'Website traffic & user behavior',    flow: 'oauth' },
  { type: 'sentry',           label: 'Sentry',           description: 'Error monitoring & issues',           flow: 'oauth' },
  { type: 'webhook',          label: 'Custom Webhook',   description: 'Accept POST requests from any source', flow: 'webhook' },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

/** OAuth integrations have no form — show what authorizing will do. */
function OAuthInstructions({ label }: { label: string }) {
  return (
    <div className="space-y-6 max-w-md">
      <PrerequisitesCard
        items={[
          `You have a ${label} account`,
          `You're an admin who can authorize access on it`,
        ]}
      />
      <SetupStep n={1} title={`Authorize Databerry to read your ${label} data`}>
        <p className="text-sm text-grey-dark">
          Clicking <span className="font-semibold">Connect</span> opens{' '}
          {label}&apos;s secure authorization screen in a new tab. Databerry
          only ever <span className="font-semibold">reads</span> — it never
          writes anything back to your {label} account.
        </p>
      </SetupStep>
    </div>
  )
}

export function DemoCreateConnectionModal({ open, onOpenChange }: Props) {
  const { dialogContainer } = useDemoContext()
  const [picked, setPicked] = useState<IntegrationOption | null>(null)
  // Set when the visitor hits Connect — the demo's "we won't actually
  // connect" acknowledgement. Reset whenever they change integration.
  const [demoNoteShown, setDemoNoteShown] = useState(false)

  // Field state for the controlled forms (held here exactly as the real
  // modal holds it). None of it is ever submitted anywhere.
  const [posthogApiKey, setPosthogApiKey] = useState('')
  const [posthogHost, setPosthogHost] = useState<string>(POSTHOG_HOSTS[0].id)
  const [stripeName, setStripeName] = useState('Stripe')
  const [stripeKey, setStripeKey] = useState('')
  const [webhookName, setWebhookName] = useState('')

  function resetAll() {
    setPicked(null)
    setDemoNoteShown(false)
    setPosthogApiKey('')
    setPosthogHost(POSTHOG_HOSTS[0].id)
    setStripeName('Stripe')
    setStripeKey('')
    setWebhookName('')
  }

  function handleClose(v: boolean) {
    if (!v) resetAll()
    onOpenChange(v)
  }

  // Step back to the integration grid — clear the just-filled form so
  // re-entering a flow starts clean.
  function backToList() {
    setPicked(null)
    setDemoNoteShown(false)
    setPosthogApiKey('')
    setStripeKey('')
    setWebhookName('')
  }

  // The whole point: Connect does NOT connect. Acknowledge the click
  // with an inline note and stop here.
  function handleFakeConnect() {
    setDemoNoteShown(true)
  }

  return (
    <BottomDialog open={open} onOpenChange={handleClose} container={dialogContainer}>
      {/* ── Step 1 · pick an integration ───────────────────────────── */}
      {!picked && (
        <BottomDialog.Page title="Add a connection" bodyMaxWidth="42rem">
          <p className="text-sm text-muted-foreground -mt-1 mb-4">
            Pick an integration to see how connecting it works.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {INTEGRATIONS.map(int => (
              <button
                key={int.type}
                type="button"
                onClick={() => {
                  setPicked(int)
                  setDemoNoteShown(false)
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors cursor-pointer bg-card hover:border-foreground/20',
                )}
              >
                <ConnectionIcon type={int.type} size={20} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{int.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {int.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </BottomDialog.Page>
      )}

      {/* ── Step 2 · the real setup form (no real connect) ─────────── */}
      {picked && (
        <BottomDialog.Page
          title={picked.label}
          titleIcon={<ConnectionIcon type={picked.type} size={22} />}
          pageKey={`connection-${picked.type}`}
          onBack={backToList}
          bodyMaxWidth="42rem"
        >
          {picked.flow === 'posthog' && (
            <PostHogForm
              apiKey={posthogApiKey}
              host={posthogHost}
              error={null}
              onApiKeyChange={setPosthogApiKey}
              onHostChange={setPosthogHost}
            />
          )}
          {picked.flow === 'stripe' && (
            <StripeManualForm
              name={stripeName}
              apiKey={stripeKey}
              error={null}
              onNameChange={setStripeName}
              onApiKeyChange={setStripeKey}
            />
          )}
          {picked.flow === 'webhook' && (
            <WebhookForm
              name={webhookName}
              error={null}
              onNameChange={setWebhookName}
            />
          )}
          {picked.flow === 'oauth' && <OAuthInstructions label={picked.label} />}

          {/* Inline "demo only" acknowledgement — appears after Connect. */}
          {demoNoteShown && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 max-w-md">
              <Warning size={14} weight="bold" className="text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-900">
                This is a demo — we won&apos;t actually connect your account.
                Sign up to link {picked.label} for real.
              </p>
            </div>
          )}

          {/* Action row. Connect intentionally stops short of a real
              connection (see `handleFakeConnect`). */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleFakeConnect}>
              {picked.flow === 'webhook' ? 'Create' : 'Connect'}
            </Button>
          </div>
        </BottomDialog.Page>
      )}
    </BottomDialog>
  )
}
