'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Info, Cube, CaretDown } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { ALGORITHM } from '@/lib/api'
import type { Connection } from '@/types/connection'
import type { Project } from '@/types/project'
import {
  BottomDialog,
  type BottomDialogPageSlotContext,
} from '@/components/ui/Dialog'
import { HeaderSaveCancel } from './HeaderSaveCancel'
import { IntegrationGrid, type IntegrationCard } from '@/components/ui/IntegrationGrid'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const INTEGRATIONS: IntegrationCard[] = [
  { id: 'posthog', name: 'PostHog', description: 'Product analytics & event tracking' },
  { id: 'stripe', name: 'Stripe', description: 'Payments, revenue & subscriptions' },
  { id: 'calendly', name: 'Calendly', description: 'Scheduled meetings & booking links' },
  { id: 'google_analytics', name: 'Google Analytics', description: 'Website traffic & user behavior' },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Page views & traffic sources via Web Analytics',
    disabled: true,
    badge: 'In development',
  },
  { id: 'webhook', name: 'Custom Webhook', description: 'Accept POST requests from any source' },
  { id: 'sentry', name: 'Sentry', description: 'Error monitoring & performance', disabled: true, badge: 'In development' },
  { id: 'github', name: 'GitHub', description: 'Repositories, PRs & issues', disabled: true, badge: 'In development' },
  { id: 'x', name: 'X (Twitter)', description: 'Followers, posts & engagement', disabled: true, badge: 'In development' },
  { id: 'reddit', name: 'Reddit', description: 'Subreddit stats & mentions', disabled: true, badge: 'In development' },
  { id: 'gmail', name: 'Gmail', description: 'Emails & threads', disabled: true, badge: 'In development' },
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

// Form components in this file are now CONTROLLED — they own no state
// of their own. The `CreateConnectionModal` parent holds the values
// and the submit handlers, then renders `<HeaderSaveCancel>` in the
// dialog's top-right slot. This swap is what made the create-connection
// flow visually consistent with the create-view and connection-detail
// dialogs (every form-bearing bottom dialog now uses the same top-right
// save/cancel cluster).
function PostHogForm({
  apiKey,
  projectId,
  onApiKeyChange,
  onProjectIdChange,
}: {
  apiKey: string
  projectId: string
  onApiKeyChange: (v: string) => void
  onProjectIdChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Personal API Key</label>
        <Input
          placeholder="phx_xxxxxxxxxxxxxxxxxxxx"
          value={apiKey}
          onChange={e => onApiKeyChange(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Project ID</label>
        <Input
          placeholder="12345"
          value={projectId}
          onChange={e => onProjectIdChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function WebhookForm({
  name,
  onNameChange,
}: {
  name: string
  onNameChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Connection name</label>
        <Input
          placeholder="My Webhook"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          autoFocus
        />
      </div>
      <p className="text-xs text-muted-foreground">
        You'll get a unique webhook URL and API key after connecting.
      </p>
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
  name,
  apiKey,
  onNameChange,
  onApiKeyChange,
}: {
  name: string
  apiKey: string
  onNameChange: (v: string) => void
  onApiKeyChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Connection name</label>
        <Input
          placeholder="Stripe"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Restricted API Key</label>
        <Input
          placeholder="rk_live_xxxxxxxxxxxxxxxxxxxx"
          value={apiKey}
          onChange={e => onApiKeyChange(e.target.value)}
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
  )
}

function VercelTokenForm({
  token,
  onTokenChange,
}: {
  token: string
  onTokenChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Personal Access Token</label>
        <Input
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={token}
          onChange={e => onTokenChange(e.target.value)}
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
    </div>
  )
}

function VercelProjectSelectForm({
  projects,
  selectedId,
  onSelect,
}: {
  projects: { id: string; name: string }[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {projects.map(p => (
          <Button
            key={p.id}
            variant="outline"
            onClick={() => onSelect(p.id)}
            className={`w-full justify-start h-auto px-3 py-2.5 text-sm ${
              selectedId === p.id ? 'border-foreground bg-muted' : ''
            }`}
          >
            {p.name}
          </Button>
        ))}
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
    <div className="inline-flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Project
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          // Compact, content-sized trigger — full-width felt like a form
          // field; this is just a project switcher and should sit small in
          // the corner.
          className="inline-flex w-auto max-w-[280px] items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-left text-[12px] font-medium text-grey-darkest transition-colors hover:bg-muted disabled:opacity-60"
        >
          <Cube size={12} weight="bold" className="shrink-0 text-grey-dark" />
          <span className="flex-1 truncate">{label}</span>
          <CaretDown size={9} weight="bold" className="shrink-0 text-muted-foreground" />
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
  const router = useRouter()
  const [view, setView] = useState<View>('list')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [webhookCreated, setWebhookCreated] = useState<WebhookCreatedInfo | null>(null)

  // Form state lifted from each `*Form` component so the modal can render
  // a top-right Save/Cancel cluster instead of the old bottom-wide button.
  // See the `*Form` components above and the `<HeaderSaveCancel>` props
  // wired below for how each form's value+disabled state plumbs into the
  // dialog header.
  const [posthogApiKey, setPosthogApiKey] = useState('')
  const [posthogProjectId, setPosthogProjectId] = useState('')
  const [webhookName, setWebhookName] = useState('')
  const [stripeManualName, setStripeManualName] = useState('Stripe')
  const [stripeManualKey, setStripeManualKey] = useState('')
  const [vercelToken, setVercelToken] = useState('')
  const [vercelProjects, setVercelProjects] = useState<{ id: string; name: string }[]>([])
  const [vercelSelectedId, setVercelSelectedId] = useState<string>('')
  const [vercelDrainUrl, setVercelDrainUrl] = useState('')

  // Single in-flight flag per form. `submitting` covers all forms because
  // only one is visible at a time; conflating them keeps the conditional
  // rendering inside `<HeaderSaveCancel>` simple.
  const [submitting, setSubmitting] = useState(false)

  const resetFormState = () => {
    setPosthogApiKey('')
    setPosthogProjectId('')
    setWebhookName('')
    setStripeManualName('Stripe')
    setStripeManualKey('')
    setVercelToken('')
    setVercelProjects([])
    setVercelSelectedId('')
    setVercelDrainUrl('')
    setSubmitting(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      connections.closeModal()
      setView('list')
      setProjectId(null)
      setWebhookCreated(null)
      resetFormState()
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

  const handleVercelFetchProjects = async () => {
    const trimmed = vercelToken.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      const data = await ALGORITHM.getVercelProjects(trimmed)
      setVercelToken(trimmed)
      setVercelProjects(data.projects)
      setView('vercel-project-select')
    } catch {
      toast.error('Failed to fetch Vercel projects. Check your token.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVercelConnect = async () => {
    const project = vercelProjects.find(p => p.id === vercelSelectedId)
    if (!project) return
    setSubmitting(true)
    try {
      const connection = await connections.createConnection({
        name: 'Vercel',
        type: 'vercel',
        projectId, // our internal project (or null = Common)
        config: {
          apiToken: vercelToken,
          projectId: project.id,
          projectName: project.name,
        },
      })
      if (!connection) return
      const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
      setVercelDrainUrl(`${backendUrl}/webhooks/vercel/${connection.id}`)
      setView('vercel-created')
    } catch {
      toast.error('Failed to create Vercel connection.')
    } finally {
      setSubmitting(false)
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

  const handleStripeManualConnect = async () => {
    const trimmedName = stripeManualName.trim() || 'Stripe'
    const trimmedKey = stripeManualKey.trim()
    if (!trimmedKey) return
    setSubmitting(true)
    try {
      const created = await connections.createConnection({
        name: trimmedName,
        type: 'stripe_manual',
        projectId,
        config: { apiKey: trimmedKey },
      })
      connections.closeModal()
      setView('list')
      resetFormState()
      // Hop to the connections page with the picker query params. The
      // picker reads `?stripe=select-products&connectionId=…` and opens
      // itself.
      if (created) {
        router.push(
          `/hub/connections?stripe=select-products&connectionId=${created.id}`,
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePostHogConnect = async () => {
    const trimmedKey = posthogApiKey.trim()
    const trimmedProject = posthogProjectId.trim()
    if (!trimmedKey || !trimmedProject) return
    setSubmitting(true)
    try {
      await connections.createConnection({
        name: 'PostHog',
        type: 'posthog',
        projectId, // our internal project (or null = Common)
        config: { apiKey: trimmedKey, projectId: trimmedProject },
      })
      connections.closeModal()
      setView('list')
      resetFormState()
    } finally {
      setSubmitting(false)
    }
  }

  const handleWebhookConnect = async () => {
    const trimmedName = webhookName.trim() || 'Custom Webhook'
    setSubmitting(true)
    try {
      const connection = await connections.createConnection({
        name: trimmedName,
        type: 'webhook',
        projectId,
      })
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
        resetFormState()
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Project picker shows on every step where the connection hasn't been
  // created yet — i.e. everything except the final "credentials shown once"
  // pages. Pulled out so each Page can include or exclude it cleanly.
  const projectPickerEl =
    view !== 'webhook-created' && view !== 'vercel-created' ? (
      <div className="mb-4">
        <ProjectPicker
          projects={projectsCtx.projects}
          value={projectId}
          onChange={setProjectId}
        />
      </div>
    ) : null

  // Back handler from a sub-step. Manual stripe and vercel-project-select
  // step back to their parent step rather than the root list.
  const backToList = () => setView('list')
  const backToStripeChoose = () => setView('stripe-choose')
  const backToVercelToken = () => setView('vercel-token')

  // `dirty` drives the BottomDialog's "bounce on attempted dismiss" behaviour
  // — when the user has typed into a form and clicks the backdrop / hits Esc,
  // the close is intercepted and the save/cancel cluster bounces. Computed
  // per active view so we don't bounce on the picker grid or post-success
  // info pages where there's nothing to save.
  const dirty =
    (view === 'posthog' && (posthogApiKey.trim() !== '' || posthogProjectId.trim() !== '')) ||
    (view === 'stripe-manual-form' && stripeManualKey.trim() !== '') ||
    (view === 'webhook-form' && webhookName.trim() !== '') ||
    (view === 'vercel-token' && vercelToken.trim() !== '') ||
    (view === 'vercel-project-select' && vercelSelectedId !== '')

  return (
    <BottomDialog
      open={connections.isModalOpen}
      onOpenChange={handleOpenChange}
      dirty={dirty}
    >
      {view === 'list' && (
        <BottomDialog.Page title="Add a connection">
          {projectPickerEl}
          <IntegrationGrid items={INTEGRATIONS} onSelect={handleConnect} />
        </BottomDialog.Page>
      )}

      {view === 'posthog' && (
        <BottomDialog.Page
          title="PostHog"
          onBack={backToList}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handlePostHogConnect}
              onCancel={backToList}
              saving={submitting}
              disabled={!posthogApiKey.trim() || !posthogProjectId.trim()}
              bounce={ctx.bounce}
              saveLabel="Connect"
              savingLabel="Connecting…"
            />
          )}
        >
          {projectPickerEl}
          <PostHogForm
            apiKey={posthogApiKey}
            projectId={posthogProjectId}
            onApiKeyChange={setPosthogApiKey}
            onProjectIdChange={setPosthogProjectId}
          />
        </BottomDialog.Page>
      )}

      {view === 'stripe-choose' && (
        <BottomDialog.Page title="Stripe" onBack={backToList}>
          {projectPickerEl}
          <StripeChooseView
            onOAuth={handleStripeOAuth}
            onManual={() => setView('stripe-manual-form')}
          />
        </BottomDialog.Page>
      )}

      {view === 'stripe-manual-form' && (
        <BottomDialog.Page
          title="Stripe (API key)"
          pageKey="stripe-manual-form"
          onBack={backToStripeChoose}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handleStripeManualConnect}
              onCancel={backToStripeChoose}
              saving={submitting}
              disabled={!stripeManualKey.trim()}
              bounce={ctx.bounce}
              saveLabel="Connect"
              savingLabel="Connecting…"
            />
          )}
        >
          {projectPickerEl}
          <StripeManualForm
            name={stripeManualName}
            apiKey={stripeManualKey}
            onNameChange={setStripeManualName}
            onApiKeyChange={setStripeManualKey}
          />
        </BottomDialog.Page>
      )}

      {view === 'calendly-connecting' && (
        <BottomDialog.Page title="Calendly" onBack={backToList}>
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Opening Calendly authorization…</p>
          </div>
        </BottomDialog.Page>
      )}

      {view === 'google-analytics-connecting' && (
        <BottomDialog.Page title="Google Analytics" onBack={backToList}>
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Opening Google authorization…</p>
          </div>
        </BottomDialog.Page>
      )}

      {view === 'webhook-form' && (
        <BottomDialog.Page
          title="Custom Webhook"
          onBack={backToList}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handleWebhookConnect}
              onCancel={backToList}
              saving={submitting}
              // Webhook name has a sensible default ("Custom Webhook"),
              // so the form is always submittable.
              bounce={ctx.bounce}
              saveLabel="Create"
              savingLabel="Creating…"
            />
          )}
        >
          {projectPickerEl}
          <WebhookForm name={webhookName} onNameChange={setWebhookName} />
        </BottomDialog.Page>
      )}

      {view === 'webhook-created' && webhookCreated && (
        <BottomDialog.Page title="Webhook ready">
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            Save these credentials — shown once.
          </p>
          <WebhookCreatedView info={webhookCreated} onDone={() => handleOpenChange(false)} />
        </BottomDialog.Page>
      )}

      {view === 'vercel-token' && (
        <BottomDialog.Page
          title="Vercel"
          onBack={backToList}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handleVercelFetchProjects}
              onCancel={backToList}
              saving={submitting}
              disabled={!vercelToken.trim()}
              bounce={ctx.bounce}
              saveLabel="Fetch projects"
              savingLabel="Fetching…"
            />
          )}
        >
          {projectPickerEl}
          <VercelTokenForm token={vercelToken} onTokenChange={setVercelToken} />
        </BottomDialog.Page>
      )}

      {view === 'vercel-project-select' && (
        <BottomDialog.Page
          title="Vercel"
          pageKey="vercel-project-select"
          onBack={backToVercelToken}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handleVercelConnect}
              onCancel={backToVercelToken}
              saving={submitting}
              disabled={!vercelSelectedId}
              bounce={ctx.bounce}
              saveLabel="Connect"
              savingLabel="Connecting…"
            />
          )}
        >
          {projectPickerEl}
          <VercelProjectSelectForm
            projects={vercelProjects}
            selectedId={vercelSelectedId}
            onSelect={setVercelSelectedId}
          />
        </BottomDialog.Page>
      )}

      {view === 'vercel-created' && (
        <BottomDialog.Page title="Vercel" pageKey="vercel-created">
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            Set up your log drain.
          </p>
          <VercelCreatedView drainUrl={vercelDrainUrl} onDone={() => handleOpenChange(false)} />
        </BottomDialog.Page>
      )}
    </BottomDialog>
  )
}
