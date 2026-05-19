'use client'

/**
 * OAuth callback handler — runs on the connections page when the
 * user returns from Stripe / Calendly / Google's consent screen.
 *
 * Wire shape (per provider, set by the backend OAuth controllers):
 *   /hub/connections?<provider>=connected                    → success
 *   /hub/connections?<provider>=error&reason=<code>          → failure (new)
 *   /hub/connections?<provider>=error                        → failure (legacy, unknown reason)
 *
 * Reason codes are uniform across providers (see
 * `backend/src/stripe/connection/oauth.ts#OAuthFailureReason`); the
 * per-provider `REASONS` map below translates each code into a
 * user-friendly toast tailored to that provider's terminology.
 *
 * Falls back to a per-provider generic line when the code is
 * missing or unrecognised — so legacy redirects (and any future
 * codes we haven't mapped yet) still produce a coherent message.
 */

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'
import { EVENT, trackEvent } from '@/lib/posthog'

type Provider = 'stripe' | 'calendly' | 'google_analytics' | 'sentry'

// Per-provider message map. Missing keys fall back to `unknown` for
// the same provider — never a generic "something went wrong".
const REASONS: Record<Provider, Record<string, string>> = {
  stripe: {
    cancelled:
      'You declined to authorize Stripe. No connection was made — try again whenever you\'re ready.',
    state_invalid:
      'Your Stripe connection link expired. Start the connection again from the Connections page.',
    token_exchange:
      'Stripe rejected the connection. Try again — if it keeps failing, your Stripe account may have Connect restrictions enabled.',
    // Backend detects Stripe's "Authorization code provided does not
    // belong to you" — the canonical signature for STRIPE_CLIENT_ID and
    // STRIPE_SECRET_KEY pointing at different modes (test vs live).
    // Stripe Connect surfaces two client_ids per app in its dashboard
    // and it's easy to grab the wrong one.
    client_mode_mismatch:
      'Stripe rejected the code: your STRIPE_CLIENT_ID and STRIPE_SECRET_KEY are in different modes (test vs live). Check the Connect settings in Stripe — pick the client_id that matches the mode of your secret key.',
    account_resolve:
      "We connected to Stripe but couldn't read your account info. Try once more in a moment.",
    credentials_save:
      "Stripe authorized fine, but we couldn't save the connection on our end. Try again.",
    unknown:
      'Something went wrong connecting Stripe. Try again, or use the manual API-key option as a fallback.',
  },
  calendly: {
    cancelled:
      'You declined to share your Calendly account. No connection was made.',
    state_invalid:
      'Your Calendly connection link expired. Start the connection again from the Connections page.',
    token_exchange:
      "Calendly rejected the connection. Make sure you're logged in to the right Calendly account and try again.",
    account_resolve:
      "We connected to Calendly but couldn't read your account info. Try once more in a moment.",
    credentials_save:
      "Calendly authorized fine, but we couldn't save the connection on our end. Try again.",
    unknown:
      'Something went wrong connecting Calendly. Try again.',
  },
  google_analytics: {
    cancelled:
      'You declined to share your Google Analytics account. No connection was made.',
    state_invalid:
      'Your Google Analytics connection link expired. Start the connection again from the Connections page.',
    token_exchange:
      'Google rejected the connection. This usually means your Google account doesn\'t have access to a GA4 property — confirm in analytics.google.com first.',
    account_resolve:
      "We connected to Google but couldn't list your GA4 properties. Try once more in a moment.",
    credentials_save:
      "Google authorized fine, but we couldn't save the connection on our end. Try again.",
    unknown:
      'Something went wrong connecting Google Analytics. Try again.',
  },
  sentry: {
    cancelled:
      'You declined to install the Sentry integration. No connection was made.',
    state_invalid:
      'Your Sentry connection link expired. Start the connection again from the Connections page.',
    token_exchange:
      "Sentry rejected the connection. Make sure you're an admin of the org you tried to install into and try again.",
    account_resolve:
      "We installed into Sentry but couldn't read your org info. Try once more in a moment.",
    credentials_save:
      "Sentry authorized fine, but we couldn't save the connection on our end. Try again.",
    unknown:
      'Something went wrong connecting Sentry. Try again.',
  },
}

const PROVIDER_LABELS: Record<Provider, string> = {
  stripe: 'Stripe',
  calendly: 'Calendly',
  google_analytics: 'Google Analytics',
  sentry: 'Sentry',
}

function isProvider(p: string): p is Provider {
  return (
    p === 'stripe' ||
    p === 'calendly' ||
    p === 'google_analytics' ||
    p === 'sentry'
  )
}

export function useOAuthCallback(provider: string) {
  const { connections } = useDashboard()
  const searchParams = useSearchParams()

  useEffect(() => {
    const status = searchParams.get(provider)
    if (status === 'connected') {
      const label = isProvider(provider) ? PROVIDER_LABELS[provider] : provider
      // Mirror the `connection_created` event the manual-create path
      // fires from `useConnections.createConnection`, so the two
      // sources of new connections (OAuth + form) are queryable as a
      // single funnel. The `?connectionId=…` param is set by the
      // Stripe / GA callbacks; Calendly and Sentry don't set it
      // today (they redirect straight to `=connected` without a
      // product/property picker step), so we tolerate it missing.
      trackEvent(EVENT.CONNECTION_CREATED, {
        connectionType: provider,
        connectionId: searchParams.get('connectionId') ?? null,
        source: 'oauth',
      })
      toast.success(`${label} connected successfully!`)
      connections.loadConnections()
      window.history.replaceState({}, '', '/hub/connections')
    } else if (status === 'error') {
      const reason = searchParams.get('reason') ?? 'unknown'
      const message = isProvider(provider)
        ? (REASONS[provider][reason] ?? REASONS[provider].unknown)
        : `Failed to connect ${provider}. Please try again.`
      // OAuth failures need attention — bumping duration to 15s so the
      // user actually sees the toast even if they had flicked away to
      // check backend logs (the default 4s was the original "I never
      // saw a toast" complaint). The reason code in the description
      // makes the toast self-documenting — a user can paste it
      // verbatim when asking for help instead of having to find it
      // in the URL bar before it gets cleared.
      const label = isProvider(provider) ? PROVIDER_LABELS[provider] : provider
      toast.error(`${label} connection failed`, {
        description: message,
        duration: 15_000,
      })
      window.history.replaceState({}, '', '/hub/connections')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
