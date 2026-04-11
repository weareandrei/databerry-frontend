'use client'
import Link from 'next/link'
import Image from 'next/image'
import Xarrow from 'react-xarrows'
import { CanvasBackground } from '@/components/CanvasBackground'

const LOGOS = [
  { src: '/landing/logos/stripe_logo.png', alt: 'Stripe' },
  { src: '/landing/logos/calendly_logo.png', alt: 'Calendly' },
  { src: '/landing/logos/posthog_logo.png', alt: 'PostHog' },
  { src: '/landing/logos/ga4_logo.png', alt: 'Google Analytics' },
  { src: '/landing/logos/gmail_logo.png', alt: 'Gmail' },
  { src: '/landing/logos/mailchimp_logo.png', alt: 'Mailchimp' },
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

      <div className="flex justify-center mt-10">
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
          endAnchor="top"
          path="grid"
        />
      ))}

      <div className="flex justify-center">
        <div className="h-8 w-0.5 bg-white/70" />
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
    <section className="relative w-full h-screen">
      <CanvasBackground />

      {/* Bottom fade to white */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-[15vh] z-20 bg-gradient-to-t from-white to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center px-6 overflow-y-auto">
        {/* Badge */}
        <div className="mb-6 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          Business Intelligence for founders
        </div>

        {/* H1 — no forced line break on mobile */}
        <h1
          className="max-w-4xl text-4xl md:text-6xl font-semibold leading-[1.1] md:leading-[1] tracking-[-0.06em] text-white"
          style={{ fontFamily: 'var(--font-bricolage)' }}
        >
          <span className="text-black">Track </span>
          all <span className="text-black">your business data in a</span>
          <span className="hidden md:inline">
            <br />
          </span>{' '}
          single dashboard
        </h1>

        {/* Subheader */}
        <h4
          className="mt-5 max-w-xl text-base md:text-lg font-normal leading-[1.4] tracking-[0.01em] text-black"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Integrate business data from any platform you work with into a single page. See only data
          that matters.
        </h4>

        {/* CTA — mobile only */}
        <Link
          href="/signup"
          className="md:hidden mt-6 rounded-full bg-black px-16 py-3.5 text-base font-medium text-white hover:opacity-75 transition-opacity"
        >
          Join wishlist
        </Link>

        <DesktopLogos />
        <MobileLogos />
      </div>
    </section>
  )
}
