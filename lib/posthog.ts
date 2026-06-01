import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!token) return

  posthog.init(token, {
    // Same-origin reverse proxy — `next.config.ts` rewrites `/ingest/*`
    // to PostHog's host. Going through our own domain bypasses most
    // ad / tracker blockers (uBlock Origin and Brave's shields both
    // hit posthog.com directly but not databerry.app/ingest), so the
    // baseline capture rate is materially higher than direct.
    api_host: '/ingest',
    ui_host: host ?? 'https://us.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    session_recording: {
      maskAllInputs: true,
    },
    enable_recording_console_log: true,
  })
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.capture(event, properties)
}

/**
 * Report a caught error to PostHog Error Tracking + a same-named
 * funnel event in one call.
 *
 * Two things happen:
 *   1. `posthog.captureException(err, ...)` files the error against
 *      PostHog's exception view (the equivalent of a Sentry issue).
 *      We use it instead of @sentry/nextjs because we haven't
 *      installed Sentry yet — PostHog's error capture isn't as rich,
 *      but it's already configured and doesn't add another vendor.
 *   2. We ALSO `posthog.capture(event, ...)` the named event with
 *      `error`/`errorMessage` properties so the same row shows up in
 *      Insights funnels (e.g. "Connection-create attempted →
 *      Connection-create errored"). Filter by `error is set` to
 *      isolate failures.
 *
 * Pass the original Error object so PostHog can extract the stack
 * frame; everything else goes through as event properties.
 *
 * @future To also send to Sentry, install `@sentry/nextjs` and
 *   add `Sentry.captureException(err, { contexts: { event,
 *   properties } })` here. The call sites already pass everything
 *   Sentry needs.
 */
export function captureError(
  event: string,
  err: unknown,
  properties?: Record<string, unknown>,
) {
  if (typeof window === 'undefined') return
  const errorMessage = err instanceof Error ? err.message : String(err)
  const errorName = err instanceof Error ? err.name : 'Unknown'
  const props = {
    ...properties,
    error: errorMessage,
    errorName,
    eventName: event,
  }
  // Exception view — file under PostHog's error tracking surface.
  // Wrap a bare string in an Error so captureException always gets
  // something with a stack.
  posthog.captureException(err instanceof Error ? err : new Error(errorMessage), props)
  // Funnel view — same row also lands as the named capture so it's
  // counted alongside the success-side events.
  posthog.capture(event, props)
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.identify(userId, properties)
  // Register `user_id` as a super property so every subsequent event
  // automatically includes it. The distinct_id already equals the
  // userId after identify, but having it as an explicit event
  // property makes filtering / grouping in PostHog Insights one
  // click instead of "filter by distinct_id" which reads less
  // obviously. Reset is wiped by `posthog.reset()` below.
  posthog.register({ user_id: userId })
}

export function resetUser() {
  if (typeof window === 'undefined') return
  // `reset()` also clears super properties (incl. the `user_id` we
  // registered in `identifyUser`), so the next anonymous session
  // starts clean.
  posthog.reset()
}

/**
 * Canonical event names. Centralised so we don't end up with
 * `project-created` AND `Project Created` AND `project_created` in
 * the PostHog inbox from different files. Add a new event here, then
 * reference it via `EVENT.X` at the call site.
 *
 * Naming convention: `<area>_<noun>_<verb>` (snake_case, past tense
 * verbs since events are things that already happened). PostHog
 * Insights groups events by name lexically — clustering them by
 * area keeps the dropdown navigable.
 */
export const EVENT = {
  // ── Auth (landing) ────────────────────────────────────────────────
  SIGNED_UP: 'signed_up',
  LOGGED_IN: 'logged_in',
  OAUTH_INITIATED: 'oauth_initiated',
  // ── Landing CTAs ──────────────────────────────────────────────────
  LANDING_TIER_CTA_CLICKED: 'landing_tier_cta_clicked',
  LANDING_CONTACT_FORM_SUBMITTED: 'landing_contact_form_submitted',
  LANDING_FOOTER_LINK_CLICKED: 'landing_footer_link_clicked',
  // ── Dashboard creation flows ──────────────────────────────────────
  PROJECT_CREATED: 'project_created',
  VIEW_CREATED: 'view_created',
  CONNECTION_CREATED: 'connection_created',
  /**
   * Fired when `connections.createConnection` throws. Covers both
   * regular (Stripe, PostHog, GA, Vercel, etc.) and MCP connection
   * types — the attempt-side `CONNECTION_CREATED` event isn't
   * symmetrical because by design it only fires on success
   * (manually-created connections only; OAuth ones land via the
   * callback hook). The MCP add modal goes through the same code
   * path so it's covered here too.
   *
   * Parameters: { connectionType, error, errorName }
   *   - `connectionType`: 'stripe' | 'posthog' | 'mcp' | …
   *   - `error`: human-readable failure message (often the backend's
   *     own 400 framing — "MCP server didn't respond within 10s",
   *     "Stripe didn't accept this key", etc.).
   *   - `errorName`: the JS Error class name (TypeError, etc.).
   * Filter on `connectionType = mcp` in PostHog to isolate MCP
   * failures specifically.
   */
  CONNECTION_CREATE_FAILED: 'connection_create_failed',
  FOLDER_CREATED: 'folder_created',
  // ── Dashboard navigation / intent ─────────────────────────────────
  TIER_PICKER_OPENED: 'tier_picker_opened',
  FOLDER_OPENED: 'folder_opened',
  DATE_MODE_CHANGED: 'date_mode_changed',
  // ── Dashboard interactions ────────────────────────────────────────
  VIEW_REFRESHED: 'view_refreshed',
  VIEW_PINNED: 'view_pinned',
  /**
   * Fired BOTH when the user submits a chat message AND when that
   * request errors. Same name on both so a single PostHog event
   * stream covers the Ask-AI funnel; parameter shape distinguishes
   * the two paths:
   *
   *   On submit (always):
   *     { prompt, promptLength, messageIndex }
   *   On error (additionally):
   *     { ...the submit props,
   *       error,            // human-readable message
   *       errorSource,      // 'network' | 'backend'
   *       httpStatus?       // present when errorSource === 'backend'
   *     }
   *
   * Filter `error is set` in PostHog Insights to see failures
   * (counts and prompts); leave it as-is to count submissions.
   * Successful turns fire ONCE (the submit event). Failed turns
   * fire TWICE (submit + error) so the funnel doesn't lose the
   * intent if the network drops mid-request.
   */
  ASK_AI_MESSAGE_SENT: 'ask_ai_message_sent',
} as const

export type EventName = (typeof EVENT)[keyof typeof EVENT]
