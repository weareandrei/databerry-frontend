'use client'

import { useState } from 'react'
import { ArrowsClockwise, Plug } from '@phosphor-icons/react'
import { ALGORITHM } from '@/lib/api'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import type { IntegrationReauthError } from '@/lib/api'

/**
 * Inline "Reconnect <Integration>" prompt rendered inside a view tile when
 * `live-value` returns `INTEGRATION_NEEDS_REAUTH`.
 *
 * Click ⇒ fetch the provider's OAuth start URL and redirect. We reuse the
 * exact same start endpoints used by the connect-flow modal (see
 * `CreateConnectionModal#handleGoogleAnalyticsOAuth`/`handleCalendlyOAuth`),
 * so the existing callback infrastructure runs unchanged. On success the
 * cron's needs_reauth flag flips back to `'ok'` automatically.
 */
export function IntegrationReauthBanner({
  error,
}: {
  error: IntegrationReauthError
}) {
  const [busy, setBusy] = useState(false)
  const label = CONNECTION_DISPLAY_NAMES[error.integration] ?? error.integration

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      const { url } =
        error.integration === 'google_analytics'
          ? await ALGORITHM.getGoogleAnalyticsOAuthUrl()
          : await ALGORITHM.getCalendlyOAuthUrl()
      window.location.href = url
    } catch {
      // If the OAuth-start endpoint itself fails we just clear `busy` —
      // the badge stays visible so the user can retry. We don't toast
      // here because this banner is rendered inside many small tiles
      // and a per-tile toast spam would be noisy.
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors text-xs font-medium disabled:opacity-60 disabled:cursor-progress"
      title={`Reconnect ${label} to restore this view`}
    >
      {busy ? (
        <ArrowsClockwise size={11} weight="bold" className="animate-spin" />
      ) : (
        <Plug size={11} weight="bold" />
      )}
      Reconnect {label}
    </button>
  )
}
