import Link from 'next/link'
import { XLogo } from '@phosphor-icons/react/dist/ssr'

export function Footer() {
  return (
    <footer className="relative px-[10vw] pt-20 pb-0 overflow-hidden">
      {/* Top row */}
      <div className="flex items-start justify-between gap-8 pb-12 border-t border-white/20 pt-10">
        {/* Left: brand + tagline */}
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold tracking-tight text-white">Databerry</span>
          <span className="text-sm text-white/70">All your business data in one place.</span>
        </div>

        {/* Center: links */}
        <div className="flex items-center gap-8 text-sm text-white/70">
          <a
            href="mailto:team@heavenmade.org"
            className="hover:text-white transition-colors"
          >
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

        {/* Right: wishlist CTA */}
        <Link
          href="/signup"
          className="text-sm font-medium bg-white text-black px-5 py-2.5 rounded-lg hover:bg-white/90 transition-colors"
        >
          Join wishlist
        </Link>
      </div>

      {/* Bottom: copyright */}
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
