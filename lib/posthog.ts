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
  FOLDER_CREATED: 'folder_created',
  // ── Dashboard navigation / intent ─────────────────────────────────
  TIER_PICKER_OPENED: 'tier_picker_opened',
  FOLDER_OPENED: 'folder_opened',
  DATE_MODE_CHANGED: 'date_mode_changed',
  // ── Dashboard interactions ────────────────────────────────────────
  VIEW_REFRESHED: 'view_refreshed',
  VIEW_PINNED: 'view_pinned',
  ASK_AI_MESSAGE_SENT: 'ask_ai_message_sent',
} as const

export type EventName = (typeof EVENT)[keyof typeof EVENT]
