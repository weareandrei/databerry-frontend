'use client'

import Link from 'next/link'
import { XLogo } from '@phosphor-icons/react'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'
import { EVENT, trackEvent } from '@/lib/posthog'

export function Footer() {
  // Track each "maker of Databerry" link with a stable label + URL so
  // PostHog Insights can break down which sibling product is pulling
  // the most clicks. `section` distinguishes them from the @xdrewmiko
  // / contact entries in the next column.
  const trackFooterLink = (
    section: 'maker' | 'creator' | 'contact',
    label: string,
    url: string,
  ) =>
    trackEvent(EVENT.LANDING_FOOTER_LINK_CLICKED, {
      section,
      label,
      url,
    })

  return (
    <footer className="relative px-[10vw] pt-20 pb-0 overflow-hidden">
      {/* Main grid */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-10 pb-12 border-t border-white/20 pt-10">

        {/* Brand + tagline + CTA */}
        <RevealOnScroll delay={0}>
          <div className="flex flex-col gap-3">
            <span className="text-xl font-bold tracking-tight text-white">Databerry</span>
            <span className="text-sm text-white/70">All your business data in one place.</span>
            <Link
              href="/signup"
              onClick={() =>
                trackEvent(EVENT.LANDING_TIER_CTA_CLICKED, {
                  tier: 'unspecified',
                  destination: 'signup',
                  location: 'footer',
                })
              }
              className="mt-1 self-start text-sm font-medium bg-white text-black px-5 py-2.5 rounded-lg hover:bg-white/90 transition-colors"
            >
              Get started
            </Link>
          </div>
        </RevealOnScroll>

        {/* Contact links */}
        <RevealOnScroll delay={0.1}>
          <div className="flex flex-col gap-2 text-sm text-white/70">
            <a
              href="mailto:team@heavenmade.org"
              onClick={() =>
                trackFooterLink('contact', 'team@heavenmade.org', 'mailto:team@heavenmade.org')
              }
              className="hover:text-white transition-colors"
            >
              team@heavenmade.org
            </a>
            <a
              href="https://x.com/xdrewmiko"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackFooterLink('creator', '@xdrewmiko', 'https://x.com/xdrewmiko')
              }
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <XLogo size={14} weight="fill" />
              @xdrewmiko
            </a>
          </div>
        </RevealOnScroll>

        {/* Other projects */}
        <RevealOnScroll delay={0.2}>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/40 uppercase tracking-wider">By the maker of Databerry</span>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              {/* Listed as a data-driven map so future product additions
                  pick up the tracking automatically. */}
              {[
                { label: 'Taplaunch', url: 'https://taplaunch.app' },
                { label: 'ideasparX', url: 'https://ideasparks.app' },
                { label: 'Datajam', url: 'https://datajam.app' },
                { label: 'Website Roaster', url: 'https://webcheckin.cc' },
                { label: 'Hackerpage', url: 'https://hackerpage.app' },
              ].map(({ label, url }) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackFooterLink('maker', label, url)}
                  className="hover:text-white transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* Legal — own column, same visual weight as the other column
            heads. Surfacing Terms + Privacy here (rather than burying
            them in the tiny copyright row) is what Google's OAuth
            verification reviewers expect to see when they crawl the
            landing for required policy links. */}
        <RevealOnScroll delay={0.3}>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/40 uppercase tracking-wider">Legal</span>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>

      {/* Copyright. Terms / Privacy live in the "Legal" column above
          where they're actually visible. */}
      <RevealOnScroll delay={0.05} y={12}>
        <div className="relative z-10 pb-4 text-xs text-white/40">
          © {new Date().getFullYear()} Databerry. All rights reserved.
        </div>
      </RevealOnScroll>

      {/* Huge DATABERRY watermark.
          Rendered as an inline SVG (not a CSS-sized div) because text
          can't be made to EXACTLY fill a box with CSS alone: `textLength`
          scales the word to the box so it fills the available width on
          desktop and — rotated — the full footer height on mobile, with
          no overflow either way. Visually identical to before: same faint
          black, same weight 900, same Inter letterforms. */}

      {/* Desktop: horizontal, fills the content width, sits at the bottom. */}
      <RevealOnScroll delay={0.15} y={40}>
        <svg
          aria-hidden
          viewBox="0 0 1000 160"
          preserveAspectRatio="none"
          className="hidden md:block w-full select-none pointer-events-none"
        >
          <text
            x="0"
            y="150"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            fontSize="200"
            fontWeight="900"
            fill="rgba(0,0,0,0.10)"
            style={{ fontFamily: 'var(--font-inter), sans-serif' }}
          >
            DATABERRY
          </text>
        </svg>
      </RevealOnScroll>

      {/* Mobile: rotated 90°, stretched to the full footer height. The
          inset-0 layer is a definite-size container, so `100cqh` resolves
          to the footer's real height; once the SVG is rotated, that width
          becomes its vertical extent. Sits behind the content (z-0). */}
      <div
        className="md:hidden absolute inset-0 z-0 overflow-hidden pointer-events-none select-none"
        style={{ containerType: 'size' }}
      >
        <svg
          aria-hidden
          viewBox="0 0 1000 160"
          preserveAspectRatio="none"
          className="absolute left-1/2 top-1/2"
          style={{ width: '100cqh', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
        >
          <text
            x="0"
            y="150"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            fontSize="200"
            fontWeight="900"
            fill="rgba(0,0,0,0.10)"
            style={{ fontFamily: 'var(--font-inter), sans-serif' }}
          >
            DATABERRY
          </text>
        </svg>
      </div>
    </footer>
  )
}
