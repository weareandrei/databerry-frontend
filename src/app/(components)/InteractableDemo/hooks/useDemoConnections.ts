import { useState } from 'react'

export interface DemoConnection {
  id: string
  name: string
  type: string
}

const INITIAL_CONNECTIONS: DemoConnection[] = [
  { id: 'conn-1', name: 'Stripe · Main Product', type: 'stripe_manual' },
  { id: 'conn-2', name: 'Stripe · Side Project', type: 'stripe_manual' },
  { id: 'conn-3', name: 'PostHog · Main Product', type: 'posthog' },
  { id: 'conn-4', name: 'PostHog · Side Project', type: 'posthog' },
  { id: 'conn-5', name: 'PostHog · Marketing', type: 'posthog' },
  { id: 'conn-6', name: 'Calendly', type: 'calendly' },
  { id: 'conn-7', name: 'GitHub', type: 'github' },
  { id: 'conn-8', name: 'Sentry', type: 'sentry' },
]

export function useDemoConnections() {
  const [connections, setConnections] = useState<DemoConnection[]>(INITIAL_CONNECTIONS)
  const [showUnsupportedNotice, setShowUnsupportedNotice] = useState(false)

  function createConnection() {
    setShowUnsupportedNotice(true)
  }

  function dismissUnsupportedNotice() {
    setShowUnsupportedNotice(false)
  }

  function deleteConnection(id: string) {
    setConnections(prev => prev.filter(c => c.id !== id))
  }

  return {
    connections,
    createConnection,
    deleteConnection,
    showUnsupportedNotice,
    dismissUnsupportedNotice,
  }
}
