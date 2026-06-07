'use client'

/**
 * Pricing section for the landing page. Sits above the FAQ — the
 * deliberate placement is "answer the price question before the
 * user has to ask it". The FAQ's first entry ("Is Databerry free
 * to try?") still earns its keep as the AI/SEO-friendly Q&A
 * surface, but the section above gives the visual answer.
 *
 * Renders the shared `<PricingTable>` in `signup` mode so the
 * CTAs link to /signup. The same component is reused in the
 * dashboard inside `<TierPickerSheet>` (in `upgrade` mode) — one
 * comparison table, two contexts.
 *
 * Chrome — `px-[10vw] py-24 bg-white` section frame, brand-orange
 * uppercase eyebrow, Bricolage heading — matches the rest of the
 * landing page so this section reads as part of the same flow.
 */

import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'
import { PricingTable } from '@/components/pricing/PricingTable'

export default function Pricing() {
  return (
    <section id="pricing" className="relative px-4 md:px-[10vw] py-24 bg-white">
      {/* Centered header cluster — eyebrow + heading + subtext.
          Same composition the FAQ + Features sections use so the
          three "anchor" sections (Features → Pricing → FAQ) read
          as a consistent rhythm. */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12">
        <RevealOnScroll delay={0} y={16}>
          <p className="text-xs font-medium text-orange-500 uppercase tracking-widest">
            Pricing
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={0.05} y={16}>
          <h2
            className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-gray-900"
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            Simple pricing, scale when you need it.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={0.1} y={16}>
          <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed">
            Start free with the core integrations. Upgrade for every
            integration and more headroom on views + connections.
          </p>
        </RevealOnScroll>
      </div>

      {/* Table — `max-w-7xl` (≈1280 px) keeps the four-column layout
          (Free + Starter + Pro + Enterprise) from feeling cramped
          without letting columns drift an arm's length apart on
          ultrawides. The component handles its own mobile / desktop
          responsive swap (stacked cards on phones, grid on `md+`). */}
      <RevealOnScroll delay={0.15} y={20}>
        <div className="mx-auto max-w-7xl">
          <PricingTable variant="signup" />
        </div>
      </RevealOnScroll>
    </section>
  )
}
