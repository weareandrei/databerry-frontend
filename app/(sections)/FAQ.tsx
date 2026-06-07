'use client'

/**
 * FAQ section for the landing page. Nine questions arranged in a
 * 3-column grid (2 cols on tablet, 1 on phone). Each card flips to
 * an orange "active" state on hover — same treatment the Features
 * section's badge has, just promoted to the whole tile.
 *
 * Question order — sorted by marketing impact, hook-first:
 *   1. Free to try? ──────── pricing hook (biggest conversion lever)
 *   2. Multiple projects? ─ targets the founder audience explicitly
 *   3. Code changes? ────── friction-removal (no engineering needed)
 *   4. Setup complexity ── friction-removal continued
 *   5. Tools available ── capability claim
 *   6. Tool not listed? ── flexibility, with `let us know` link
 *                          (scrolls to #contact)
 *   7. Write access? ───── trust
 *   8. Data safety ─────── security
 *   9. GDPR compliant? ── compliance close
 *
 * AI / SEO friendliness — the section emits Schema.org `FAQPage`
 * structured data as JSON-LD inside the section markup. Search
 * engines (Google, Bing) and AI agents (ChatGPT, Perplexity, etc.)
 * read this directly to surface Q&A in answer panels and chat
 * responses, without having to scrape the visual layout. The Q&A
 * pairs in `FAQS` are the source of truth for both the rendered
 * cards and the JSON-LD; an `aText` plain-text field exists on
 * every entry so the JSX-only enrichments (the inline `let us
 * know` link in #6) don't pollute the structured-data answer.
 *
 * Each question is also rendered with a real `<h3>`, so anything
 * that doesn't read JSON-LD still gets clean semantic HTML to
 * crawl. Cards aren't expandable accordions — every answer is in
 * the initial DOM, not behind a `<details>` toggle.
 *
 * Visual conventions match the rest of the landing page:
 *   - `px-[10vw] py-24 bg-white` section frame
 *   - `text-xs font-medium text-orange-500 uppercase tracking-widest` eyebrow
 *   - `text-4xl/5xl font-semibold tracking-tight` heading w/ Bricolage
 *   - `RevealOnScroll` for entrance animations
 */

import type { ReactNode } from 'react'
import { QuestionMark, ArrowRight } from '@phosphor-icons/react'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'

/**
 * Inline anchor used inside FAQ answers. The default state is orange
 * against the white card; on `group-hover` (when the card flips
 * orange-500) it goes white so it stays distinguishable from the
 * surrounding `white/90` body copy. Reused only by the "let us
 * know" link in the "tool not listed" entry today, but exported as
 * a small helper so future inline-link answers don't reinvent the
 * styling.
 */
function FAQInlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-semibold underline underline-offset-2 text-orange-500 group-hover:text-white transition-colors"
    >
      {children}
    </a>
  )
}

/**
 * Each FAQ entry has:
 *  - `q`     — the question (string, used in both render + JSON-LD)
 *  - `aText` — plain-text answer (used by JSON-LD AND as the
 *              fallback when no `aJsx` is provided). Required on
 *              every entry so SEO/AI structured data is always
 *              complete.
 *  - `aJsx`  — optional JSX-enriched answer (e.g. with inline
 *              links). When present, it overrides the rendered
 *              card body but DOESN'T touch the JSON-LD payload —
 *              search engines / AI see only `aText`.
 */
type FAQEntry = {
  q: string
  aText: string
  aJsx?: ReactNode
}

const FAQS: FAQEntry[] = [
  {
    q: 'Is it free to try?',
    aText:
      'Yes — free for the first 30 days, no credit card required. Connect everything, build your dashboard, and decide if it’s worth keeping.',
  },
  {
    q: 'Can I use it for multiple projects I track separately?',
    aText:
      'That’s exactly what it’s for. Databerry was built for founders running several products in parallel — one workspace, separate project views for each, all your data side-by-side without juggling tabs.',
  },
  {
    q: 'Do I need to add anything to my code to make this work?',
    aText:
      'No. Databerry is built for teams whose analytics, billing, and other tools are already set up — we read from those existing accounts so you can see everything in one place. No SDKs, no tracking snippets, no code changes.',
  },
  {
    q: 'How complex is the setup?',
    aText:
      'A few clicks, literally. OAuth integrations like Stripe and Google Analytics are one-click; API-key tools take about thirty seconds to paste in. No SDK, no engineering work — pick what to track and you’re done.',
  },
  {
    q: 'Which tools can I connect?',
    aText:
      'Today: Stripe, PostHog, Google Analytics, and custom webhooks. We ship new integrations every few weeks based on what users ask for.',
  },
  {
    q: 'What if I use a tool that’s not currently listed?',
    // Plain-text version — used for JSON-LD; identical content to
    // the JSX version with the link rendered as plain words. Keep
    // these in sync when editing.
    aText:
      'Tell us what you use. If the tool has a public API, we’ll usually ship the integration within a week — let us know what you need and we’ll build it.',
    aJsx: (
      <>
        Tell us what you use. If the tool has a public API, we’ll usually
        ship the integration within a week —{' '}
        <FAQInlineLink href="#contact">let us know</FAQInlineLink> what you
        need and we’ll build it.
      </>
    ),
  },
  {
    q: 'Do you have write access to my accounts?',
    aText:
      'No. Every connection is read-only by design. We request the minimum scope each provider supports (e.g. analytics.readonly for Google Analytics) and never modify, write, or delete data on the platforms you connect.',
  },
  {
    q: 'How safe is my data?',
    aText:
      'Multiple layers of encryption protect every credential — application-layer AES-256-GCM with per-user derived keys, TLS in transit, and disk-level encryption at rest. We also avoid persisting data we don’t need: query results pass through to your browser without being stored server-side.',
  },
  {
    q: 'Is it GDPR compliant?',
    aText:
      'Yes. Credentials are encrypted at the application layer on top of disk-level encryption at rest, you can request full data deletion at any time, and we minimise what we keep — only what’s needed to render your dashboards. Full details in our privacy policy.',
  },
]

/**
 * Schema.org `FAQPage` JSON-LD. Search engines and AI agents read
 * this directly — Google may show the FAQ under the result, and
 * agents like ChatGPT/Perplexity prefer structured data over
 * scraping the rendered HTML. Built once at module load from
 * `FAQS`, serialized into the section as a `<script>` tag.
 *
 * Spec: https://schema.org/FAQPage
 */
const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.aText,
    },
  })),
}

/**
 * One card. The hover state lives entirely in Tailwind via `group-hover`
 * — no JS state, just CSS transitions. Background flips orange, text
 * flips white, the icon's container flips white (with the orange `?`
 * staying visible against it).
 *
 * `cursor-default` because the card itself isn't interactive — clicking
 * doesn't navigate or expand. Treat it as a marketing tile, not an
 * accordion. (We could add expand-on-click later; not a v1 need.)
 */
function FAQCard({ q, a }: { q: string; a: ReactNode }) {
  // `a` may be a string (default plain text) or arbitrary JSX (when
  // the entry supplied an `aJsx` enrichment). Both render here without
  // branching — `<p>{a}</p>` works for either.
  return (
    <div className="group h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors duration-200 hover:border-transparent hover:bg-orange-500 cursor-default">
      {/*
        Ring-in-ring icon — same shape as the "Ask a question" CTA.
        The outer `bg-orange-100` ring stays peach throughout (visible
        against the white default card AND the orange hover card),
        which keeps the icon recognisable as the same element across
        states.

        On hover the icon inverts: inner circle flips orange-500 →
        white, and the `?` mark flips white → orange-500. That mirrors
        the card's own white-text-on-orange treatment around it, so
        the icon reads as the inside-out version of the default
        state (orange ring around a white disc with an orange mark).

        Glyph is `QuestionMark` (raw `?`), not `Question` (speech
        bubble with a `?`) — the design calls for the bare mark so
        the inner circle reads as a clean dot.
      */}
      <div className="w-12 h-12 rounded-full bg-orange-500/25 group-hover:bg-white/25 flex items-center justify-center mb-5 p-1.5">
        <div className="w-full h-full rounded-full bg-orange-500 group-hover:bg-white flex items-center justify-center transition-colors duration-200">
          <QuestionMark
            size={18}
            weight="bold"
            className="text-white group-hover:text-orange-500 transition-colors duration-200"
          />
        </div>
      </div>
      <h3
        className="text-2xl font-semibold tracking-tight text-gray-900 group-hover:text-white transition-colors duration-200 leading-tight"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        {q}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-500 group-hover:text-white/90 transition-colors duration-200">
        {a}
      </p>
    </div>
  )
}

export default function FAQ() {
  return (
    <section id="faq" className="relative px-4 md:px-[10vw] py-32 bg-white">
      {/*
        Schema.org FAQPage JSON-LD. Goes inside the section so it
        ships with this component (no need to plumb it through the
        page-level metadata). `dangerouslySetInnerHTML` is the
        accepted React idiom for inline `<script>` content — the
        payload is built from a typed object literal at module load,
        no user input, so there's no injection surface.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />

      {/* Centered header cluster — eyebrow, heading, subtext, CTA. */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
        <RevealOnScroll delay={0.05} y={16}>
          <h2
            className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-gray-900"
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            Frequently asked questions
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={0.1} y={16}>
          <p className="mt-5 text-base leading-relaxed text-gray-500 max-w-xl">
            Everything you need to know about the product. Can&apos;t find the
            answer you&apos;re looking to? Please{' '}
            {/*
              Plain anchor (not next/link) — `#contact` matches the
              `<section id="contact">` further down the same page, so the
              browser handles smooth scroll natively. Underline + slightly
              darker text signals it's a link without making it look like
              a button (which would compete with "Ask a question" below).
            */}
            <a
              href="#contact"
              className="font-medium text-gray-700 underline underline-offset-2 hover:text-orange-500 transition-colors"
            >
              chat to our friendly team
            </a>
            .
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.15} y={16}>
          {/*
            Ring-in-ring CTA. The pale `bg-orange-100` outer span acts
            as a visible halo around the saturated orange button, same
            pattern as the demo badge in `DemoSection` (light wrapper
            + saturated inner pill, both `rounded-full`). The ring is
            thicker than the FAQ icon's (`p-1.5` vs `p-1.5` icon — same)
            and the inner button itself is sized up — `text-base`
            instead of `text-sm`, `px-7 py-3` — so the cluster reads
            as a primary CTA, not a chip.
          */}
          <span className="mt-7 inline-flex rounded-full bg-orange-500/25 p-1.5 shadow-sm">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Ask a question
              <ArrowRight
                size={16}
                weight="bold"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </a>
          </span>
        </RevealOnScroll>
      </div>

      {/* Card grid — 1 col on mobile, 2 on tablet, 3 on desktop.
          `max-w-6xl` matches the visual weight of the heading area
          above; without a cap the grid would stretch nearly edge to
          edge on wide monitors and look unbalanced. */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {FAQS.map((f, i) => (
          <RevealOnScroll key={i} delay={0.05 * (i % 3)} y={20}>
            {/* Prefer the JSX-enriched answer (`aJsx`) when one is
                supplied; otherwise fall back to the plain `aText`,
                which is also what JSON-LD consumes. */}
            <FAQCard q={f.q} a={f.aJsx ?? f.aText} />
          </RevealOnScroll>
        ))}
      </div>
    </section>
  )
}
