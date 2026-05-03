/**
 * Layout for the legal pages (`/terms`, `/privacy`).
 *
 * Shared chrome only — the navbar from the marketing site (so the user
 * still has a clear path back to home) and a slim footer that works on
 * a plain white background. Critically, NO `CanvasBackground` here:
 * the orange shader gradient is great for the hero but visually noisy
 * behind a wall of policy text. Plain white + dark prose is what
 * legal pages on Stripe / Linear / Vercel look like, and it's what
 * Google's API verification reviewers expect.
 */

import type { Metadata } from 'next'
import Navbar from '@/app/(components)/navbar'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import { LegalFooter } from './LegalFooter'

export const metadata: Metadata = {
  // Robots default — these pages should be indexable. Google's verification
  // flow checks that your linked Privacy Policy + Terms URLs return real
  // content (not a 404 / login wall), so we don't lock them behind any
  // auth or noindex.
  robots: { index: true, follow: true },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Same white-bezel + rounded-corners decoration the marketing
        landing uses (`app/page.tsx`). Lives at z-[9999] so it sits
        above page content; pointer-events disabled so it doesn't
        steal clicks from links or the navbar pill.
      */}
      <PhoneBezel />
      <Navbar />
      {/*
        `pt-32` clears the fixed Navbar pill on mobile + desktop.
        `max-w-3xl` (~720px) keeps line-length readable — the
        canonical "legal-page" measure. `pb-16` gives the footer room
        to breathe before the slim divider line.
      */}
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 pt-32 pb-16">{children}</div>
      </main>
      <LegalFooter />
    </>
  )
}
