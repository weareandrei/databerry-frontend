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

/**
 * One row from the Sentry errors-list view. Matches the curated
 * shape the backend returns from `/sentry/views/issues-list` —
 * subset of Sentry's full issue payload, trimmed to the fields the
 * tile actually renders.
 */
export interface SentryIssue {
  id: string
  /** Human-readable error title, e.g. `TypeError: Cannot read properties…`. */
  title: string
  /** Event count inside the requested period. Stringified by Sentry. */
  count: string
  level: 'error' | 'warning' | 'info' | 'debug' | 'fatal' | string
  status: 'unresolved' | 'resolved' | 'ignored' | string
  firstSeen: string
  lastSeen: string
  /** Direct URL into Sentry — opens the issue in a new tab. */
  permalink: string
}

/** Top-customer row for the `stripe_top_customers` list tile. */
export interface StripeTopCustomer {
  customerId: string
  /** Stripe customer name; null when the customer was created without one. */
  name: string | null
  /** Email; null when missing. List view falls back to this when name is null. */
  email: string | null
  /** ISO 3166-1 alpha-2 (e.g. `'RO'`). Null when Stripe doesn't have an
   *  address on file for this customer. */
  addressCountry: string | null
  /** Free-form city string from Stripe's customer address. Null when missing. */
  addressCity: string | null
  /** Cents; matches the same convention as `stripe_charges.amount`. */
  amountCents: number
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

/** One step of a `posthog_funnel` view's result. */
export interface PosthogFunnelStep {
  name: string
  /** Cumulative — users who reached at least this step. */
  count: number
  /** 0..1; conversion from step 1. Always 1.0 for step 1. */
  conversionFromStart: number
  /** 0..1; conversion from the immediately previous step. */
  conversionFromPrev: number
}

export interface PosthogFunnelResult {
  steps: PosthogFunnelStep[]
  unavailable?: boolean
}

/** One row of a `posthog_retention` cohort heatmap. */
export interface PosthogRetentionRow {
  /** ISO date for the cohort's start day/week (UTC). */
  startDate: string
  /** Distinct users who first triggered `startEvent` in this period. */
  size: number
  /** Returned-user counts indexed by period offset. `null` = future cell. */
  returns: (number | null)[]
}

export interface PosthogRetentionResult {
  cohorts: PosthogRetentionRow[]
  /** Echoes the view's `period` config so the card labels columns correctly. */
  periodLabel: 'day' | 'week'
  unavailable?: boolean
}

/** One row of a `posthog_users` recent-users list. Mirrors backend
 *  `PosthogUserRow` 1:1 — the names match. */
export interface PosthogUserRow {
  /** PostHog `distinct_id` — opaque pseudo-identifier. */
  pseudoId: string
  /** Initial referring domain (`""` when direct/missing). */
  source: string
  /** Active-time span across pageviews in the date range. */
  sessionSec: number
  /** ISO timestamp of the last pageview in the range. */
  lastSeen: string
}

export interface PosthogUsersResult {
  users: PosthogUserRow[]
  unavailable?: boolean
}

// ── Stripe products ──────────────────────────────────────────────────────────

export interface StripeProductOption {
  id: string
  name: string
  active: boolean
}

export interface StripeProductsForConnection {
  products: StripeProductOption[]
  selectedProductIds: string[]
  /**
   * Backfill of the underlying Stripe account is finished. While `false`, the
   * picker shows an "Importing…" banner and polls `getStripeAccountStatus`.
   */
  backfillComplete: boolean
  backfillStatus: 'pending' | 'in_progress' | 'complete' | 'error' | null
  /**
   * Last backfill error, populated when `backfillStatus === 'error'`. Surfaced
   * in the picker so users can act on real Stripe errors (scope mismatches,
   * key revocations) instead of staring at a generic "Importing…" banner.
   */
  backfillError: string | null
  stripeAccountId: string | null
}

export interface StripeAccountStatus {
  stripeAccountId: string
  backfillStatus: 'pending' | 'in_progress' | 'complete' | 'error' | null
  backfilledThrough: string | null
  lastSyncedAt: string | null
  backfillError: string | null
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

/**
 * Thrown when a `live-value` (or any other integration-backed) request
 * comes back with the structured `INTEGRATION_NEEDS_REAUTH` body.
 *
 * The backend returns this when the OAuth refresh token is dead — most
 * commonly because Google revoked it (Testing-mode 7-day rule, user
 * disconnected the app, scope changed) or Calendly responded 4xx to a
 * refresh attempt. The user MUST reconnect the integration; nothing the
 * frontend retries will fix it.
 *
 * Callers should let this propagate up to UI that can render a
 * "Reconnect <Integration>" prompt (see `IntegrationReauthBanner`).
 */
/**
 * Providers that can throw `INTEGRATION_NEEDS_REAUTH` — kept in sync
 * with `IntegrationReauthBody['integration']` AND with the per-
 * provider OAuth-start dispatch table in `IntegrationReauthBanner`.
 * Adding a new OAuth provider that can need reauth = touching all
 * three.
 */
export type IntegrationReauthProvider = 'google_analytics' | 'calendly' | 'sentry'

export class IntegrationReauthError extends Error {
  readonly integration: IntegrationReauthProvider
  readonly connectionId: string
  constructor(integration: IntegrationReauthProvider, connectionId: string, detail?: string) {
    super(detail ?? `Reauth required for ${integration}`)
    this.name = 'IntegrationReauthError'
    this.integration = integration
    this.connectionId = connectionId
  }
}

interface IntegrationReauthBody {
  error: 'INTEGRATION_NEEDS_REAUTH'
  integration: 'google_analytics' | 'calendly' | 'sentry'
  connectionId: string
  detail?: string
}

function isReauthBody(body: unknown): body is IntegrationReauthBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    b.error === 'INTEGRATION_NEEDS_REAUTH' &&
    (b.integration === 'google_analytics' ||
      b.integration === 'calendly' ||
      b.integration === 'sentry') &&
    typeof b.connectionId === 'string'
  )
}

/**
 * Thrown when a request references a `connectionId` that no longer exists
 * for the current user — the underlying connection row has been deleted
 * (or ownership transferred) while the view tile was still alive.
 *
 * Distinct from `IntegrationReauthError` (the *credentials* are stale but
 * the connection row exists). Routed by `ViewCard` to the centred
 * `ReassignConnectionDialog` instead of the OAuth-restart banner —
 * reconnecting the integration would be a wrong fix here, since the
 * connection itself is gone; the user needs to point this view at a
 * different connection of the same type.
 *
 * `integration` is a plain string (not the narrower `IntegrationKey`)
 * because this case can fire for stripe / stripe_manual / posthog too —
 * not just OAuth-refreshable providers.
 */
export class ConnectionMissingError extends Error {
  readonly integration: string
  readonly connectionId: string
  constructor(integration: string, connectionId: string, detail?: string) {
    super(detail ?? `Connection missing for ${integration}`)
    this.name = 'ConnectionMissingError'
    this.integration = integration
    this.connectionId = connectionId
  }
}

interface ConnectionMissingBody {
  error: 'CONNECTION_MISSING'
  integration: string
  connectionId: string
  detail?: string
}

function isConnectionMissingBody(body: unknown): body is ConnectionMissingBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    b.error === 'CONNECTION_MISSING' &&
    typeof b.integration === 'string' &&
    typeof b.connectionId === 'string'
  )
}

/**
 * URL fragment for the per-request timezone. Returns `&tz=Europe/Bucharest`
 * (URL-encoded) when called with a non-empty value, empty string otherwise.
 *
 * Caller is expected to pass the user's tz (sourced from
 * `UserSettingsContext`/redux). When undefined we omit the param entirely so
 * the backend default (`'UTC'`) kicks in — bit-identical to the pre-tz
 * behaviour for users who haven't set one yet.
 */
function tzParam(tz?: string | null): string {
  if (!tz) return ''
  return `&tz=${encodeURIComponent(tz)}`
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
    // Structured reauth signal from backend `IntegrationReauthRequiredException`.
    // Surfaced as a typed error so view tiles can render the inline reconnect
    // prompt instead of a generic error badge.
    if (res.status === 401 && isReauthBody(body)) {
      throw new IntegrationReauthError(body.integration, body.connectionId, body.detail)
    }
    // Structured "your connection FK is dangling" signal from backend
    // `ConnectionMissingException`. Routed by `ViewCard` to the
    // reassign-connection dialog so the user can pick a fresh connection
    // for this view without nuking + recreating it.
    if (res.status === 410 && isConnectionMissingBody(body)) {
      throw new ConnectionMissingError(body.integration, body.connectionId, body.detail)
    }
    throw new Error((body as { message?: string })?.message ?? `API error ${res.status}`)
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const ALGORITHM = {
  // ── Projects ─────────────────────────────────────────────────────────────

  getProjects: () => apiFetch<Project[]>('/projects'),

  createProject: (body: { name: string; websiteUrl?: string | null }) =>
    apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),

  // PATCH accepts a partial slice — `name`, `color`, and `websiteUrl`
  // can each be sent independently. Sending `websiteUrl: null`
  // explicitly clears the favicon back to the generic Cube; omitting
  // the key leaves the existing value untouched.
  updateProject: (
    projectId: string,
    body: Partial<Pick<Project, 'name' | 'color' | 'websiteUrl'>>,
  ) =>
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

  createConnection: (body: {
    name: string
    type: string
    // projectId: null / undefined ⇒ "Common" (shared across all projects).
    projectId?: string | null
    config?: Record<string, unknown>
  }) =>
    apiFetch<Connection>('/connections', { method: 'POST', body: JSON.stringify(body) }),

  updateConnection: (connectionId: string, body: { name?: string }) =>
    apiFetch<Connection>(`/connections/${connectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Reassign a connection to a different project, or to "Common" (projectId=null).
  updateConnectionProject: (connectionId: string, projectId: string | null) =>
    apiFetch<Connection>(`/connections/${connectionId}/project`, {
      method: 'PATCH',
      body: JSON.stringify({ projectId }),
    }),

  deleteConnection: (connectionId: string) =>
    apiFetch<void>(`/connections/${connectionId}`, { method: 'DELETE' }),

  getPosthogEventDefinitions: (connectionId: string) =>
    apiFetch<PosthogEventDefinition[]>(`/connections/${connectionId}/posthog/event-definitions`),

  // ── Calendly ──────────────────────────────────────────────────────────────

  getCalendlyOAuthUrl: () => apiFetch<{ url: string }>('/calendly/oauth/start'),

  getCalendlyLiveValue: (
    connectionId: string,
    viewType: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<{ value: string | null; unavailable?: boolean }>(
      `/calendly/views/live-value?connectionId=${connectionId}&viewType=${viewType}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  getCalendlyMeetingsList: (
    connectionId: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<{ meetings: CalendlyMeeting[] }>(
      `/calendly/views/meetings-list?connectionId=${connectionId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  // ── Sentry ─────────────────────────────────────────────────────────────
  //
  // Sentry's OAuth flow is a "Public Integration" install on Sentry's
  // side. Frontend just hits `oauth/start`, which returns a URL to
  // open in a popup / redirect to. After the user installs, Sentry
  // redirects back to our backend's `oauth/callback`, which finalises
  // the credentials + redirects the user to `/hub/connections?sentry=`.

  getSentryOAuthUrl: (name?: string) =>
    apiFetch<{ url: string }>(
      `/sentry/oauth/start${name ? `?name=${encodeURIComponent(name)}` : ''}`,
    ),

  /**
   * Errors-list view for a Sentry connection. `period` accepts
   * `24h` / `7d` / `30d` / `90d`; `sort` accepts `recent` (= newly
   * occurring) or `frequent` (= highest event count). Defaults match
   * the backend's "what's broken in the last 24 h" zero-config read.
   */
  getSentryIssuesList: (
    connectionId: string,
    period: '24h' | '7d' | '30d' | '90d' = '24h',
    sort: 'recent' | 'frequent' = 'recent',
  ) =>
    apiFetch<{ issues: SentryIssue[] }>(
      `/sentry/views/issues-list?connectionId=${connectionId}&period=${period}&sort=${sort}`,
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

  getGoogleAnalyticsLiveValue: (
    connectionId: string,
    viewType: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<{ value: string | null; unavailable?: boolean }>(
      `/google-analytics/views/live-value?connectionId=${connectionId}&viewType=${viewType}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  /**
   * Time-series for `ga_users_today` / `ga_sessions_today` /
   * `ga_pageviews_today` views in chart mode (`config.displayMode === 'chart'`).
   * Wire shape matches `getStripeManualChartData` so `<ViewCardChart>`
   * accepts both interchangeably.
   */
  getGoogleAnalyticsChartData: (
    connectionId: string,
    viewType: string,
    dateFrom?: string,
    dateTo?: string,
    mode?: 'daily' | 'weekly' | 'monthly',
    tz?: string | null,
  ) =>
    apiFetch<{ points: { label: string; value: number }[]; unavailable?: boolean }>(
      `/google-analytics/views/chart-data?connectionId=${connectionId}&viewType=${viewType}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${mode ? `&mode=${mode}` : ''}${tzParam(tz)}`,
    ),

  // ── Vercel ───────────────────────────────────────────────────────────────

  getVercelProjects: (token: string) =>
    apiFetch<{ projects: { id: string; name: string }[] }>(
      `/vercel/connection/projects?token=${encodeURIComponent(token)}`,
    ),

  // ── PostHog ─────────────────────────────────────────────────────────────
  //
  // Lists projects accessible to a personal API key (used by the
  // create-connection picker so the user doesn't have to copy/paste a
  // numeric project ID out of the PostHog UI). POST + body — the API
  // key is sensitive and we'd rather not have it in URL access logs
  // (Vercel uses GET, but Vercel's API token surface area is smaller).

  getPosthogProjects: (apiKey: string, host: string) =>
    apiFetch<{
      projects: { id: string; name: string; organization: string | null }[]
    }>(`/posthog/connection/projects`, {
      method: 'POST',
      body: JSON.stringify({ apiKey, host }),
    }),

  // ── Stripe ────────────────────────────────────────────────────────────────

  getStripeOAuthUrl: () => apiFetch<{ url: string }>('/stripe/oauth/start'),

  getStripeManualLiveValue: (
    connectionId: string,
    viewType: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<{ value: string | null; unavailable?: boolean }>(
      `/stripe/views/live-value?connectionId=${connectionId}&viewType=${viewType}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  getStripeManualChartData: (
    connectionId: string,
    viewType: string,
    dateFrom?: string,
    dateTo?: string,
    mode?: 'daily' | 'weekly' | 'monthly',
    tz?: string | null,
  ) =>
    apiFetch<{ points: { label: string; value: number }[] }>(
      `/stripe/views/chart-data?connectionId=${connectionId}&viewType=${viewType}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${mode ? `&mode=${mode}` : ''}${tzParam(tz)}`,
    ),

  /**
   * Top customers for a Stripe connection, ordered by gross revenue over
   * [dateFrom, dateTo]. Mirrors `getCalendlyMeetingsList` in shape — list
   * tile, separate route from `live-value`. `unavailable: true` means the
   * connection isn't a Stripe one (or hasn't been linked yet).
   */
  getStripeTopCustomers: (
    connectionId: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<{ customers: StripeTopCustomer[]; unavailable?: boolean }>(
      `/stripe/views/top-customers?connectionId=${connectionId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  /** List products available on a connection's Stripe account + current filter. */
  getStripeProducts: (connectionId: string) =>
    apiFetch<StripeProductsForConnection>(`/stripe/connections/${connectionId}/products`),

  /** Save the per-connection product filter. Pass [] for "All products". */
  saveStripeProducts: (connectionId: string, productIds: string[]) =>
    apiFetch<{ selectedProductIds: string[] }>(`/stripe/connections/${connectionId}/products`, {
      method: 'POST',
      body: JSON.stringify({ productIds }),
    }),

  /** Backfill status for a Stripe account (modal polls this every few seconds). */
  getStripeAccountStatus: (stripeAccountId: string) =>
    apiFetch<StripeAccountStatus>(`/stripe/accounts/${stripeAccountId}/status`),

  /**
   * Quick "did anything happen" sync triggered when the dashboard mounts.
   * Server-side throttle (60s) means rapid repeats are cheap. The server
   * also caps the work at 2s — past that the response indicates `timeout`
   * and the sync continues in the background.
   *
   * Charges-only on the server side (no products/customers/subs sweep).
   * Use `reloadStripeConnection` for a full refresh.
   */
  syncStripeConnectionNow: (connectionId: string) =>
    apiFetch<
      | { skipped: 'recent'; lastSyncedAt: string | null }
      | { skipped: 'inflight' }
      | { synced: true; chargeCount: number; lastSyncedAt: string }
      | { timeout: true }
    >(`/stripe/connections/${connectionId}/sync-now`, { method: 'POST' }),

  /**
   * User-initiated full reload of the last `days` (default 30) of Stripe
   * data. Pulls everything: charges, products, customers, subscriptions.
   * No throttle — the user clicked.
   */
  reloadStripeConnection: (connectionId: string, days: number = 30) =>
    apiFetch<{
      ok: true
      syncedFrom: string
      syncedTo: string
      chargeCount: number
      productCount?: number
      customerCount?: number
      subCount?: number
    }>(`/stripe/connections/${connectionId}/reload`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    }),

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

  getPosthogLiveValue: (
    connectionId: string,
    viewId: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<{ value: string | null; unavailable?: boolean }>(
      `/posthog/views/live-value?connectionId=${connectionId}&viewId=${viewId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  /**
   * Time-series for a `daily_counter` view in chart mode
   * (`config.displayMode === 'chart'`). Same wire shape as the
   * Stripe + GA chart endpoints — `<ViewCardChart>` reads any of them.
   */
  getPosthogChartData: (
    connectionId: string,
    viewId: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<{ points: { label: string; value: number }[]; unavailable?: boolean }>(
      `/posthog/views/chart-data?connectionId=${connectionId}&viewId=${viewId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  /** Cumulative-count funnel for a `posthog_funnel` view. */
  getPosthogFunnel: (
    connectionId: string,
    viewId: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<PosthogFunnelResult>(
      `/posthog/views/funnel?connectionId=${connectionId}&viewId=${viewId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  /** Cohort retention heatmap for a `posthog_retention` view. */
  getPosthogRetention: (
    connectionId: string,
    viewId: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<PosthogRetentionResult>(
      `/posthog/views/retention?connectionId=${connectionId}&viewId=${viewId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  /** Recent-users list for a `posthog_users` view. */
  getPosthogUsers: (
    connectionId: string,
    viewId: string,
    dateFrom?: string,
    dateTo?: string,
    tz?: string | null,
  ) =>
    apiFetch<PosthogUsersResult>(
      `/posthog/views/users?connectionId=${connectionId}&viewId=${viewId}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${tzParam(tz)}`,
    ),

  createView: (body: Omit<View, 'id' | 'userId' | 'createdAt' | 'isPinned'>) =>
    apiFetch<View>('/views', { method: 'POST', body: JSON.stringify(body) }),

  updateView: (
    viewId: string,
    body: { config?: Record<string, unknown>; name?: string; connectionId?: string | null },
  ) =>
    apiFetch<View>(`/views/${viewId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  pinView: (viewId: string) =>
    apiFetch<void>(`/views/${viewId}/pin`, { method: 'POST' }),

  unpinView: (viewId: string) =>
    apiFetch<void>(`/views/${viewId}/unpin`, { method: 'POST' }),

  deleteView: (viewId: string) => apiFetch<void>(`/views/${viewId}`, { method: 'DELETE' }),
}

// ─────────────────────────────────────────────────────────────────────────────
// User Settings
// ─────────────────────────────────────────────────────────────────────────────

export interface UserSettings {
  userId: string
  preferredTrafficConnectionId: string | null
  /**
   * IANA timezone (e.g. `Europe/Bucharest`). `null` = "not set yet" — the
   * `UserSettingsProvider` auto-detects via
   * `Intl.DateTimeFormat()...timeZone` on first load and writes it back.
   */
  timezone: string | null
}

export const USER_SETTINGS = {
  get: () => apiFetch<UserSettings>('/user-settings'),

  update: (patch: {
    preferredTrafficConnectionId?: string | null
    /** Pass an IANA name (or `null` to clear). Server sanitizes / falls back
     *  to `'UTC'` if the input doesn't match the IANA shape. */
    timezone?: string | null
  }) =>
    apiFetch<UserSettings>('/user-settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Settings (per-project intelligence configuration)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectSettings {
  projectId: string
  conversionConnectionId: string | null
  conversionEvent: string | null
}

export const PROJECT_SETTINGS = {
  get: (projectId: string) =>
    apiFetch<ProjectSettings>(`/project-settings/${projectId}`),

  update: (
    projectId: string,
    patch: { conversionConnectionId?: string | null; conversionEvent?: string | null },
  ) =>
    apiFetch<ProjectSettings>(`/project-settings/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Overview (composite intelligence view)
// ─────────────────────────────────────────────────────────────────────────────

export interface OverviewBucket {
  label: string
  total: number
  bySource: { source: string; label: string; color: string; value: number }[]
  secondary: number | null
}

export interface OverviewChartResponse {
  buckets: OverviewBucket[]
  totalPrimary: number
  totalSecondary: number | null
  primaryUnavailable?: boolean
  secondaryUnavailable?: boolean
  trafficProvider: 'google_analytics' | 'posthog' | null
}

export interface OverviewSource {
  source: string
  label: string
  color: string
  visitors: number
  share: number
}

export interface OverviewUser {
  pseudoId: string
  source: string
  label: string
  color: string
  sessionSec: number
  lastSeen: string
}

export interface OverviewUsersResponse {
  users: OverviewUser[]
  provider: 'google_analytics' | 'posthog' | null
}

export const PROJECT_OVERVIEW = {
  getChart: (
    projectId: string,
    dateFrom: string,
    dateTo: string,
    mode: 'daily' | 'weekly' | 'monthly',
    primaryMetric: 'visitors' | 'pageviews' | 'conversions' | 'revenue',
    secondaryMetric:
      | 'conversion_rate'
      | 'bounce_rate'
      | 'avg_session_sec'
      | 'revenue'
      | null,
  ) => {
    // Resolve tz at call-time, not module-load time, so a user who changes
    // their OS timezone mid-session sees the next refetch reflect the new
    // tz without a hard reload. Falls back to 'UTC' on the (rare) browser
    // that doesn't expose a resolved timeZone.
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return apiFetch<OverviewChartResponse>(
      `/project-overview/chart?projectId=${projectId}&dateFrom=${dateFrom}&dateTo=${dateTo}&mode=${mode}&primaryMetric=${primaryMetric}&secondaryMetric=${secondaryMetric ?? 'none'}&tz=${encodeURIComponent(tz)}`,
    )
  },

  // Default 100 — the panel paginates client-side, so we fetch a generous
  // batch and flip pages locally rather than round-tripping per page.
  getSources: (projectId: string, dateFrom: string, dateTo: string, limit = 100) =>
    apiFetch<{ sources: OverviewSource[] }>(
      `/project-overview/sources?projectId=${projectId}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${limit}`,
    ),

  getUsers: (projectId: string, dateFrom: string, dateTo: string, limit = 100) =>
    apiFetch<OverviewUsersResponse>(
      `/project-overview/users?projectId=${projectId}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${limit}`,
    ),

  getConversionEvents: (connectionId: string) =>
    apiFetch<{ events: { name: string }[] }>(
      `/project-overview/conversion-events?connectionId=${connectionId}`,
    ),
}
