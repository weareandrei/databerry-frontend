'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { List, X, CaretDown } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { COMPARISON_LINKS } from '@/app/compare/comparisons'

const CORNER_PATH = 'M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z'

/**
 * The white "notch" bar hanging from the top edge — flipped corner
 * SVGs + rounded-bottom white pill. Extracted so every surface that
 * wants the landing-page top bar (the landing `Navbar` below,
 * /onboarding) mounts the SAME chrome instead of approximating it.
 *
 * `widthClassName` controls the bar's width (the landing nav uses
 * 55%; onboarding needs more room for its step indicators).
 * Children render inside the bar's `justify-between` row.
 */
export function NotchBar({
  children,
  widthClassName = 'w-[55%] md:w-[55%]',
}: {
  children: React.ReactNode
  widthClassName?: string
}) {
  return (
    <div className="fixed z-[100] top-3 left-0 w-full flex flex-row justify-center">
      <svg
        className="-scale-x-100 -scale-y-100 w-[24px] h-[24px] md:w-[36px] md:h-[36px]"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden="true"
      >
        <path d={CORNER_PATH} fill="white" />
      </svg>

      <div
        className={`flex flex-row items-center justify-between h-[54px] md:h-[65px] ${widthClassName} max-w-full bg-white rounded-b-[34px] md:rounded-b-[42px] px-5 md:px-10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]`}
      >
        {children}
      </div>

      <svg
        className="-scale-y-100 w-[24px] h-[24px] md:w-[36px] md:h-[36px]"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden="true"
      >
        <path d={CORNER_PATH} fill="white" />
      </svg>
    </div>
  )
}

/**
 * "Compare" nav item — a hover-revealed dropdown of Databerry-vs-X
 * comparison pages, driven by `COMPARISON_LINKS` (add a comparison and
 * it shows up here automatically). Hover-only by design: the `pt-3` on
 * the panel bridges the gap to the trigger so the menu doesn't vanish
 * as the cursor crosses into it.
 */
function CompareDropdown() {
  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-black cursor-pointer"
      >
        Compare
        <CaretDown
          size={11}
          weight="bold"
          className="mt-px transition-transform duration-150 group-hover:rotate-180"
        />
      </button>
      {/* `pt-3` is a transparent hover-bridge so moving from the trigger
          into the panel doesn't break the `group-hover`. */}
      <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3 opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="min-w-[230px] rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.16)]">
          {COMPARISON_LINKS.map(c => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-black"
            >
              Databerry vs {c.competitor}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  // Auth state for the single CTA: signed-in users see "Dashboard"
  // (one click into `/hub/home`); everyone else sees "Get started"
  // pointing at signup.
  //
  // `null` is the third state — "we haven't checked yet". It exists
  // so the first paint isn't a misleading "Get started" for a user
  // who's actually logged in (which would flicker to "Dashboard"
  // 50ms later). Rendering the button only after the check
  // resolves keeps SSR deterministic and avoids the flicker. The
  // `onAuthStateChange` subscription updates the state if the user
  // signs out from another tab while the landing page is open.
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(data.session !== null)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setSignedIn(session !== null)
      },
    )

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return (
    <>
      {/* Mobile burger/close — commented out for now
      <button
        className="md:hidden fixed top-3 z-[101] flex items-center justify-center w-15 h-15 rounded-full hover:bg-white/10 transition-colors"
        style={{ right: 'calc(11.25vw - 30px)' }}
        onClick={() => setMenuOpen(v => !v)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {menuOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={30} weight="bold" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <List size={30} weight="bold" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      */}

      <NotchBar>
        {/* Logo */}
          <Link href="/" className="flex items-center gap-2 md:gap-1.5 mx-auto md:mx-0">
            <Image src="/databerry_logo_v2.svg" alt="DataBerry" width={24} height={24} className="md:w-[28px] md:h-[28px] rounded-md" />
            <span
              className="text-lg md:text-[28px] font-bold text-primary"
              style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.01em' }}
            >
              DataBerry
            </span>
          </Link>

          {/* Single CTA — flips on auth state.
                  signedIn == null  → still resolving the session;
                                       render an invisible placeholder
                                       so the layout doesn't reflow
                                       once we know.
                  signedIn === true → "Dashboard" → /hub/home
                  signedIn === false → "Get started" → /signup
              The login page is still reachable directly at /login for
              returning users who type the URL or land via password
              recovery; we just don't surface it in the marketing nav. */}
          <div className="hidden md:flex items-center gap-5">
            {/* Compare dropdown — sits to the LEFT of the auth CTA. */}
            <CompareDropdown />
            {signedIn === null ? (
              // Reserve the same width as the resolved button so the
              // navbar doesn't shift when auth state lands. `invisible`
              // (vs hidden/display:none) keeps it in the layout flow.
              <span
                aria-hidden
                className="invisible rounded-full bg-black px-5 py-2 text-sm font-medium"
              >
                Get started
              </span>
            ) : signedIn ? (
              <Link
                href="/hub/home"
                className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-75"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-75"
              >
                Get started
              </Link>
            )}
          </div>
      </NotchBar>

      {/* Mobile full-screen menu — commented out for now
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[99] bg-white flex flex-col md:hidden"
          >
            <div className="flex flex-col flex-1 px-8 pt-24 gap-6">
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="text-3xl font-semibold text-foreground hover:text-primary transition-colors"
                style={{ fontFamily: 'var(--font-bricolage)' }}
              >
                Start
              </Link>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-medium text-muted-foreground hover:text-primary transition-colors"
                style={{ fontFamily: 'var(--font-bricolage)' }}
              >
                Log in
              </Link>
            </div>

            <div className="px-8 pb-10 text-sm text-subtle">
              © {new Date().getFullYear()} Databerry
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      */}
    </>
  )
}

export default Navbar
