'use client'

/**
 * Inline error banner — the canonical "something went wrong while
 * you were filling this form" surface across every connection
 * creation flow (PostHog, Stripe Manual, Vercel, Webhook).
 *
 * Why a banner and not a toast: the user is mid-form. They need to
 * see *what* to fix while they're editing — toasts disappear too
 * quickly and offer no anchor when re-reading the message. The
 * banner stays put until the parent clears the error (typically on
 * the next submit attempt) or the modal closes.
 *
 * Tone: amber, not red. These are *fixable* errors (wrong key, wrong
 * region, typo) — the user can correct and retry without losing
 * state. Same colour family as the view-tile reauth prompt and the
 * empty-overview "connect analytics" hint, so the warning treatment
 * reads consistently across the dashboard.
 *
 * Renders nothing when `message` is null/empty — the parent doesn't
 * need to gate on `error && <Banner />`, just `<Banner message={error} />`.
 */

import { Warning } from '@phosphor-icons/react'

interface InlineErrorBannerProps {
  message: string | null
}

export function InlineErrorBanner({ message }: InlineErrorBannerProps) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <Warning size={14} weight="bold" className="shrink-0 mt-0.5" />
      <p className="leading-relaxed">{message}</p>
    </div>
  )
}
