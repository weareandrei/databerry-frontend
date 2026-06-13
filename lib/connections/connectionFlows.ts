/**
 * Connection-creation flows — framework-free, callable from ANY
 * surface (the dashboard's CreateConnectionModal, the /onboarding
 * sequence, future CLIs/settings pages). Extracted from
 * CreateConnectionModal so connection logic is no longer welded to
 * one dialog's state machine.
 *
 * Design rules:
 *   - No Redux, no DashboardContext, no toasts. Pure async calls
 *     against `ALGORITHM` plus centralized PostHog instrumentation.
 *   - Failures THROW (with the backend's user-friendly message on
 *     `err.message`). Callers decide presentation — inline banner in
 *     the modal, inline banner in onboarding, toast elsewhere.
 *   - Success/failure analytics fire HERE so every caller is
 *     instrumented for free: `connection_created` on success,
 *     `connection_create_failed` (+ exception capture) on failure.
 *     OAuth-flow connections are created server-side in the
 *     callback; those keep firing from `useOAuthCallback` instead.
 */

import { ALGORITHM } from '@/lib/api'
import { EVENT, trackEvent, captureError } from '@/lib/posthog'
import type { Connection } from '@/types/connection'

/** PostHog cloud regions offered in the region picker. */
export const POSTHOG_HOSTS = [
  { id: 'https://us.posthog.com', label: 'US Cloud' },
  { id: 'https://eu.posthog.com', label: 'EU Cloud' },
] as const

export interface PosthogProjectOption {
  id: string
  name: string
  organization: string | null
}

export interface VercelProjectOption {
  id: string
  name: string
}

/**
 * The one true connection-create call. Wraps
 * `ALGORITHM.createConnection` with the analytics every entry point
 * needs. Throws on failure (after capturing) — callers surface the
 * message however fits their UI.
 */
export async function createConnectionRecord(
  body: Omit<Connection, 'id' | 'createdAt' | 'userId'> & {
    config?: Record<string, unknown>
  },
  /** Where the create came from — lands on the PostHog event so we
   *  can split modal vs onboarding adoption. */
  source: 'manual' | 'onboarding' = 'manual',
): Promise<Connection> {
  try {
    const created = await ALGORITHM.createConnection(body)
    trackEvent(EVENT.CONNECTION_CREATED, {
      connectionId: created.id,
      connectionType: created.type,
      source,
    })
    return created
  } catch (err) {
    captureError(EVENT.CONNECTION_CREATE_FAILED, err, {
      connectionType: body.type,
      source,
    })
    throw err
  }
}

/**
 * Validate a PostHog personal API key + region by listing the
 * projects it can see. Step 1 of the PostHog connect flow. Throws
 * with the backend's hint (typo / wrong region) on failure.
 */
export function fetchPosthogProjects(
  apiKey: string,
  host: string,
): Promise<{ projects: PosthogProjectOption[] }> {
  return ALGORITHM.getPosthogProjects(apiKey.trim(), host)
}

/** Step 2 of the PostHog flow — persist key + picked PostHog project. */
export function connectPosthog(args: {
  apiKey: string
  host: string
  posthogProject: PosthogProjectOption
  /** Databerry project scope; null = Common. */
  projectId: string | null
  source?: 'manual' | 'onboarding'
}): Promise<Connection> {
  return createConnectionRecord(
    {
      name: args.posthogProject.name,
      type: 'posthog',
      projectId: args.projectId,
      config: {
        apiKey: args.apiKey.trim(),
        projectId: args.posthogProject.id,
        host: args.host,
      },
    },
    args.source ?? 'manual',
  )
}

/** Stripe via restricted API key (the non-OAuth path). */
export function connectStripeManual(args: {
  name: string
  apiKey: string
  projectId: string | null
  source?: 'manual' | 'onboarding'
}): Promise<Connection> {
  return createConnectionRecord(
    {
      name: args.name.trim() || 'Stripe',
      type: 'stripe_manual',
      projectId: args.projectId,
      config: { apiKey: args.apiKey.trim() },
    },
    args.source ?? 'manual',
  )
}

/** Custom webhook — server generates URL + API key on create. */
export function connectWebhook(args: {
  name: string
  projectId: string | null
  source?: 'manual' | 'onboarding'
}): Promise<Connection> {
  return createConnectionRecord(
    {
      name: args.name.trim() || 'Custom Webhook',
      type: 'webhook',
      projectId: args.projectId,
    },
    args.source ?? 'manual',
  )
}

/** Validate a Vercel personal token by listing its projects. */
export function fetchVercelProjects(
  token: string,
): Promise<{ projects: VercelProjectOption[] }> {
  return ALGORITHM.getVercelProjects(token.trim())
}

/** Persist the Vercel token + picked Vercel project. */
export function connectVercel(args: {
  token: string
  vercelProject: VercelProjectOption
  projectId: string | null
  source?: 'manual' | 'onboarding'
}): Promise<Connection> {
  return createConnectionRecord(
    {
      name: 'Vercel',
      type: 'vercel',
      projectId: args.projectId,
      config: {
        apiToken: args.token.trim(),
        projectId: args.vercelProject.id,
        projectName: args.vercelProject.name,
      },
    },
    args.source ?? 'manual',
  )
}

/** Connection types whose creation happens via an OAuth redirect. */
export type OAuthConnectionType =
  | 'google_analytics'
  | 'calendly'
  | 'sentry'
  | 'stripe'

/**
 * Resolve the provider's OAuth consent URL. Caller navigates
 * (`window.location.href = url`) — kept out of here so callers can
 * persist their own state (e.g. onboarding progress) before leaving
 * the page. The connection itself is created server-side in the
 * OAuth callback.
 */
export function getOAuthUrlFor(type: OAuthConnectionType): Promise<{ url: string }> {
  switch (type) {
    case 'google_analytics':
      return ALGORITHM.getGoogleAnalyticsOAuthUrl()
    case 'calendly':
      return ALGORITHM.getCalendlyOAuthUrl()
    case 'sentry':
      return ALGORITHM.getSentryOAuthUrl()
    case 'stripe':
      return ALGORITHM.getStripeOAuthUrl()
  }
}
