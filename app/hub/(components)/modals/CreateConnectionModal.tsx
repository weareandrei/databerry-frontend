'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Info, Cube, CaretDown } from '@phosphor-icons/react'
import { InlineErrorBanner } from './InlineErrorBanner'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { ALGORITHM } from '@/lib/api'
import type { Connection, ConnectionType } from '@/types/connection'
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
  { id: 'sentry', name: 'Sentry', description: 'Error monitoring & issues' },
  { id: 'webhook', name: 'Custom Webhook', description: 'Accept POST requests from any source' },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Page views & traffic sources via Web Analytics',
    disabled: true,
    badge: 'In development',
  },
  { id: 'github', name: 'GitHub', description: 'Repositories, PRs & issues', disabled: true, badge: 'In development' },
  { id: 'x', name: 'X (Twitter)', description: 'Followers, posts & engagement', disabled: true, badge: 'In development' },
  { id: 'reddit', name: 'Reddit', description: 'Subreddit stats & mentions', disabled: true, badge: 'In development' },
  { id: 'gmail', name: 'Gmail', description: 'Emails & threads', disabled: true, badge: 'In development' },
]

type View =
  | 'list'
  | 'posthog-form'
  | 'posthog-project-select'
  | 'webhook-form'
  | 'webhook-created'
  | 'stripe-choose'
  | 'stripe-manual-form'
  | 'calendly-connecting'
  | 'google-analytics-connecting'
  | 'sentry-connecting'
  | 'vercel-token'
  | 'vercel-project-select'
  | 'vercel-created'

/**
 * Default PostHog hosts. Most users are on US Cloud; EU is the second
 * common case. Self-hosters can point at custom hosts post-hoc by
 * editing `connections_posthog.host` directly — the UI doesn't expose
 * that to keep the form simple. If we get demand for self-hosting,
 * add a third "Custom" option that reveals a free-form input.
 */
const POSTHOG_HOSTS = [
  { id: 'https://us.posthog.com', label: 'US Cloud' },
  { id: 'https://eu.posthog.com', label: 'EU Cloud' },
] as const

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
  host,
  error,
  onApiKeyChange,
  onHostChange,
}: {
  apiKey: string
  host: string
  /**
   * Inline error from the most recent fetch attempt. Stays visible
   * while the user edits the form so they can re-read the hint
   * (typo? wrong region?). Cleared by the parent on the next attempt.
   */
  error: string | null
  onApiKeyChange: (v: string) => void
  onHostChange: (v: string) => void
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
        <p className="text-xs text-muted-foreground">
          Create one under{' '}
          <a
            href="https://app.posthog.com/settings/user-api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Personal API Keys
          </a>{' '}
          with <span className="font-medium text-foreground">Read</span> access
          to{' '}
          <span className="font-medium text-foreground">
            Project, Query, and Event definition
          </span>
          . Read-only — we never write back.
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Region</label>
        <div className="grid grid-cols-2 gap-2">
          {POSTHOG_HOSTS.map(h => (
            <Button
              key={h.id}
              type="button"
              variant="outline"
              onClick={() => onHostChange(h.id)}
              className={`h-auto justify-start py-2 text-sm ${
                host === h.id ? 'border-foreground bg-muted' : ''
              }`}
            >
              {h.label}
            </Button>
          ))}
        </div>
      </div>

      <InlineErrorBanner message={error} />
    </div>
  )
}

function PostHogProjectSelectForm({
  projects,
  selectedId,
  onSelect,
}: {
  projects: { id: string; name: string; organization: string | null }[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No projects on this PostHog account. Create one in PostHog and try again.
      </p>
    )
  }
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
            <div className="flex flex-col items-start gap-0.5 text-left">
              <span className="font-medium">{p.name}</span>
              {p.organization && (
                <span className="text-xs text-muted-foreground">
                  {p.organization}
                </span>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}

function WebhookForm({
  name,
  error,
  onNameChange,
}: {
  name: string
  /** Inline error from the most recent connect attempt. Webhooks
   *  used to fail silently — bad DB writes / failed key generation
   *  closed the modal with no surface. */
  error: string | null
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
        You&apos;ll get a unique webhook URL and API key after connecting.
      </p>
      <InlineErrorBanner message={error} />
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
  error,
  onNameChange,
  onApiKeyChange,
}: {
  name: string
  apiKey: string
  /** Inline error from the most recent save attempt. */
  error: string | null
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
          with <span className="font-medium text-foreground">Read</span> access
          to{' '}
          <span className="font-medium text-foreground">
            Charges, Customers, Subscriptions, and Products
          </span>
          . Read-only — we never write back.
        </p>
      </div>
      <InlineErrorBanner message={error} />
    </div>
  )
}

function VercelTokenForm({
  token,
  error,
  onTokenChange,
}: {
  token: string
  /** Inline error from the most recent fetch attempt. Cleared by
   *  the parent on the next submit so the user sees a fresh state
   *  per try. */
  error: string | null
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
          </a>{' '}
          — make sure it&apos;s a{' '}
          <span className="font-medium text-foreground">Personal</span> token
          (not Team or Project scope).
        </p>
      </div>
      <InlineErrorBanner message={error} />
    </div>
  )
}

function VercelProjectSelectForm({
  projects,
  selectedId,
  error,
  onSelect,
}: {
  projects: { id: string; name: string }[]
  selectedId: string
  error: string | null
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
      <InlineErrorBanner message={error} />
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
  const { enforceConnectionLimit } = usePlanLimits()
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
  // Host is a PostHog cloud region the user picks in step 1; defaults
  // to US since that's where the majority of accounts live.
  const [posthogHost, setPosthogHost] = useState<string>(POSTHOG_HOSTS[0].id)
  // Projects come back from `/posthog/connection/projects` after the
  // user submits the API key in step 1. Empty until step 2.
  const [posthogProjects, setPosthogProjects] = useState<
    { id: string; name: string; organization: string | null }[]
  >([])
  const [posthogSelectedProjectId, setPosthogSelectedProjectId] = useState('')
  // Backend-supplied error message shown inline in the form so the
  // user can read what went wrong while they fix it (a toast would
  // disappear before they could re-read the hint about wrong region).
  const [posthogError, setPosthogError] = useState<string | null>(null)
  const [webhookName, setWebhookName] = useState('')
  const [webhookError, setWebhookError] = useState<string | null>(null)
  const [stripeManualName, setStripeManualName] = useState('Stripe')
  const [stripeManualKey, setStripeManualKey] = useState('')
  // Inline error for the manual-key save flow. Today the form is
  // a "click Save → modal closes whether or not it actually worked"
  // black hole; this surface gives bad keys a visible failure mode.
  const [stripeManualError, setStripeManualError] = useState<string | null>(null)
  const [vercelToken, setVercelToken] = useState('')
  const [vercelProjects, setVercelProjects] = useState<{ id: string; name: string }[]>([])
  const [vercelSelectedId, setVercelSelectedId] = useState<string>('')
  // Inline error for both fetch-projects (step 1) and connect (step 2).
  // Reset to null at the start of each attempt; populated from
  // `err.message` on failure (the backend surfaces user-friendly hints
  // there — see `vercel/connection/connection.controller.ts`).
  const [vercelError, setVercelError] = useState<string | null>(null)
  const [vercelDrainUrl, setVercelDrainUrl] = useState('')

  // Single in-flight flag per form. `submitting` covers all forms because
  // only one is visible at a time; conflating them keeps the conditional
  // rendering inside `<HeaderSaveCancel>` simple.
  const [submitting, setSubmitting] = useState(false)

  const resetFormState = () => {
    setPosthogApiKey('')
    setPosthogHost(POSTHOG_HOSTS[0].id)
    setPosthogProjects([])
    setPosthogSelectedProjectId('')
    setPosthogError(null)
    setWebhookName('')
    setWebhookError(null)
    setStripeManualName('Stripe')
    setStripeManualKey('')
    setStripeManualError(null)
    setVercelToken('')
    setVercelProjects([])
    setVercelSelectedId('')
    setVercelDrainUrl('')
    setVercelError(null)
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
    // Gate behind plan limits before the user starts a flow they
    // can't finish. Two failure modes inside `enforceConnectionLimit`:
    //   1. The type isn't on the user's plan (Free + Calendly,
    //      Sentry, Vercel) → "Your Free plan doesn't include …"
    //   2. The user already has the per-type maximum
    //      (`max_connections_per_type` from the subscriptions row) →
    //      "You've hit your … plan's limit of N connection(s) of
    //      this type".
    // Either fires the limit toast (with the underlined "upgrade
    // your plan" link) and short-circuits before we route into the
    // OAuth / form flows below.
    if (!enforceConnectionLimit(type as ConnectionType)) return

    if (type === 'posthog') {
      setView('posthog-form')
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
    } else if (type === 'sentry') {
      setView('sentry-connecting')
      handleSentryOAuth()
    } else if (type === 'vercel') {
      setView('vercel-token')
    }
  }

  const handleVercelFetchProjects = async () => {
    const trimmed = vercelToken.trim()
    if (!trimmed) return
    setSubmitting(true)
    setVercelError(null)
    try {
      const data = await ALGORITHM.getVercelProjects(trimmed)
      setVercelToken(trimmed)
      setVercelProjects(data.projects)
      setView('vercel-project-select')
    } catch (err) {
      // Backend surfaces user-friendly messages on `err.message`
      // (`UnauthorizedException` for bad token, `BadGatewayException`
      // for upstream blip). Pull through unchanged so the inline
      // banner reads exactly what the server sent.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't reach Vercel. Try again in a moment."
      setVercelError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVercelConnect = async () => {
    const project = vercelProjects.find(p => p.id === vercelSelectedId)
    if (!project) return
    setSubmitting(true)
    setVercelError(null)
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
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't save the Vercel connection. Try again."
      setVercelError(message)
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

  const handleSentryOAuth = async () => {
    try {
      const data = await ALGORITHM.getSentryOAuthUrl()
      window.location.href = data.url
    } catch {
      toast.error('Failed to start Sentry OAuth')
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
    setStripeManualError(null)
    try {
      const created = await connections.createConnection({
        name: trimmedName,
        type: 'stripe_manual',
        projectId,
        config: { apiKey: trimmedKey },
      })
      // `createConnection` returns null on a soft failure (rare —
      // most failures throw via apiFetch). Treat both null and throw
      // as the user-visible error path.
      if (!created) {
        setStripeManualError(
          "Couldn't save the Stripe connection. Try again.",
        )
        return
      }
      connections.closeModal()
      setView('list')
      resetFormState()
      // Hop to the connections page with the picker query params. The
      // picker reads `?stripe=select-products&connectionId=…` and opens
      // itself.
      router.push(
        `/hub/connections?stripe=select-products&connectionId=${created.id}`,
      )
    } catch (err) {
      // Backend (after step 8 lands its pre-flight `/v1/account`
      // check) raises `UnauthorizedException` with a hint when the
      // key is the wrong shape (publishable instead of secret) or
      // the key has been rotated. Until then, this branch catches
      // generic Supabase / connection-create failures.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't save the Stripe connection. Try again."
      setStripeManualError(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Step 1 → Step 2: validate the API key by hitting PostHog's
  // `/api/projects/` endpoint. On success, populate the picker; on
  // failure, surface a clean toast and stay on the form. This is the
  // mirror of `handleVercelFetchProjects`.
  const handlePostHogFetchProjects = async () => {
    const trimmedKey = posthogApiKey.trim()
    if (!trimmedKey || !posthogHost) return
    setSubmitting(true)
    setPosthogError(null)
    try {
      const data = await ALGORITHM.getPosthogProjects(trimmedKey, posthogHost)
      setPosthogProjects(data.projects)
      // Pre-select if there's exactly one — saves a click for the
      // common solo-project case.
      if (data.projects.length === 1) {
        setPosthogSelectedProjectId(data.projects[0].id)
      } else {
        setPosthogSelectedProjectId('')
      }
      setView('posthog-project-select')
    } catch (err) {
      // The backend's `UnauthorizedException` / `BadGatewayException`
      // include user-friendly hints in `message` (typo / wrong region
      // / give-it-a-moment). `apiFetch` rethrows them as `Error` with
      // that same message — pull it through unchanged so the inline
      // banner shows the precise reason rather than a generic toast.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't reach PostHog. Try again in a moment."
      setPosthogError(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2: persist the connection with the picked project. Host is
  // saved alongside so per-region API calls go to the right cloud.
  const handlePostHogConnect = async () => {
    const trimmedKey = posthogApiKey.trim()
    const project = posthogProjects.find(p => p.id === posthogSelectedProjectId)
    if (!trimmedKey || !project) return
    setSubmitting(true)
    try {
      await connections.createConnection({
        name: project.name,
        type: 'posthog',
        projectId, // our internal project (or null = Common)
        config: {
          apiKey: trimmedKey,
          projectId: project.id,
          host: posthogHost,
        },
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
    setWebhookError(null)
    try {
      const connection = await connections.createConnection({
        name: trimmedName,
        type: 'webhook',
        projectId,
      })
      // Today, `createConnection` returns null on a soft failure
      // (e.g. Supabase unique constraint). The old code returned
      // silently here — the modal stayed open with no message and
      // the user had no idea what happened. Now we surface the
      // failure inline.
      if (!connection) {
        setWebhookError(
          "Couldn't create the webhook. Try a different name and try again.",
        )
        return
      }

      try {
        const keyData = await ALGORITHM.createWebhookKey(connection.id, 'Default')
        const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
        const webhookUrl = `${backendUrl}/webhooks/custom/${connection.webhookId}`
        setWebhookCreated({ connection, webhookUrl, apiKey: keyData.key })
        setView('webhook-created')
      } catch (keyErr) {
        // Connection was created but key generation failed — half-
        // succeeded state. Surface inline rather than blowing the
        // whole modal away (the user can retry, and the half-created
        // connection appears in the list with a "Generate key" affordance
        // already wired elsewhere).
        const message =
          keyErr instanceof Error && keyErr.message
            ? `Webhook created, but generating the API key failed: ${keyErr.message}`
            : 'Webhook created, but we couldn\'t generate its API key. Open the connection from the list and retry.'
        setWebhookError(message)
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't create the webhook. Try again."
      setWebhookError(message)
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
    (view === 'posthog-form' && posthogApiKey.trim() !== '') ||
    (view === 'posthog-project-select' && posthogSelectedProjectId !== '') ||
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

      {view === 'posthog-form' && (
        <BottomDialog.Page
          title="PostHog"
          pageKey="posthog-form"
          onBack={backToList}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            // Step 1 → "Continue" (not "Connect"): we still have to
            // fetch the project list before the connection is real.
            // Mirror the Vercel two-step flow (`vercel-token` → fetch
            // → `vercel-project-select`).
            <HeaderSaveCancel
              onSave={handlePostHogFetchProjects}
              onCancel={backToList}
              saving={submitting}
              disabled={!posthogApiKey.trim() || !posthogHost}
              bounce={ctx.bounce}
              saveLabel="Continue"
              savingLabel="Loading…"
            />
          )}
        >
          {projectPickerEl}
          <PostHogForm
            apiKey={posthogApiKey}
            host={posthogHost}
            error={posthogError}
            onApiKeyChange={setPosthogApiKey}
            onHostChange={setPosthogHost}
          />
        </BottomDialog.Page>
      )}

      {view === 'posthog-project-select' && (
        <BottomDialog.Page
          title="Pick a PostHog project"
          pageKey="posthog-project-select"
          onBack={() => setView('posthog-form')}
          headerRight={(ctx: BottomDialogPageSlotContext) => (
            <HeaderSaveCancel
              onSave={handlePostHogConnect}
              onCancel={backToList}
              saving={submitting}
              disabled={!posthogSelectedProjectId}
              bounce={ctx.bounce}
              saveLabel="Connect"
              savingLabel="Connecting…"
            />
          )}
        >
          {projectPickerEl}
          <PostHogProjectSelectForm
            projects={posthogProjects}
            selectedId={posthogSelectedProjectId}
            onSelect={setPosthogSelectedProjectId}
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
            error={stripeManualError}
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

      {view === 'sentry-connecting' && (
        <BottomDialog.Page title="Sentry" onBack={backToList}>
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Opening Sentry authorization…</p>
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
          <WebhookForm
            name={webhookName}
            error={webhookError}
            onNameChange={setWebhookName}
          />
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
          <VercelTokenForm
            token={vercelToken}
            error={vercelError}
            onTokenChange={setVercelToken}
          />
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
            error={vercelError}
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
