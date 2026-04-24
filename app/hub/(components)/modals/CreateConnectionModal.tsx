'use client'

import { useState } from 'react'
import { Copy, Check, Info, Cube, CaretDown } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { ALGORITHM } from '@/lib/api'
import type { Connection } from '@/types/connection'
import type { Project } from '@/types/project'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

const INTEGRATIONS: {
  type: string
  label: string
  description: string
  disabled?: boolean
  note?: string
}[] = [
  { type: 'posthog', label: 'PostHog', description: 'Product analytics & event tracking' },
  { type: 'stripe', label: 'Stripe', description: 'Payments, revenue & subscriptions' },
  { type: 'calendly', label: 'Calendly', description: 'Scheduled meetings & booking links' },
  { type: 'google_analytics', label: 'Google Analytics', description: 'Website traffic & user behavior' },
  {
    type: 'vercel',
    label: 'Vercel',
    description: 'Page views & traffic sources via Web Analytics',
    disabled: true,
    note: 'In development',
  },
  { type: 'webhook', label: 'Custom Webhook', description: 'Accept POST requests from any source' },
  { type: 'sentry', label: 'Sentry', description: 'Error monitoring & performance', disabled: true, note: 'In development' },
  { type: 'github', label: 'GitHub', description: 'Repositories, PRs & issues', disabled: true, note: 'In development' },
  { type: 'x', label: 'X (Twitter)', description: 'Followers, posts & engagement', disabled: true, note: 'In development' },
  { type: 'reddit', label: 'Reddit', description: 'Subreddit stats & mentions', disabled: true, note: 'In development' },
  { type: 'gmail', label: 'Gmail', description: 'Emails & threads', disabled: true, note: 'In development' },
]

type View =
  | 'list'
  | 'posthog'
  | 'webhook-form'
  | 'webhook-created'
  | 'stripe-choose'
  | 'stripe-manual-form'
  | 'calendly-connecting'
  | 'google-analytics-connecting'
  | 'vercel-token'
  | 'vercel-project-select'
  | 'vercel-created'

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
  onConnect,
}: {
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
      <div className="flex justify-end pt-2">
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
  onConnect,
}: {
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
      <div className="flex justify-end pt-2">
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
  onOAuth,
  onManual,
}: {
  onOAuth: () => void
  onManual: () => void
}) {
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        onClick={onOAuth}
        className="w-full justify-start h-auto p-4"
      >
        <div className="flex items-start justify-between gap-2 w-full text-left">
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
      </Button>

      <Button
        variant="outline"
        onClick={onManual}
        className="w-full justify-start h-auto p-4 text-left"
      >
        <div>
          <p className="text-sm font-medium">Manual API key</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste a Stripe Restricted Key with read-only permissions. Takes ~3 minutes to set up —
            safer for privacy-conscious users.
          </p>
        </div>
      </Button>
    </div>
  )
}

function StripeManualForm({
  onConnect,
}: {
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
      <div className="flex justify-end pt-2">
        <Button size="sm" disabled={!apiKey.trim() || loading} onClick={handleConnect}>
          Connect
        </Button>
      </div>
    </div>
  )
}

function VercelTokenForm({
  onFetch,
}: {
  onFetch: (token: string) => Promise<void>
}) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFetch = async () => {
    setLoading(true)
    await onFetch(token.trim())
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Personal Access Token</label>
        <Input
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={token}
          onChange={e => setToken(e.target.value)}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Create one at{' '}
          <a
            href="https://vercel.com/account/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            vercel.com/account/tokens
          </a>
        </p>
      </div>
      <div className="flex justify-end pt-2">
        <Button size="sm" disabled={!token.trim() || loading} onClick={handleFetch}>
          {loading ? 'Fetching…' : 'Fetch projects'}
        </Button>
      </div>
    </div>
  )
}

function VercelProjectSelectForm({
  projects,
  onConnect,
}: {
  projects: { id: string; name: string }[]
  onConnect: (projectId: string, projectName: string) => Promise<void>
}) {
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    const project = projects.find(p => p.id === selected)
    if (!project) return
    setLoading(true)
    await onConnect(project.id, project.name)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {projects.map(p => (
          <Button
            key={p.id}
            variant="outline"
            onClick={() => setSelected(p.id)}
            className={`w-full justify-start h-auto px-3 py-2.5 text-sm ${
              selected === p.id ? 'border-foreground bg-muted' : ''
            }`}
          >
            {p.name}
          </Button>
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <Button size="sm" disabled={!selected || loading} onClick={handleConnect}>
          {loading ? 'Connecting…' : 'Connect'}
        </Button>
      </div>
    </div>
  )
}

function VercelCreatedView({ drainUrl, onDone }: { drainUrl: string; onDone: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add this URL as a <span className="font-medium text-foreground">Log Drain</span> in your
        Vercel project settings under{' '}
        <span className="font-medium text-foreground">Settings → Log Drains</span>.
      </p>
      <CopyField label="Drain URL" value={drainUrl} />
      <p className="text-xs text-muted-foreground">
        Set the delivery format to <code className="bg-muted px-1 rounded">JSON</code> and the
        source to <code className="bg-muted px-1 rounded">Web Analytics</code>.
      </p>
      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}

// ── Project picker ─────────────────────────────────────────────────────────

// Shows up at the top of the modal across every view. The chosen value is
// threaded into every createConnection(...) call below. Default is "Common"
// (projectId = null) — shared across every project this user owns. OAuth
// integrations (Calendly / GA / Stripe Connect) always land in Common for now
// because the OAuth redirect flow doesn't carry this value; the user can
// reassign via the always-visible button on the connection row afterwards.
function ProjectPicker({
  projects,
  value,
  onChange,
  disabled,
}: {
  projects: Project[]
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
}) {
  const selected = value ? projects.find(p => p.id === value) : null
  const label = selected?.name ?? 'Common (shared across projects)'

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Project
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className="flex w-full items-center gap-2 rounded-lg border border-stroke bg-white px-3 py-2 text-left text-[13px] font-medium text-grey-darkest hover:bg-main transition-colors cursor-pointer disabled:opacity-60"
        >
          <Cube size={14} weight="bold" className="shrink-0 text-grey-dark" />
          <span className="flex-1 truncate">{label}</span>
          <CaretDown size={10} weight="bold" className="text-muted-foreground shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width,260px)] min-w-[260px]"
        >
          <DropdownMenuItem onClick={() => onChange(null)} className="gap-2 text-sm">
            <span className="w-4 shrink-0">
              {value === null && <Check size={12} weight="bold" />}
            </span>
            <span className="flex-1">Common (shared across projects)</span>
          </DropdownMenuItem>
          {projects.length === 0 ? (
            <DropdownMenuItem disabled className="text-xs text-grey-light">
              No projects yet.
            </DropdownMenuItem>
          ) : (
            projects.map(p => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onChange(p.id)}
                className="gap-2 text-sm"
              >
                <span className="w-4 shrink-0">
                  {value === p.id && <Check size={12} weight="bold" />}
                </span>
                <Cube size={12} weight="bold" className="shrink-0 text-grey-dark" />
                <span className="flex-1 truncate">{p.name}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function CreateConnectionModal() {
  const { connections, projects: projectsCtx } = useDashboard()
  const [view, setView] = useState<View>('list')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [webhookCreated, setWebhookCreated] = useState<WebhookCreatedInfo | null>(null)
  const [vercelToken, setVercelToken] = useState('')
  const [vercelProjects, setVercelProjects] = useState<{ id: string; name: string }[]>([])
  const [vercelDrainUrl, setVercelDrainUrl] = useState('')

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      connections.closeModal()
      setView('list')
      setProjectId(null)
      setWebhookCreated(null)
      setVercelToken('')
      setVercelProjects([])
      setVercelDrainUrl('')
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
    } else if (type === 'google_analytics') {
      setView('google-analytics-connecting')
      handleGoogleAnalyticsOAuth()
    } else if (type === 'vercel') {
      setView('vercel-token')
    }
  }

  const handleVercelFetchProjects = async (token: string) => {
    try {
      const data = await ALGORITHM.getVercelProjects(token)
      setVercelToken(token)
      setVercelProjects(data.projects)
      setView('vercel-project-select')
    } catch {
      toast.error('Failed to fetch Vercel projects. Check your token.')
    }
  }

  const handleVercelConnect = async (vercelProjectId: string, projectName: string) => {
    try {
      const connection = await connections.createConnection({
        name: 'Vercel',
        type: 'vercel',
        projectId, // our internal project (or null = Common)
        config: { apiToken: vercelToken, projectId: vercelProjectId, projectName },
      })
      if (!connection) return
      const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
      setVercelDrainUrl(`${backendUrl}/webhooks/vercel/${connection.id}`)
      setView('vercel-created')
    } catch {
      toast.error('Failed to create Vercel connection.')
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

  const handleGoogleAnalyticsOAuth = async () => {
    try {
      const data = await ALGORITHM.getGoogleAnalyticsOAuthUrl()
      window.location.href = data.url
    } catch {
      toast.error('Failed to start Google Analytics OAuth')
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
      projectId,
      config: { apiKey },
    })
    connections.closeModal()
    setView('list')
  }

  const handlePostHogConnect = async (apiKey: string, phProjectId: string) => {
    await connections.createConnection({
      name: 'PostHog',
      type: 'posthog',
      projectId, // our internal project (or null = Common)
      config: { apiKey, projectId: phProjectId },
    })
    connections.closeModal()
    setView('list')
  }

  const handleWebhookConnect = async (name: string) => {
    const connection = await connections.createConnection({ name, type: 'webhook', projectId })
    if (!connection) return

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

  // ── Derived header values ─────────────────────────────────────────────────

  const headerTitle =
    view === 'list' ? 'Add a connection'
    : view === 'posthog' ? 'PostHog'
    : view === 'stripe-choose' ? 'Stripe'
    : view === 'stripe-manual-form' ? 'Stripe (API key)'
    : view === 'webhook-form' ? 'Custom Webhook'
    : view === 'webhook-created' ? 'Webhook ready'
    : view === 'calendly-connecting' ? 'Calendly'
    : view === 'google-analytics-connecting' ? 'Google Analytics'
    : view === 'vercel-token' ? 'Vercel'
    : view === 'vercel-project-select' ? 'Vercel'
    : 'Vercel'

  const headerSubtitle =
    view === 'list' ? 'Choose a service to connect'
    : view === 'posthog' ? 'Enter your PostHog credentials'
    : view === 'stripe-choose' ? 'Choose how to connect'
    : view === 'stripe-manual-form' ? 'Enter your API key'
    : view === 'webhook-form' ? 'Configure your webhook'
    : view === 'webhook-created' ? 'Save these credentials — shown once'
    : view === 'calendly-connecting' ? 'Redirecting to Calendly…'
    : view === 'google-analytics-connecting' ? 'Redirecting to Google…'
    : view === 'vercel-token' ? 'Enter your personal access token'
    : view === 'vercel-project-select' ? 'Choose a project to track'
    : 'Set up your log drain'

  const onBack: (() => void) | undefined =
    view === 'stripe-manual-form' ? () => setView('stripe-choose')
    : view === 'vercel-project-select' ? () => setView('vercel-token')
    : view !== 'list' && view !== 'webhook-created' && view !== 'vercel-created'
      ? () => setView('list')
    : undefined

  return (
    <Dialog open={connections.isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 overflow-hidden gap-0 dashboard flex flex-col max-h-[80vh] sm:max-w-md"
      >
        <DialogTitle className="sr-only">{headerTitle}</DialogTitle>
        <DialogDescription className="sr-only">{headerSubtitle}</DialogDescription>
        <SectionHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          onBack={onBack}
          onClose={() => handleOpenChange(false)}
        />

        {/* Project scope picker — visible on every view so the user always
            knows where the connection is being attached. Hidden on the final
            "created" views since the connection already exists by then. */}
        {view !== 'webhook-created' && view !== 'vercel-created' && (
          <div className="px-4 pt-4">
            <ProjectPicker
              projects={projectsCtx.projects}
              value={projectId}
              onChange={setProjectId}
            />
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-4 py-4">
          {view === 'list' && (
            <div>
              {INTEGRATIONS.map((integration, index) => (
                <div key={integration.type}>
                  <div className={`flex items-center justify-between py-3 gap-3 ${integration.disabled ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <ConnectionIcon
                        type={integration.type}
                        size={24}
                        className="text-muted-foreground shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{integration.label}</p>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                        {integration.note && (
                          <p className="text-xs text-amber-600 mt-0.5">{integration.note}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={integration.disabled}
                      onClick={() => !integration.disabled && handleConnect(integration.type)}
                    >
                      Connect
                    </Button>
                  </div>
                  {index < INTEGRATIONS.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}

          {view === 'posthog' && <PostHogForm onConnect={handlePostHogConnect} />}

          {view === 'stripe-choose' && (
            <StripeChooseView
              onOAuth={handleStripeOAuth}
              onManual={() => setView('stripe-manual-form')}
            />
          )}

          {view === 'stripe-manual-form' && (
            <StripeManualForm onConnect={handleStripeManualConnect} />
          )}

          {view === 'calendly-connecting' && (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Opening Calendly authorization…</p>
            </div>
          )}

          {view === 'google-analytics-connecting' && (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Opening Google authorization…</p>
            </div>
          )}

          {view === 'webhook-form' && <WebhookForm onConnect={handleWebhookConnect} />}

          {view === 'webhook-created' && webhookCreated && (
            <WebhookCreatedView info={webhookCreated} onDone={() => handleOpenChange(false)} />
          )}

          {view === 'vercel-token' && (
            <VercelTokenForm onFetch={handleVercelFetchProjects} />
          )}

          {view === 'vercel-project-select' && (
            <VercelProjectSelectForm
              projects={vercelProjects}
              onConnect={handleVercelConnect}
            />
          )}

          {view === 'vercel-created' && (
            <VercelCreatedView drainUrl={vercelDrainUrl} onDone={() => handleOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
