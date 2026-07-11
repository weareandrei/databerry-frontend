'use client'

/**
 * Landing-page contact form. Submits via `POST /contact` to the
 * NestJS backend, which uses Resend (server-side) to forward the
 * message to `team@heavenmade.org` with the visitor's email set as
 * the Reply-To header — so a single "Reply" in the receiving inbox
 * goes straight back to them.
 *
 * SECURITY: the Resend API key lives only in the backend env. The
 * frontend never sees it; we just hit our own API and let the
 * server handle the provider call.
 *
 * Spam mitigation:
 *   - Honeypot field (`website`) — visually hidden, real users
 *     never touch it; bots that auto-fill every input get caught
 *     server-side and silently absorbed.
 *   - Length validation on both client + server; client provides
 *     fast feedback, server is the source of truth.
 *
 * Visual conventions match the rest of the landing page (eyebrow +
 * Bricolage heading + reveal-on-scroll). Sits below the FAQ section
 * with a `pt-0` so the spacing reads as one connected support block.
 */

import { useState, type FormEvent } from 'react'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'
import { EVENT, trackEvent } from '@/lib/posthog'

const CONTACT_EMAIL = 'team@heavenmade.org'

// Same regex used in `viewCardCustomerList` etc — good-enough shape
// check; server-side validation has the final say.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// `Status` is a small state machine — keeps the post-submit UI
// branches obvious + prevents impossible combinations (e.g.
// "submitting + error at the same time").
type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'sent' }
  | { kind: 'error'; message: string }

export default function Contact() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')  // honeypot — see render
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const cleanEmail = email.trim()
    const cleanMessage = message.trim()

    // Client-side validation — fast feedback so the user fixes
    // typos before we round-trip to the server. Server validates
    // these same constraints again, with the server's word being
    // final.
    if (!EMAIL_RE.test(cleanEmail)) {
      setStatus({ kind: 'error', message: 'Please enter a valid email address so we can reply.' })
      return
    }
    if (cleanMessage.length < 10) {
      setStatus({ kind: 'error', message: 'Tell us a bit more — even a sentence or two.' })
      return
    }

    setStatus({ kind: 'submitting' })

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          message: cleanMessage,
          // Honeypot — only filled by bots. Server inspects this
          // and silently drops the request when non-empty.
          website,
        }),
      })

      if (!res.ok) {
        // Try to surface the server's error message (it's
        // user-facing copy: "Message is too short", etc.). Fall
        // back to a generic line if the body isn't JSON.
        let detail: string | undefined
        try {
          const body = (await res.json()) as { message?: string }
          detail = body.message
        } catch {
          // intentional empty — generic fallback below
        }
        setStatus({
          kind: 'error',
          message:
            detail ??
            `Couldn't send your message. Try again or email ${CONTACT_EMAIL} directly.`,
        })
        return
      }

      setStatus({ kind: 'sent' })
      // Only fire on actual server-accepted submission — not on
      // local-validation failures or 4xx/5xx responses, since those
      // are user errors or transient outages, not "the user filled
      // the form successfully" which is what we actually want to
      // measure. `messageLength` is a useful filter (very short
      // messages are usually spam-y / bot probes).
      trackEvent(EVENT.LANDING_CONTACT_FORM_SUBMITTED, {
        messageLength: cleanMessage.length,
      })
      // Clear the inputs so the user sees an empty form ready for
      // another message. Honeypot stays as-is (it's invisible).
      setEmail('')
      setMessage('')
    } catch {
      // Network failure (offline, DNS, CORS preflight reject, etc).
      setStatus({
        kind: 'error',
        message: `Couldn't reach the server. Try again or email ${CONTACT_EMAIL} directly.`,
      })
    }
  }

  return (
    // `pt-0` deliberately — FAQ above already provides ample top padding,
    // and the two sections read better as one cohesive support block
    // than as two with a big white gap between them.
    <section id="contact" className="relative px-[10vw] py-42 pt-0 bg-white">
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
        <RevealOnScroll delay={0.05} y={16}>
          <h2
            className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            Contact us
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={0.1} y={16}>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground max-w-xl">
            We read every message. Drop your email and what&apos;s on your mind
            — we&apos;ll get back to you within 48&nbsp;hours.
          </p>
        </RevealOnScroll>
      </div>

      <RevealOnScroll delay={0.15} y={20}>
        <form
          onSubmit={handleSubmit}
          className="mt-12 max-w-xl mx-auto flex flex-col gap-4"
        >
          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-medium text-muted-foreground mb-1.5"
            >
              Your email
            </label>
            <input
              id="contact-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={status.kind === 'submitting'}
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-shadow disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-sm font-medium text-muted-foreground mb-1.5"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What would you like to ask or tell us?"
              disabled={status.kind === 'submitting'}
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-shadow resize-none disabled:opacity-60"
            />
          </div>

          {/*
            Honeypot — visually hidden via classes that defeat the
            usual ways a screen-readered user could land on it (we
            also `aria-hidden + tabIndex={-1}` so assistive tech and
            keyboard nav skip it). Bots that read the DOM and
            auto-fill every input get caught here. The field name
            is intentionally generic ("website") so a bot has no
            reason to skip it.
          */}
          <div
            aria-hidden
            className="absolute left-[-9999px] w-px h-px overflow-hidden"
          >
            <label htmlFor="contact-website">Website (leave blank)</label>
            <input
              id="contact-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={e => setWebsite(e.target.value)}
            />
          </div>

          {status.kind === 'error' && (
            <p className="text-sm text-red-500" role="alert">
              {status.message}
            </p>
          )}

          <button
            type="submit"
            disabled={status.kind === 'submitting'}
            className="inline-flex items-center justify-center gap-2 mt-2 rounded-full bg-secondary px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-secondary/90 transition-colors disabled:opacity-60 disabled:hover:bg-secondary"
          >
            {status.kind === 'submitting' ? 'Sending…' : 'Send message'}
            {status.kind !== 'submitting' && (
              <PaperPlaneTilt size={14} weight="bold" />
            )}
          </button>

          {status.kind === 'sent' && (
            <p
              className="text-sm text-center mt-2 text-emerald-600"
              role="status"
            >
              Got it — we&apos;ll reply within 48 hours. Want to add more?
              Send another message above.
            </p>
          )}
        </form>
      </RevealOnScroll>
    </section>
  )
}
