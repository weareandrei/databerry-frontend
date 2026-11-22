'use client'

import { DATABERRY_LOGO_PATH } from '@/constants/brand'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { List, X, CaretDown } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { COMPARISON_LINKS } from '@/app/compare/comparisons'

const CORNER_PATH = 'M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z'

const NAV_LINKS = [
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const

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
    // `data-notch-bar` lets page content measure where the bar ends (the
    // landing demo centers itself in the space below it).
    <div
      data-notch-bar
      className="fixed z-[100] top-3 left-0 w-full flex flex-row justify-center"
    >
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
        className="flex items-center gap-1 text-sm font-medium text-foreground transition-colors group-hover:text-black cursor-pointer"
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
      <div className="absolute left-0 top-full pt-3 opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="min-w-[230px] rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.16)]">
          <Link
            href="/compare"
            className="block rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-black"
          >
            All comparisons
          </Link>
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

function AuthCta({
  signedIn,
  className,
  onNavigate,
}: {
  signedIn: boolean | null
  className?: string
  onNavigate?: () => void
}) {
  if (signedIn === null) {
    return (
      <span
        aria-hidden
        className={`invisible rounded-full bg-black px-5 py-2 text-sm font-medium ${className ?? ''}`}
      >
        Get started
      </span>
    )
  }

  if (signedIn) {
    return (
      <Link
        href="/hub/home"
        onClick={onNavigate}
        className={`rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-75 ${className ?? ''}`}
      >
        Dashboard
      </Link>
    )
  }

  return (
    <Link
      href="/signup"
      onClick={onNavigate}
      className={`rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-75 ${className ?? ''}`}
    >
      Get started
    </Link>
  )
}

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
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

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      {/* Mobile burger — sits outside the white notch, over the hero.
          White when closed; switches to black when the full-screen
          white menu is open so the X stays visible. */}
      <button
        type="button"
        className="md:hidden fixed top-3 z-[101] flex items-center justify-center w-12 h-12 rounded-full transition-colors"
        style={{ right: 'calc(11.25vw - 24px)' }}
        onClick={() => setMenuOpen(v => !v)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        <AnimatePresence mode="wait" initial={false}>
          {menuOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-black"
            >
              <X size={28} weight="bold" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-white"
            >
              <List size={28} weight="bold" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <NotchBar widthClassName="w-[70%] md:w-[720px] lg:w-[780px]">
        {/* Left cluster — logo + desktop nav. On mobile the logo
            centers in the notch; desktop aligns left next to the links. */}
        <div className="flex w-full md:w-auto items-center justify-center md:justify-start gap-6 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 md:gap-1.5"
            onClick={closeMenu}
          >
            <Image
              src={DATABERRY_LOGO_PATH}
              alt="Databerry"
              width={24}
              height={24}
              className="md:w-[28px] md:h-[28px] rounded-md"
            />
            <span
              className="text-lg md:text-[20px] font-bold text-secondary"
              style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.01em' }}
            >
              databerry
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5" aria-label="Primary">
            <CompareDropdown />
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground transition-colors hover:text-black"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop CTA — flips on auth state. */}
        <div className="hidden md:flex items-center">
          <AuthCta signedIn={signedIn} />
        </div>
      </NotchBar>

      {/* Mobile full-screen menu — same links as desktop + auth CTA. */}
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
            <div className="flex flex-col flex-1 px-8 pt-24 gap-1">
              <Link
                href="/compare"
                onClick={closeMenu}
                className="py-3 text-3xl font-semibold text-foreground hover:text-secondary transition-colors"
                style={{ fontFamily: 'var(--font-bricolage)' }}
              >
                Compare
              </Link>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="py-3 text-3xl font-semibold text-foreground hover:text-secondary transition-colors"
                  style={{ fontFamily: 'var(--font-bricolage)' }}
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-8">
                {signedIn === null ? null : signedIn ? (
                  <Link
                    href="/hub/home"
                    onClick={closeMenu}
                    className="inline-flex rounded-full bg-black px-6 py-3 text-base font-medium text-white"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/signup"
                    onClick={closeMenu}
                    className="inline-flex rounded-full bg-black px-6 py-3 text-base font-medium text-white"
                  >
                    Get started
                  </Link>
                )}
              </div>
            </div>

            <div className="px-8 pb-10 text-sm text-subtle">
              © {new Date().getFullYear()} Databerry
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Navbar
