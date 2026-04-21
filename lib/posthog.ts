import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!token) return

  posthog.init(token, {
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
}

export function resetUser() {
  if (typeof window === 'undefined') return
  posthog.reset()
}
