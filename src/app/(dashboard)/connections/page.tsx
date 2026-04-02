'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { PlugsConnected, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'

const TYPE_LABELS: Record<string, string> = {
  posthog: 'PostHog',
  stripe: 'Stripe',
  x: 'X (Twitter)',
  reddit: 'Reddit',
  gmail: 'Gmail',
  sentry: 'Sentry',
  github: 'GitHub',
  custom: 'Custom',
}

export default function ConnectionsPage() {
  const { connections } = useDashboard()
  const searchParams = useSearchParams()

  useEffect(() => {
    const stripe = searchParams.get('stripe')
    if (stripe === 'connected') {
      toast.success('Stripe connected successfully!')
      connections.loadConnections()
      // Clean up URL
      window.history.replaceState({}, '', '/connections')
    } else if (stripe === 'error') {
      toast.error('Failed to connect Stripe. Please try again.')
      window.history.replaceState({}, '', '/connections')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your connected services and API keys.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => connections.openModal(null)}>
          <PlugsConnected size={15} weight="thin" />
          Add connection
        </Button>
      </div>

      {connections.connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <PlugsConnected size={32} weight="thin" className="text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No connections yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a connection to start pulling in data from external services.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {connections.connections.map((connection) => (
            <div
              key={connection.id}
              className="group flex items-center justify-between gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{connection.name}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[connection.type] ?? connection.type} · Connected{' '}
                  {new Date(connection.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => connections.deleteConnection(connection.id)}
                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Delete"
              >
                <Trash size={14} weight="thin" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
