export type ConnectionType =
  | 'posthog'
  | 'stripe'
  | 'stripe_manual'
  | 'calendly'
  | 'x'
  | 'reddit'
  | 'gmail'
  | 'sentry'
  | 'github'
  | 'webhook'
  | 'custom'

export interface Connection {
  id: string
  name: string
  type: ConnectionType
  userId: string
  projectId?: string | null
  createdAt: string
  webhookId?: string | null
}
