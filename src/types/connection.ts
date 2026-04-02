export type ConnectionType =
  | 'posthog'
  | 'stripe'
  | 'x'
  | 'reddit'
  | 'gmail'
  | 'sentry'
  | 'github'
  | 'custom'

export interface Connection {
  id: string
  name: string
  type: ConnectionType
  userId: string
  createdAt: string
}
