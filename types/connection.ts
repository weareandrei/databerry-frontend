export type ConnectionType =
  | 'posthog'
  | 'stripe'
  | 'stripe_manual'
  | 'calendly'
  | 'google_analytics'
  | 'vercel'
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
  gaPropertyId?: string | null
  gaPropertyName?: string | null
  vercelProjectName?: string | null
}
