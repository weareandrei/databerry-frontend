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
  ArrowLeft,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { ALGORITHM } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

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

type View = 'list' | 'posthog' | 'stripe'

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
        <ArrowLeft size={14} weight="thin" />
        Back
      </button>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Personal API Key</label>
          <Input
            placeholder="phx_xxxxxxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Project ID</label>
          <Input
            placeholder="12345"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={!apiKey.trim() || !projectId.trim() || loading} onClick={handleConnect}>
          Connect
        </Button>
      </div>
    </div>
  )
}

export function CreateConnectionModal() {
  const { connections } = useDashboard()
  const [view, setView] = useState<View>('list')

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      connections.closeModal()
      setView('list')
    }
  }

  const handleConnect = async (type: string) => {
    if (type === 'posthog') {
      setView('posthog')
    } else if (type === 'stripe') {
      // Get OAuth URL from backend then redirect
      try {
        const data = await ALGORITHM.getStripeOAuthUrl()
        window.location.href = data.url
      } catch {
        toast.error('Failed to start Stripe OAuth')
      }
    }
  }

  const handleBack = () => setView('list')

  const handleCancel = () => {
    connections.closeModal()
    setView('list')
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

  return (
    <Dialog open={connections.isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Add a connection</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {view === 'list'
              ? 'Connect an external service to this folder.'
              : 'Enter your PostHog credentials.'}
          </DialogDescription>
        </DialogHeader>

        {view === 'list' && (
          <div className="mt-1">
            {INTEGRATIONS.map((integration, index) => {
              const Icon = integration.icon
              return (
                <div key={integration.type}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                        <Icon size={16} weight="thin" />
                      </div>
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
          <PostHogForm onBack={handleBack} onCancel={handleCancel} onConnect={handlePostHogConnect} />
        )}
      </DialogContent>
    </Dialog>
  )
}
