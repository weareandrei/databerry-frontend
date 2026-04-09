import Link from 'next/link'
import { XLogo } from '@phosphor-icons/react/dist/ssr'

export function Footer() {
  return (
    <footer className="relative px-[10vw] pt-20 pb-0 overflow-hidden">
      {/* Top row */}
      <div className="flex items-start justify-between gap-8 pb-12 border-t border-black/10 pt-10">
        {/* Left: brand + tagline */}
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold tracking-tight text-gray-900">Databerry</span>
          <span className="text-sm text-gray-500">All your business data in one place.</span>
        </div>

        {/* Center: links */}
        <div className="flex items-center gap-8 text-sm text-gray-500">
          <a
            href="mailto:team@heavenmade.org"
            className="hover:text-gray-900 transition-colors"
          >
            team@heavenmade.org
          </a>
          <a
            href="https://x.com/xdrewmiko"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
          >
            <XLogo size={14} weight="fill" />
            @xdrewmiko
          </a>
        </div>

        {/* Right: auth buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-black/5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>

      {/* Bottom: copyright */}
      <div className="pb-4 text-xs text-gray-400">
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
