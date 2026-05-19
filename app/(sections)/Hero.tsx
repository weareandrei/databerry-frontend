'use client'
import Link from 'next/link'
import Image from 'next/image'
import Xarrow from 'react-xarrows'
import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { EVENT, trackEvent } from '@/lib/posthog'

// Shared variant factory — hero elements animate in on mount, staggered
const heroFade = (delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const, delay },
})

const LOGOS = [
  { src: '/landing/logos/stripe_logo.png', alt: 'Stripe' },
  { src: '/landing/logos/calendly_logo.png', alt: 'Calendly' },
  { src: '/landing/logos/posthog_logo.png', alt: 'PostHog' },
  { src: '/landing/logos/ga4_logo.png', alt: 'Google Analytics' },
  { src: '/landing/logos/gmail_logo.png', alt: 'Gmail' },
  { src: '/landing/logos/sentry_logo.png', alt: 'Sentry' },
  { src: '/landing/logos/notion_logo.png', alt: 'Notion' },
]

function DesktopLogos() {
  return (
    <div className="hidden md:block mt-12 w-full max-w-3xl">
      <div className="flex items-center justify-center gap-12">
        {LOGOS.map((logo, i) => (
          <div
            key={logo.alt}
            id={`logo-${i}`}
            className="rounded-[18px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
          >
            <Image src={logo.src} alt={logo.alt} width={60} height={60} className="rounded-[10px]" />
          </div>
        ))}
      </div>

      {/* `mt-4` pulls the dot upward so it sits inside the visual
          convergence of the converging Xarrow grid lines (previously
          `mt-10` parked it below the convergence point — the lines
          terminated *above* the dot and the dot read as floating).
          `relative z-20` lifts the dot above the Xarrow SVGs (which
          paint at their default DOM-order z-stack), so the line tips
          tuck UNDER the dot rather than crossing through it. */}
      <div className="flex justify-center mt-4 relative z-20">
        <div
          id="hub-dot"
          className="h-4 w-4 rounded-full bg-[#e85c20] border-2 border-white shadow-[0_0_0_4px_rgba(255,255,255,0.25)]"
        />
      </div>

      {LOGOS.map((logo, i) => (
        <Xarrow
          key={logo.alt}
          start={`logo-${i}`}
          end="hub-dot"
          color="rgba(255,255,255,0.7)"
          strokeWidth={2.5}
          headSize={0}
          curveness={0.6}
          startAnchor="bottom"
          // Terminate lines at the dot's CENTER (not its top edge) so
          // the convergence visually lives inside the dot and the
          // line tips hide behind it thanks to the `z-20` above.
          endAnchor="middle"
          path="grid"
        />
      ))}

      {/* Vertical connecting line between the hub-dot and the demo
          card below. The demo card is absolutely positioned at the
          anchor's bottom (see `DemoSection`'s `topOffset` math), so
          this line's HEIGHT directly controls the gap between the
          icons row and the top of the demo card. We grow it at xl+
          because the demo card scales to 84vw on wide screens — much
          wider than the `max-w-3xl` icons row — and the original 32px
          gap reads as overlap once the card dwarfs the icons. */}
      <div className="flex justify-center">
        <div className="h-8 xl:h-12 3xl:h-16 w-0.5 bg-white/70" />
      </div>

      <div id="demo-anchor" />
      <div className="h-[150px]" />
    </div>
  )
}

function MobileLogos() {
  return (
    <div className="md:hidden block mt-12 w-full max-w-3xl">
      <div className="flex items-center justify-center gap-12">
        {LOGOS.slice(0, 3).map((logo, i) => (
          <div
            key={logo.alt}
            id={`m-logo-top-${i}`}
            className="rounded-[18px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={60}
              height={60}
              className="rounded-[10px]"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center my-5">
        <div
          id="m-hub-dot"
          className="h-4 w-4 rounded-full bg-[#e85c20] border-2 border-white shadow-[0_0_0_4px_rgba(255,255,255,0.25)]"
        />
      </div>

      <div className="flex items-center justify-center gap-12">
        {LOGOS.slice(3, 7).map((logo, i) => (
          <div
            key={logo.alt}
            id={`m-logo-bot-${i}`}
            className="rounded-[18px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={60}
              height={60}
              className="rounded-[10px]"
            />
          </div>
        ))}
      </div>

      {(['left', 'top', 'right'] as const).map((hubAnchor, i) => (
        <Xarrow
          key={LOGOS[i].alt}
          start={`m-logo-top-${i}`}
          end="m-hub-dot"
          color="rgba(255,255,255,0.7)"
          strokeWidth={2.5}
          headSize={0}
          curveness={0.6}
          startAnchor="bottom"
          endAnchor={hubAnchor}
          path="grid"
        />
      ))}

      {(['left', 'left', 'right', 'right'] as const).map((hubAnchor, i) => (
        <Xarrow
          key={LOGOS[3 + i].alt}
          start={`m-logo-bot-${i}`}
          end="m-hub-dot"
          color="rgba(255,255,255,0.7)"
          strokeWidth={2.5}
          headSize={0}
          curveness={0.6}
          startAnchor="top"
          endAnchor={hubAnchor}
          path="grid"
        />
      ))}

      <div className="flex justify-center">
        <div id="m-demo-line" className="h-8 w-0.5 bg-white/70" />
      </div>

      <Xarrow
        start="m-hub-dot"
        end="m-demo-line"
        color="rgba(255,255,255,0.7)"
        strokeWidth={2.5}
        headSize={0}
        curveness={0}
        startAnchor="bottom"
        endAnchor="top"
        path="straight"
      />

      <div id="m-demo-anchor" />
      <div className="h-[150px]" />
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative w-full md:h-screen">
      <CanvasBackground />

      {/* Bottom fade to white */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-[15vh] z-20 bg-gradient-to-t from-white to-transparent" />

      {/* Content */}
      <div className="relative md:absolute md:inset-0 z-10 flex flex-col justify-center items-center text-center px-6 pt-28 pb-12 md:pt-20 md:pb-0">
        {/* Product Hunt featured badge — first in the hero cascade
            (slightly earlier delay than the BI badge below) so the
            top-to-bottom fade reads naturally. The image is a plain
            `<img>` (not `next/image`) because PH's CDN isn't in our
            `images.remotePatterns` and a single 250×54 badge isn't
            worth wiring up the config for. Adding an eslint-disable
            for the @next/next/no-img-element rule keeps the rest of
            the codebase honest about its `<Image>` usage. */}
        <motion.div {...heroFade(0.75)} className="mb-3">
          <a
            href="https://www.producthunt.com/products/databerry?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-databerry"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Databerry - Track all your business data in a single dashboard | Product Hunt"
              width={250}
              height={54}
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1133651&theme=light&t=1779139221585"
            />
          </a>
        </motion.div>
        {/* Badge */}
        <motion.div {...heroFade(0.9)} className="mb-6 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          Business Intelligence for founders
        </motion.div>

        {/* H1 */}
        <motion.h1
          {...heroFade(1.05)}
          className="max-w-4xl text-4xl md:text-6xl font-semibold leading-[1.1] md:leading-[1] tracking-[-0.06em] text-white"
          style={{ fontFamily: 'var(--font-bricolage)' }}
        >
          <span className="text-black">Track </span>
          all <span className="text-black">your business data in a</span>
          <span className="hidden md:inline">
            <br />
          </span>{' '}
          single dashboard
        </motion.h1>

        {/* Subheader */}
        <motion.h4
          {...heroFade(1.2)}
          className="mt-8 max-w-2xl text-base md:text-lg font-normal leading-[1.4] tracking-[0.01em] text-black"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Built for founders that use too many tools. Connect Stripe, PostHog, Google Analytics, and the rest of your stack. All metrics that matter, side by side.
        </motion.h4>

        {/* CTA — black solid pill wrapped in a 25 %-opacity black
            halo pill, the same "double pill" treatment the
            `DemoBadge` ("Interactable demo") uses with white. The
            outer ring softens the boundary against the saturated
            orange hero and gives the CTA visual weight without a
            heavy hard-edged shadow.
            Shadow lives on the INNER pill, not the wrapper —
            otherwise the shadow's dark spill sits behind the
            halo and they merge into one indistinct dark blob.
            Anchoring the shadow on the inner pill makes the halo
            read as a clean ring with its own outline against the
            shadow that radiates outward beyond it. */}
        <motion.div {...heroFade(1.35)} className="mt-8">
          <span className="inline-flex items-center rounded-2xl bg-black/25 p-1">
            <Link
              href="/signup"
              onClick={() =>
                // No specific tier here — the hero CTA is the top-of-funnel
                // "see what this is about" click. Use `tier: 'unspecified'`
                // so it groups separately from the pricing-table tier
                // clicks in PostHog Insights.
                trackEvent(EVENT.LANDING_TIER_CTA_CLICKED, {
                  tier: 'unspecified',
                  destination: 'signup',
                  location: 'hero',
                })
              }
              className="inline-flex items-center gap-3 rounded-2xl bg-black px-16 py-3 text-base font-medium text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] hover:opacity-90 transition-opacity"
            >
              Get started
              <ArrowRight size={18} weight="bold" />
            </Link>
          </span>
        </motion.div>

        <motion.div {...heroFade(1.5)} className="w-full flex flex-col items-center">
          <DesktopLogos />
          <MobileLogos />
        </motion.div>
      </div>
    </section>
  )
}
