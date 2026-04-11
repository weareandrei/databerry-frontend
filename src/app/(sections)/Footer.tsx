import Link from 'next/link'
import { XLogo } from '@phosphor-icons/react/dist/ssr'

export function Footer() {
  return (
    <footer className="relative px-[10vw] pt-20 pb-0 overflow-hidden">
      {/* Main grid */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 pb-12 border-t border-white/20 pt-10">

        {/* Brand + tagline + CTA */}
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

        {/* Contact links */}
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

        {/* Other projects */}
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
      </div>

      {/* Copyright */}
      <div className="pb-4 text-xs text-white/40">
        © {new Date().getFullYear()} Databerry. All rights reserved.
      </div>

      {/* Huge DATABERRY watermark */}
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
    </footer>
  )
}
