/**
 * One place for user-facing error strings.
 *
 * Every catch site in the view layer used to do
 * `setError(err instanceof Error ? err.message : 'Failed')`, which
 * leaks raw backend error text — fine for developers, less fine for
 * users who shouldn't see "stripe_subscriptions read (mrr): JWT expired".
 *
 * Goes hand-in-hand with `useViewResource`: typed errors keep their
 * identity (so the UI can route them to dedicated affordances like
 * the reauth banner or reattach dialog); everything else collapses
 * to a generic, friendly fallback.
 */

import {
  ConnectionMissingError,
  IntegrationReauthError,
} from '@/lib/api'

/**
 * Generic fallback used when a view-card fetch throws an *untyped*
 * error (network blip, 500, malformed payload, anything backend-side
 * that wasn't routed through one of the structured exceptions).
 *
 * Intentionally vague — the user can hit Refresh and see if it sticks.
 * If it does, the underlying issue gets reported via Sentry/console
 * already; if it doesn't, the empty-state copy on each card gives
 * them a next step.
 */
const VIEW_FALLBACK = "Couldn't load this view."

/**
 * Coerce any error into a user-safe string. Use at *string-only*
 * surfaces — i.e. when the consumer can't act on the error type
 * (typed-error consumers should keep the instance and `instanceof`-check
 * it themselves so they can render the inline reconnect / reattach
 * affordances).
 */
export function viewErrorMessage(err: unknown): string {
  if (err instanceof IntegrationReauthError) {
    return 'Reconnect this integration to keep this view in sync.'
  }
  if (err instanceof ConnectionMissingError) {
    return 'This connection no longer exists — pick another one.'
  }
  return VIEW_FALLBACK
}
