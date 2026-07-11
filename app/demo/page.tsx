import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import InteractableDemo from '@/app/(components)/InteractableDemo/InteractableDemo'

export const metadata: Metadata = {
  title: 'Interactive demo — Databerry',
  description:
    'Explore the full Databerry dashboard demo — switch projects, browse connections, and try the agent.',
  // The demo is a sandbox, not canonical product content — keep it out
  // of search results so it doesn't compete with the real app pages.
  robots: { index: false, follow: false },
}

/**
 * Full-screen interactive demo, reached from the landing page's
 * mobile-only "View demo" button (and directly via `/demo`).
 *
 * The whole viewport (`h-dvh`) is handed to `<InteractableDemo>` — its
 * root is `h-full`, so it fills the screen. On `md+` it shows the icon
 * rail + project sidebar; on mobile those collapse to the burger +
 * bottom-sheet nav (`<DemoMobileNav>`), exactly like the real dashboard.
 * A fixed "Back to website" pill in the bottom-right returns to the
 * landing page; bottom-CENTER is left clear for the demo's own "not
 * available in the demo" notice.
 */
const DemoPage = () => {
  return (
    <main className="dashboard relative h-dvh w-full overflow-hidden bg-background">
      <InteractableDemo />

      <Link
        href="/"
        aria-label="Back to website"
        className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-full bg-foreground/95 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-6px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-opacity hover:opacity-90"
      >
        <ArrowLeft size={16} weight="bold" />
        Back to website
      </Link>
    </main>
  )
}

export default DemoPage
