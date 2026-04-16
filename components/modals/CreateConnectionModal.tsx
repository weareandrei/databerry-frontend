'use client'

import { useState } from 'react'
import { ArrowLeft, Copy, Check, Info } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/components/connections/ConnectionIcon'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { ALGORITHM } from '@/lib/api'
import type { Connection } from '@/types/connection'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

const INTEGRATIONS = [
  { type: 'posthog', label: 'PostHog', description: 'Product analytics & event tracking' },
  { type: 'stripe', label: 'Stripe', description: 'Payments, revenue & subscriptions' },
  { type: 'calendly', label: 'Calendly', description: 'Scheduled meetings & booking links' },
  { type: 'webhook', label: 'Custom Webhook', description: 'Accept POST requests from any source' },
  { type: 'sentry', label: 'Sentry', description: 'Error monitoring & performance' },
  { type: 'github', label: 'GitHub', description: 'Repositories, PRs & issues' },
  { type: 'x', label: 'X (Twitter)', description: 'Followers, posts & engagement' },
  { type: 'reddit', label: 'Reddit', description: 'Subreddit stats & mentions' },
  { type: 'gmail', label: 'Gmail', description: 'Emails & threads' },
] as const

type View =
  | 'list'
  | 'posthog'
  | 'webhook-form'
  | 'webhook-created'
  | 'stripe-choose'
  | 'stripe-manual-form'
  | 'calendly-connecting'

type WebhookCreatedInfo = {
  connection: Connection
  webhookUrl: string
  apiKey: string
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-start gap-2 bg-muted rounded-md px-3 py-2">
        <code className="flex-1 text-xs font-mono break-all leading-relaxed">{value}</code>
        <button
          onClick={copy}
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
        </button>
      </div>
    </div>
  )
}

function PostHogForm({
  onBack,
  onCancel,
  onConnect,
}: {
  onBack: () => void
  onCancel: () => void
  onConnect: (apiKey: string, projectId: string) => Promise<void>
}) {
  const [apiKey, setApiKey] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    await onConnect(apiKey, projectId)
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft size={14} weight="bold" />
        Back
      </button>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Personal API Key</label>
          <Input
            placeholder="phx_xxxxxxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Project ID</label>
          <Input
            placeholder="12345"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!apiKey.trim() || !projectId.trim() || loading}
          onClick={handleConnect}
        >
          Connect
        </Button>
      </div>
    </div>
  )
}

function WebhookForm({
  onBack,
  onCancel,
  onConnect,
}: {
  onBack: () => void
  onCancel: () => void
  onConnect: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    await onConnect(name.trim() || 'Custom Webhook')
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft size={14} weight="bold" />
        Back
      </button>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Connection name</label>
          <Input
            placeholder="My Webhook"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <p className="text-xs text-muted-foreground">
          You'll get a unique webhook URL and API key after connecting.
        </p>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={loading} onClick={handleConnect}>
          Create
        </Button>
      </div>
    </div>
  )
}

function WebhookCreatedView({ info, onDone }: { info: WebhookCreatedInfo; onDone: () => void }) {
  return (
    <div className="space-y-3">
      <CopyField label="Webhook URL" value={info.webhookUrl} />
      <CopyField label="API Key" value={info.apiKey} />
      <p className="text-xs text-muted-foreground">
        The API key is shown <span className="font-medium text-foreground">once only</span>. Send
        POSTs with <code className="bg-muted px-1 rounded">X-API-Key</code> header.
      </p>
      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}

function StripeChooseView({
  onBack,
  onCancel,
  onOAuth,
  onManual,
}: {
  onBack: () => void
  onCancel: () => void
  onOAuth: () => void
  onManual: () => void
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft size={14} weight="bold" />
        Back
      </button>

      <div className="space-y-3">
        {/* OAuth option */}
        <button
          onClick={onOAuth}
          className="w-full text-left rounded-lg border p-4 hover:border-foreground/30 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Quick setup via Stripe Connect</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                One click — redirects to Stripe to authorise access.
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span
                    className="shrink-0 mt-0.5 text-muted-foreground"
                    onClick={e => e.stopPropagation()}
                  >
                    <Info size={14} weight="bold" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-56">
                  <p className="text-xs">
                    Stripe Connect requires <code>read_write</code> scope. We only read your data
                    but cannot restrict the token further — this is a Stripe limitation, not ours.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </button>

        {/* Manual option */}
        <button
          onClick={onManual}
          className="w-full text-left rounded-lg border p-4 hover:border-foreground/30 transition-colors"
        >
          <p className="text-sm font-medium">Manual API key</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste a Stripe Restricted Key with read-only permissions. Takes ~3 minutes to set up —
            safer for privacy-conscious users.
          </p>
        </button>
      </div>

      <div className="flex justify-end mt-5">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function StripeManualForm({
  onBack,
  onCancel,
  onConnect,
}: {
  onBack: () => void
  onCancel: () => void
  onConnect: (name: string, apiKey: string) => Promise<void>
}) {
  const [name, setName] = useState('Stripe')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    await onConnect(name.trim() || 'Stripe', apiKey.trim())
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft size={14} weight="bold" />
        Back
      </button>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Connection name</label>
          <Input
            placeholder="Stripe"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Restricted API Key</label>
          <Input
            placeholder="rk_live_xxxxxxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Create a{' '}
            <a
              href="https://dashboard.stripe.com/apikeys/create"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Stripe Restricted Key
            </a>{' '}
            with read access to: Charges, Customers, Subscriptions, Balance.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={!apiKey.trim() || loading} onClick={handleConnect}>
          Connect
        </Button>
      </div>
    </div>
  )
}

export function CreateConnectionModal() {
  const { connections } = useDashboard()
  const [view, setView] = useState<View>('list')
  const [webhookCreated, setWebhookCreated] = useState<WebhookCreatedInfo | null>(null)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      connections.closeModal()
      setView('list')
      setWebhookCreated(null)
    }
  }

  const handleConnect = async (type: string) => {
    if (type === 'posthog') {
      setView('posthog')
    } else if (type === 'stripe') {
      setView('stripe-choose')
    } else if (type === 'webhook') {
      setView('webhook-form')
    } else if (type === 'calendly') {
      setView('calendly-connecting')
      handleCalendlyOAuth()
    }
  }

  const handleCalendlyOAuth = async () => {
    try {
      const data = await ALGORITHM.getCalendlyOAuthUrl()
      window.location.href = data.url
    } catch {
      toast.error('Failed to start Calendly OAuth')
      setView('list')
    }
  }

  const handleStripeOAuth = async () => {
    try {
      const data = await ALGORITHM.getStripeOAuthUrl()
      window.location.href = data.url
    } catch {
      toast.error('Failed to start Stripe OAuth')
    }
  }

  const handleStripeManualConnect = async (name: string, apiKey: string) => {
    await connections.createConnection({
      name,
      type: 'stripe_manual',
      config: { apiKey },
    })
    connections.closeModal()
    setView('list')
  }

  const handleBack = () => setView('list')

  const handleCancel = () => {
    connections.closeModal()
    setView('list')
    setWebhookCreated(null)
  }

  const handlePostHogConnect = async (apiKey: string, projectId: string) => {
    await connections.createConnection({
      name: 'PostHog',
      type: 'posthog',
      config: { apiKey, projectId },
    })
    connections.closeModal()
    setView('list')
  }

  const handleWebhookConnect = async (name: string) => {
    const connection = await connections.createConnection({ name, type: 'webhook' })
    if (!connection) return

    // Generate first API key
    try {
      const keyData = await ALGORITHM.createWebhookKey(connection.id, 'Default')
      const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
      const webhookUrl = `${backendUrl}/webhooks/custom/${connection.webhookId}`
      setWebhookCreated({ connection, webhookUrl, apiKey: keyData.key })
      setView('webhook-created')
    } catch {
      toast.error('Connection created but failed to generate API key')
      connections.closeModal()
      setView('list')
    }
  }

  const dialogTitle =
    view === 'posthog'
      ? 'Enter your PostHog credentials.'
      : view === 'stripe-choose'
        ? 'Choose how to connect Stripe.'
        : view === 'stripe-manual-form'
          ? 'Enter your Stripe API key.'
          : view === 'webhook-form'
            ? 'Create a custom webhook connection.'
            : view === 'webhook-created'
              ? 'Webhook ready'
              : view === 'calendly-connecting'
                ? 'Redirecting to Calendly…'
                : 'Connect an external service.'

  return (
    <Dialog open={connections.isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Add a connection</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {dialogTitle}
          </DialogDescription>
        </DialogHeader>

        {view === 'list' && (
          <div className="mt-1">
            {INTEGRATIONS.map((integration, index) => {
              return (
                <div key={integration.type}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <ConnectionIcon
                        type={integration.type}
                        size={24}
                        className="text-muted-foreground"
                      />
                      <div>
                        <p className="text-sm font-medium">{integration.label}</p>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(integration.type)}
                    >
                      Connect
                    </Button>
                  </div>
                  {index < INTEGRATIONS.length - 1 && <Separator />}
                </div>
              )
            })}
          </div>
        )}

        {view === 'posthog' && (
          <PostHogForm
            onBack={handleBack}
            onCancel={handleCancel}
            onConnect={handlePostHogConnect}
          />
        )}

        {view === 'stripe-choose' && (
          <StripeChooseView
            onBack={handleBack}
            onCancel={handleCancel}
            onOAuth={handleStripeOAuth}
            onManual={() => setView('stripe-manual-form')}
          />
        )}

        {view === 'stripe-manual-form' && (
          <StripeManualForm
            onBack={() => setView('stripe-choose')}
            onCancel={handleCancel}
            onConnect={handleStripeManualConnect}
          />
        )}

        {view === 'calendly-connecting' && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Opening Calendly authorization…</p>
          </div>
        )}

        {view === 'webhook-form' && (
          <WebhookForm
            onBack={handleBack}
            onCancel={handleCancel}
            onConnect={handleWebhookConnect}
          />
        )}

        {view === 'webhook-created' && webhookCreated && (
          <WebhookCreatedView info={webhookCreated} onDone={handleCancel} />
        )}
      </DialogContent>
    </Dialog>
  )
}
