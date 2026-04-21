import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types/project'
import type { Folder } from '@/types/folder'
import type { Connection } from '@/types/connection'
import type { View } from '@/types/view'

export interface WebhookKey {
  id: string
  name: string
  keyPrefix: string
  revokedAt: string | null
  createdAt: string
}

export interface CalendlyMeeting {
  startTime: string
  endTime: string
  name: string
  bookingUri: string
  invitees: { name: string; email: string }[]
  description: string | null
}

export interface GAProperty {
  id: string
  name: string
  displayName: string
}

export interface PosthogEventDefinition {
  id: string
  name: string
  volume_30_day: number | null
  computed_volume: number
  last_seen_at: string | null
  last_url: string | null
}

const BASE = process.env.NEXT_PUBLIC_API_URL

async function getAuthHeader(): Promise<string> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return `Bearer ${session.access_token}`
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = await getAuthHeader()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string })?.message ?? `API error ${res.status}`)
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const ALGORITHM = {
  // ── Projects ─────────────────────────────────────────────────────────────

  getProjects: () => apiFetch<Project[]>('/projects'),

  createProject: (body: { name: string }) =>
    apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),

  updateProject: (projectId: string, body: Partial<Pick<Project, 'name' | 'color'>>) =>
    apiFetch<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteProject: (projectId: string) =>
    apiFetch<void>(`/projects/${projectId}`, { method: 'DELETE' }),

  // ── Folders ──────────────────────────────────────────────────────────────

  getFolders: () => apiFetch<Folder[]>('/folders'),

  getFolderById: (folderId: string) => apiFetch<Folder>(`/folders/${folderId}`),

  createFolder: (body: { name: string; parentId: string | null; projectId: string }) =>
    apiFetch<Folder>('/folders', { method: 'POST', body: JSON.stringify(body) }),

  updateFolder: (folderId: string, body: Partial<Pick<Folder, 'name' | 'color'>>) =>
    apiFetch<Folder>(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteFolder: (folderId: string) => apiFetch<void>(`/folders/${folderId}`, { method: 'DELETE' }),

  // ── Connections ───────────────────────────────────────────────────────────

  getConnections: () => apiFetch<Connection[]>('/connections'),

  createConnection: (body: { name: string; type: string; config?: Record<string, unknown> }) =>
    apiFetch<Connection>('/connections', { method: 'POST', body: JSON.stringify(body) }),

  updateConnection: (connectionId: string, body: { name?: string }) =>
    apiFetch<Connection>(`/connections/${connectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteConnection: (connectionId: string) =>
    apiFetch<void>(`/connections/${connectionId}`, { method: 'DELETE' }),

  getPosthogEventDefinitions: (connectionId: string) =>
    apiFetch<PosthogEventDefinition[]>(`/connections/${connectionId}/posthog/event-definitions`),

  // ── Calendly ──────────────────────────────────────────────────────────────

  getCalendlyOAuthUrl: () => apiFetch<{ url: string }>('/calendly/oauth/start'),

  getCalendlyLiveValue: (connectionId: string, viewType: string, date?: string) =>
    apiFetch<{ value: string }>(
      `/calendly/views/live-value?connectionId=${connectionId}&viewType=${viewType}${date ? `&date=${date}` : ''}`,
    ),

  getCalendlyMeetingsList: (connectionId: string) =>
    apiFetch<{ meetings: CalendlyMeeting[] }>(
      `/calendly/views/meetings-list?connectionId=${connectionId}`,
    ),

  // ── Google Analytics ─────────────────────────────────────────────────────

  getGoogleAnalyticsOAuthUrl: () =>
    apiFetch<{ url: string }>('/google-analytics/oauth/start'),

  getGoogleAnalyticsProperties: (connectionId: string) =>
    apiFetch<{ properties: GAProperty[] }>(`/google-analytics/properties?connectionId=${connectionId}`),

  saveGoogleAnalyticsProperty: (connectionId: string, propertyId: string) =>
    apiFetch<{ ok: boolean }>(`/google-analytics/property?connectionId=${connectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ propertyId }),
    }),

  getGoogleAnalyticsLiveValue: (connectionId: string, viewType: string, date?: string) =>
    apiFetch<{ value: string }>(
      `/google-analytics/views/live-value?connectionId=${connectionId}&viewType=${viewType}${date ? `&date=${date}` : ''}`,
    ),

  // ── Vercel ───────────────────────────────────────────────────────────────

  getVercelProjects: (token: string) =>
    apiFetch<{ projects: { id: string; name: string }[] }>(
      `/vercel/connection/projects?token=${encodeURIComponent(token)}`,
    ),

  // ── Stripe ────────────────────────────────────────────────────────────────

  getStripeOAuthUrl: () => apiFetch<{ url: string }>('/stripe/oauth/start'),

  getStripeManualLiveValue: (connectionId: string, viewType: string, date?: string) =>
    apiFetch<{ value: string }>(
      `/stripe/views/live-value?connectionId=${connectionId}&viewType=${viewType}${date ? `&date=${date}` : ''}`,
    ),

  getStripeManualChartData: (connectionId: string, viewType: string) =>
    apiFetch<{ points: { label: string; value: number }[] }>(
      `/stripe/views/chart-data?connectionId=${connectionId}&viewType=${viewType}`,
    ),

  // ── Webhook Keys ──────────────────────────────────────────────────────────

  getWebhookKeys: (connectionId: string) =>
    apiFetch<WebhookKey[]>(`/connections/${connectionId}/webhook-keys`),

  createWebhookKey: (connectionId: string, name: string) =>
    apiFetch<WebhookKey & { key: string }>(`/connections/${connectionId}/webhook-keys`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  revokeWebhookKey: (connectionId: string, keyId: string) =>
    apiFetch<void>(`/connections/${connectionId}/webhook-keys/${keyId}`, { method: 'DELETE' }),

  // ── Views ─────────────────────────────────────────────────────────────────

  getViewsByFolder: (folderId: string, dateFrom?: string, dateTo?: string) =>
    apiFetch<View[]>(
      `/views?folderId=${folderId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}`,
    ),

  getViewsByProject: (projectId: string, dateFrom?: string, dateTo?: string) =>
    apiFetch<View[]>(
      `/views?projectId=${projectId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}`,
    ),

  getPinnedViews: () => apiFetch<View[]>('/views/pinned'),

  getPosthogLiveValue: (connectionId: string, viewId: string, date?: string) =>
    apiFetch<{ value: string }>(
      `/posthog/views/live-value?connectionId=${connectionId}&viewId=${viewId}${date ? `&date=${date}` : ''}`,
    ),

  createView: (body: Omit<View, 'id' | 'userId' | 'createdAt' | 'isPinned'>) =>
    apiFetch<View>('/views', { method: 'POST', body: JSON.stringify(body) }),

  pinView: (viewId: string) =>
    apiFetch<void>(`/views/${viewId}/pin`, { method: 'POST' }),

  unpinView: (viewId: string) =>
    apiFetch<void>(`/views/${viewId}/unpin`, { method: 'POST' }),

  deleteView: (viewId: string) => apiFetch<void>(`/views/${viewId}`, { method: 'DELETE' }),
}
