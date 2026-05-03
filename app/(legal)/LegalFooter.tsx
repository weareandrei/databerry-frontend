/**
 * Slim footer for the legal pages. Visually distinct from the marketing
 * Footer (which assumes a dark / gradient background and uses
 * white-on-dark text) because legal pages have a plain white body —
 * white-on-white wouldn't read.
 *
 * Just the essentials: copyright, link back to home, links between the
 * two legal pages, contact email. Mirrors the marketing footer's
 * tone (light grey, low-contrast) without the watermark + reveal
 * animations — those would distract from "this is plain
 * compliance content".
 */

import Link from 'next/link'

export function LegalFooter() {
  return (
    <footer className="border-t border-stroke">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-8 text-xs text-grey-light sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Databerry. All rights reserved.</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link href="/" className="hover:text-grey-darkest transition-colors">
            Home
          </Link>
          <Link href="/terms" className="hover:text-grey-darkest transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-grey-darkest transition-colors">
            Privacy
          </Link>
          <a
            href="mailto:team@heavenmade.org"
            className="hover:text-grey-darkest transition-colors"
          >
            team@heavenmade.org
          </a>
        </div>
      </div>
    </footer>
  )
}
