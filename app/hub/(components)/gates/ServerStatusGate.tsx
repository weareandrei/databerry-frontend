'use client'

/**
 * Server-down gate for `/hub/*`.
 *
 * When the backend can't be reached — every `apiFetch` (projects, account /
 * user data, view tiles, …) fails with a network-level error or a gateway
 * 5xx — `lib/serverHealth` flips to "unreachable" and this component covers
 * the whole app with a simple "server is down" notice plus a support
 * contact. It sits at the top z-tier so no half-loaded dashboard chrome
 * peeks through.
 *
 * Recovery is automatic: while down we re-probe the server on an interval;
 * the moment it answers again we hard-reload so the bootstrap fetches that
 * failed (projects/folders/connections/account) re-run from a clean slate
 * rather than leaving the user on an empty dashboard. The "Try again"
 * button does the same reload on demand.
 *
 * Default state is "reachable", so in the normal case this renders nothing.
 */

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { ArrowsClockwise, Plugs } from '@phosphor-icons/react'
import { useServerReachable } from '@/lib/serverHealth'
import { ALGORITHM } from '@/lib/api'

/** Support address shown on the server-down screen. */
const SUPPORT_EMAIL = 'team@heavenmade.org'

/** How often to re-probe the server while it looks down. */
const RETRY_INTERVAL_MS = 5000

export const ServerStatusGate = () => {
  const reachable = useServerReachable()

  // Track whether we were ever down this session, so a recovery (reachable
  // flipping false → true) triggers exactly one reload — and a normal first
  // load that was never down doesn't reload at all.
  const wasDown = useRef(false)

  // Auto-retry while down: re-run a real bootstrap request on an interval.
  // We deliberately reuse a normal endpoint (not a bare root ping) so the
  // probe is classified by the SAME `apiFetch` logic that detected the
  // outage — a 5xx keeps us down, a real response flips `reachable` back to
  // true, which the effect below turns into a reload. The result is
  // discarded; the reload re-fetches everything cleanly.
  useEffect(() => {
    if (reachable) return
    const id = setInterval(() => {
      void ALGORITHM.getProjects().catch(() => {})
    }, RETRY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [reachable])

  useEffect(() => {
    if (!reachable) {
      wasDown.current = true
      return
    }
    if (wasDown.current && typeof window !== 'undefined') {
      window.location.reload()
    }
  }, [reachable])

  if (reachable) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: 'var(--c-surface)' }}
      role="alert"
      aria-live="assertive"
    >
      <Image
        src="/databerry_logo_v2.svg"
        alt="Databerry"
        width={44}
        height={44}
        className="rounded-lg"
        priority
      />

      <div className="max-w-sm">
        <h1 className="text-lg font-semibold text-foreground">Server is down</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re having trouble reaching our servers right now. This page
          will reconnect automatically as soon as they&apos;re back.
        </p>
        <p className="mt-3 text-sm text-subtle">
          If you have any questions, contact{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer"
      >
        <ArrowsClockwise size={14} weight="bold" />
        Try again
      </button>
    </div>
  )
}
