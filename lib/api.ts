import { createClient } from '@/lib/supabase/client'
import { reportServerReachable, reportServerUnreachable } from '@/lib/serverHealth'
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
  /** ISO 3166-1 alpha-2 from `$geoip_country_code`. Empty when unresolved. */
  countryCode: string
  /** Display name from `$geoip_country_name`. */
  countryName: string
  /** City name from `$geoip_city_name`. */
  city: string
  /** Distinct `$session_id` count for this user in the range. */
  sessionCount: number
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

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
        ...options.headers,
      },
    })
  } catch (err) {
    // The fetch itself rejected — connection refused / DNS / timeout /
    // CORS-on-down. The server is unreachable; flip the global flag so
    // `<ServerStatusGate>` can surface the "server is down" screen, then
    // rethrow so the caller's own error handling still runs.
    reportServerUnreachable()
    throw err
  }

  // A gateway 5xx means the proxy is up but our backend is down/unavailable
  // — treat it as unreachable too. Any other status (including a 4xx the
  // server deliberately returned, e.g. 401/404/410) proves the server
  // answered, so we're reachable.
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    reportServerUnreachable()
  } else {
    reportServerReachable()
  }

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

/**
 * The `/accounts/me*` response shape (backend `AccountsService.toCamel`).
 * Shared by the three account endpoints below so the contract lives in
 * exactly one place.
 */
export interface MyAccount {
  id: string
  userId: string
  /** What the user actually pays for ('free' until they subscribe). */
  planId: string
  /**
   * What the user should be TREATED as: paid plan → itself; 'free'
   * with an active trial → 'starter'; otherwise 'free'. UI gating
   * (limits, badges, pickers) reads this, never `planId`.
   */
  effectivePlanId: string
  /** False until the user finishes (or skips) /onboarding. */
  onboardingComplete: boolean
  /**
   * NULL until the first post-onboarding dashboard open — that's the
   * `<TrialKickoff>` cue to call `startTrial` + celebrate. Both set
   * together, never reset.
   */
  trialStartedAt: string | null
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
}

export const ALGORITHM = {
  // ── Account ──────────────────────────────────────────────────────────────

  /**
   * Fetch the signed-in user's account row, upserting it if missing.
   * The backend's `getOrCreateAccount` is an idempotent upsert keyed by
   * `user_id`, so this route doubles as a self-healing safety net for
   * users who slipped past the `handle_new_user` DB trigger (which has
   * historically been wiped by Supabase platform upgrades — see the
   * note in `useAccount`). Cheap on the happy path: a single
   * `UPSERT … ON CONFLICT DO NOTHING` plus a SELECT.
   */
  getMyAccount: () => apiFetch<MyAccount>('/accounts/me'),

  /**
   * Mark onboarding complete (finish AND skip both call this — the
   * distinction is a PostHog event, not DB state). Idempotent.
   * Returns the updated account row.
   */
  completeOnboarding: () =>
    apiFetch<MyAccount>('/accounts/me/onboarding-complete', { method: 'POST' }),

  /**
   * Start the 7-day free trial (now / now + 7 days). Idempotent and
   * race-safe server-side; paid plans are exempt (no-op). Returns the
   * account row either way — callers decide whether to celebrate
   * based on their own prior read, not the response.
   */
  startTrial: () => apiFetch<MyAccount>('/accounts/me/start-trial', { method: 'POST' }),

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

  /**
   * Total view count for the authenticated user, across all their
   * projects. Used by the sidebar plan card so it can show "X / Y
   * views" without eagerly loading every view (which would be
   * expensive and is also undesirable — most views aren't needed
   * until the user navigates into a folder).
   *
   * Cheap on the backend: HEAD `select` with `count: 'exact'` —
   * just the integer, no row payload.
   */
  getViewsCount: () => apiFetch<{ count: number }>('/views/count'),

  /**
   * Persist a new ordering for the views in one container (project
   * root when `folderId` is null, a folder otherwise). The full desired
   * sequence is sent — the backend rewrites every view's `position` to
   * match its index in the array. 204 No Content on success.
   */
  reorderViews: (
    projectId: string,
    folderId: string | null,
    orderedViewIds: string[],
  ) =>
    apiFetch<void>('/views/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ projectId, folderId, orderedViewIds }),
    }),

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

  /**
   * Ad-hoc PostHog event-count chart for the overview chart's
   * cascade-dropdown overlay. Takes `eventName` directly instead of
   * a stored view id — the picker dialog hands the name straight
   * here. Returns the same `{ points: ChartPoint[] }` shape as
   * Stripe / GA's chart-data so `useConnectionMetricSeries` can
   * merge results uniformly.
   */
  getPosthogEventChartData: (
    connectionId: string,
    eventName: string,
    dateFrom?: string,
    dateTo?: string,
    mode?: 'daily' | 'weekly' | 'monthly',
    tz?: string | null,
  ) =>
    apiFetch<{ points: { label: string; value: number }[] }>(
      `/posthog/views/event-chart-data?connectionId=${connectionId}&eventName=${encodeURIComponent(eventName)}${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo ?? dateFrom}` : ''}${mode ? `&mode=${mode}` : ''}${tzParam(tz)}`,
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

  // ── Billing ──────────────────────────────────────────────────────────────
  // Creates a Stripe Checkout Session for the chosen plan and
  // returns the hosted-checkout URL. Frontend `window.location =
  // url` redirects the browser; Stripe handles the rest of the
  // flow + redirects back to /hub?upgraded=<planId> on success or
  // /hub?upgrade_cancelled=1 on cancel.
  //
  // Backend resolves planId → stripe_price_id (and optional
  // intro coupon) from the `subscriptions` table, then creates or
  // reuses the Stripe Customer linked to this user.
  createCheckoutSession: (planId: string) =>
    apiFetch<{ url: string }>('/billing/checkout-session', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  // ── Feedback ─────────────────────────────────────────────────────────────
  /**
   * Send a satisfaction-survey result from the in-dashboard
   * `<FeedbackWidget>`. The backend resolves the user's email
   * server-side from their auth record (we don't pass it from the
   * client — the body-as-source-of-truth design would let any user
   * spoof a different sender in the founder's inbox).
   *
   * `rating` is the 1-5 emoji ladder picked in the widget (1 =
   * very unhappy, 5 = very happy). `message` is the free-text
   * comment, optional — the widget submits a rating-only result
   * with `message: null` when the textarea is empty.
   */
  submitFeedback: (rating: number, message: string | null) =>
    apiFetch<{ id: string; delivered: boolean }>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ rating, message }),
    }),

  // ── Suggestions ──────────────────────────────────────────────────────────
  /**
   * Send a feature-request from the sidebar "Suggest a feature"
   * widget. Backend resolves the user's email from their auth
   * record (mirrors `submitFeedback`'s no-client-trust pattern).
   * The string is the suggestion text only — the rest of the
   * envelope (subject line, footer, etc.) is composed server-side.
   */
  submitSuggestion: (suggestion: string) =>
    apiFetch<{ id: string; delivered: boolean }>('/suggestions', {
      method: 'POST',
      body: JSON.stringify({ suggestion }),
    }),

  // ── People (cross-platform identity graph) ───────────────────────────────
  /**
   * List a project's end-users (people), newest-first. Backs the
   * "General → Users" view. `limit` caps the page (backend clamps to
   * 500). `search` does a cheap email/name match.
   *
   * Returns `{ people, isResyncing }`: the people we have RIGHT NOW plus
   * whether the backend kicked off a background resync because the data
   * was stale. When `isResyncing` is true the frontend keeps the list
   * visible (with a loading hint) and polls again until it flips false —
   * see `ProjectPeople`. Pass `autoResync: false` to read without ever
   * triggering a resync (the flag then just reflects an already-running one).
   */
  getPeople: (
    projectId: string,
    opts?: { limit?: number; search?: string; autoResync?: boolean },
  ) => {
    const params = new URLSearchParams({ projectId })
    if (opts?.limit != null) params.set('limit', String(opts.limit))
    if (opts?.search) params.set('search', opts.search)
    if (opts?.autoResync === false) params.set('autoResync', 'false')
    return apiFetch<PeopleListResult>(`/people?${params.toString()}`)
  },

  /**
   * "Sync people" — populate the project's people index from all its
   * identity-bearing connections (Stripe, PostHog, …) in one call.
   * Returns the total processed + a per-connection breakdown. Backs
   * the Users view's empty-state button and 3-dots menu item.
   */
  syncPeople: (projectId: string) =>
    apiFetch<{
      processed: number
      connections: {
        connectionId: string
        source: string
        processed: number
        /** Set when this connection's sync failed wholesale. */
        error?: string
      }[]
    }>('/people/sync', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),

  /**
   * One person's event timeline, newest-first. Backs the bottom-sheet
   * that opens when you click a row in the Users table. `limit` caps
   * the page (backend clamps to 500, default 100).
   */
  getPersonEvents: (personId: string, opts?: { limit?: number }) => {
    const params = new URLSearchParams()
    if (opts?.limit != null) params.set('limit', String(opts.limit))
    const qs = params.toString()
    return apiFetch<PersonEvent[]>(`/people/${personId}/events${qs ? `?${qs}` : ''}`)
  },
}

/**
 * One end-user in the cross-platform people graph. Mirrors the
 * backend `PeopleService` camelCase shape. `displayName` /
 * `primaryEmail` are null until some connected platform supplies
 * them. `updatedAt` is "last time we observed activity/identity for
 * this person" — the sort key for the recent-first users list.
 */
/**
 * Response shape of `GET /people` (backend `PeopleController.list`).
 * `people` is the current page; `isResyncing` is true while the backend
 * is pulling fresher data in the background — the UI shows a loading hint
 * (skeleton top rows) and polls until it flips false.
 */
export interface PeopleListResult {
  people: PersonRow[]
  isResyncing: boolean
}

export interface PersonRow {
  id: string
  projectId: string
  displayName: string | null
  primaryEmail: string | null
  /** ISO 3166-1 alpha-2 country code (PostHog geoip / Stripe address);
   *  null until a platform resolves it. The UI derives flag + name. */
  country: string | null
  /** First-touch traffic source ('direct', 'google.com', …); null for
   *  Stripe-only people (a card payment has no referrer). */
  initialSource: string | null
  /** Platform timestamp (ISO) — the "Last seen" value + sort key.
   *  Pre-event-ingestion this is effectively first-seen. */
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * One event on a person's timeline. Mirrors the backend
 * `PeopleService.getPersonEvents` camelCase shape. `source` is the
 * detecting system ('stripe' | 'posthog' | …); `eventLabel` is the
 * human label (falling back to `eventKey`); `occurredAt` is when it
 * happened (the newest-first sort key).
 */
export interface PersonEvent {
  id: string
  occurredAt: string
  /** Structured payload — e.g. `{ amount, currency, status }` for a
   *  Stripe charge. Empty `{}` when the source carries none. */
  properties: Record<string, unknown>
  /** The platform's own id for this occurrence (idempotency key). */
  sourceEventId: string
  connectionId: string | null
  /** Machine key for the type ('charge_succeeded', '$pageview', …). */
  eventKey: string | null
  /** Human label ('Payment', 'Page view', …); null only if unlabelled. */
  eventLabel: string | null
  /** Detecting system: 'stripe' | 'posthog' | 'google_analytics' | … */
  source: string | null
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

export interface OverviewCountry {
  /** ISO 3166-1 alpha-2 (e.g. 'US', 'GB'). Stable key + flag input. */
  countryCode: string
  /** Display name; may be empty when PostHog didn't denormalise it. */
  countryName: string
  visitors: number
  /** 0–1, precomputed server-side. */
  share: number
}

export interface OverviewCountriesResponse {
  countries: OverviewCountry[]
  /** Same provider-routing semantics as `OverviewUsersResponse`. */
  provider: 'google_analytics' | 'posthog' | null
}

/**
 * One row of the overview panel's Pages tab. `pageviews` is the
 * headline metric (how many pages were viewed, regardless of who);
 * `visitors` = unique people who viewed the path. `share` is
 * pageview-based, 0–1, precomputed server-side.
 */
export interface OverviewPage {
  path: string
  pageviews: number
  visitors: number
  share: number
}

export interface OverviewPagesResponse {
  pages: OverviewPage[]
  /** Pages are supported on BOTH providers (GA `pagePath`, PostHog
   *  `$pathname`); `null` = no traffic provider connected. */
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
  //
  // `tz` rides along (browser-resolved, same as the chart) so the
  // panel's date window matches the chart's — these used to default
  // to UTC server-side while the chart bucketed in the user's tz,
  // which made "today's" totals disagree between the two surfaces.
  getSources: (projectId: string, dateFrom: string, dateTo: string, limit = 100) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return apiFetch<{ sources: OverviewSource[] }>(
      `/project-overview/sources?projectId=${projectId}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${limit}&tz=${encodeURIComponent(tz)}`,
    )
  },

  getUsers: (projectId: string, dateFrom: string, dateTo: string, limit = 100) =>
    apiFetch<OverviewUsersResponse>(
      `/project-overview/users?projectId=${projectId}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${limit}`,
    ),

  getCountries: (projectId: string, dateFrom: string, dateTo: string, limit = 50) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return apiFetch<OverviewCountriesResponse>(
      `/project-overview/countries?projectId=${projectId}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${limit}&tz=${encodeURIComponent(tz)}`,
    )
  },

  /** Top pages by pageview count — the panel's "Pages" tab. */
  getPages: (projectId: string, dateFrom: string, dateTo: string, limit = 50) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return apiFetch<OverviewPagesResponse>(
      `/project-overview/pages?projectId=${projectId}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${limit}&tz=${encodeURIComponent(tz)}`,
    )
  },

  getConversionEvents: (connectionId: string) =>
    apiFetch<{ events: { name: string }[] }>(
      `/project-overview/conversion-events?connectionId=${connectionId}`,
    ),
}
