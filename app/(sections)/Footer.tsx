'use client'

import Link from 'next/link'
import { XLogo } from '@phosphor-icons/react'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'

export function Footer() {
  return (
    <footer className="relative px-[10vw] pt-20 pb-0 overflow-hidden">
      {/* Main grid */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 pb-12 border-t border-white/20 pt-10">

        {/* Brand + tagline + CTA */}
        <RevealOnScroll delay={0}>
          <div className="flex flex-col gap-3">
            <span className="text-xl font-bold tracking-tight text-white">Databerry</span>
            <span className="text-sm text-white/70">All your business data in one place.</span>
            <Link
              href="/signup"
              className="mt-1 self-start text-sm font-medium bg-white text-black px-5 py-2.5 rounded-lg hover:bg-white/90 transition-colors"
            >
              Join wishlist
            </Link>
          </div>
        </RevealOnScroll>

        {/* Contact links */}
        <RevealOnScroll delay={0.1}>
          <div className="flex flex-col gap-2 text-sm text-white/70">
            <a href="mailto:team@heavenmade.org" className="hover:text-white transition-colors">
              team@heavenmade.org
            </a>
            <a
              href="https://x.com/xdrewmiko"
              target="_blank"
              rel="noopener noreferrer"
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
              <a href="https://taplaunch.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Taplaunch</a>
              <a href="https://ideasparks.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ideasparX</a>
              <a href="https://datajam.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Datajam</a>
              <a href="https://webcheckin.cc" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Website Roaster</a>
              <a href="https://hackerpage.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Hackerpage</a>
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
        <div className="pb-4 text-xs text-white/40">
          © {new Date().getFullYear()} Databerry. All rights reserved.
        </div>
      </RevealOnScroll>

      {/* Huge DATABERRY watermark */}
      <RevealOnScroll delay={0.15} y={40}>
        <div
          className="w-full flex items-end leading-none select-none pointer-events-none"
          style={{
            fontSize: 'clamp(60px, 18vw, 18vw)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            color: 'rgba(0,0,0,0.10)',
            lineHeight: 0.85,
          }}
        >
          DATABERRY
        </div>
      </RevealOnScroll>
    </footer>
  )
}
