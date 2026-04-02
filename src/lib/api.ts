import { createClient } from '@/lib/supabase/client'
import type { Folder } from '@/types/folder'
import type { Connection } from '@/types/connection'
import type { View } from '@/types/view'

export interface PosthogEventDefinition {
  id: string
  name: string
  volume_30_day: number | null
  last_seen_at: string | null
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
  return res.json() as Promise<T>
}

export const ALGORITHM = {
  // ── Folders ──────────────────────────────────────────────────────────────

  getFolders: () => apiFetch<Folder[]>('/folders'),

  getFolderById: (folderId: string) => apiFetch<Folder>(`/folders/${folderId}`),

  createFolder: (body: { name: string; parentId: string | null }) =>
    apiFetch<Folder>('/folders', { method: 'POST', body: JSON.stringify(body) }),

  updateFolder: (folderId: string, body: Partial<Pick<Folder, 'name' | 'color'>>) =>
    apiFetch<Folder>(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteFolder: (folderId: string) =>
    apiFetch<void>(`/folders/${folderId}`, { method: 'DELETE' }),

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

  // ── Stripe ────────────────────────────────────────────────────────────────

  getStripeOAuthUrl: () =>
    apiFetch<{ url: string }>('/stripe/oauth/start'),

  // ── Views ─────────────────────────────────────────────────────────────────

  getViewsByFolder: (folderId: string) =>
    apiFetch<View[]>(`/views?folderId=${folderId}`),

  createView: (body: Omit<View, 'id' | 'userId' | 'createdAt' | 'isPinned'>) =>
    apiFetch<View>('/views', { method: 'POST', body: JSON.stringify(body) }),

  deleteView: (viewId: string) =>
    apiFetch<void>(`/views/${viewId}`, { method: 'DELETE' }),
}
