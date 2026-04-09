'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/AuthContext'

const CORNER_PATH = 'M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z'

const Navbar = () => {
  const { user, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const ctaHref = user ? '/hub/home' : '/login'
  const ctaLabel = user ? 'Dashboard' : 'Login'

  return (
    <>
      {/* Mobile burger/close — fixed top-right, outside the notch */}
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

      <div className="fixed z-[100] top-3 left-0 w-full flex flex-row justify-center">
        <svg className="-scale-x-100 -scale-y-100" width="36" height="36" viewBox="0 0 50 50" fill="none" aria-hidden="true">
          <path d={CORNER_PATH} fill="white" />
        </svg>

        <div className="flex flex-row items-center justify-between h-[70px] w-[55%] md:w-[55%] max-w-full bg-white rounded-b-[42px] px-6 md:px-10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
          {/* Logo */}
          <div className="flex items-center gap-3 md:gap-3 mx-auto md:mx-0">
            <Image src="/Databerry_icon.svg" alt="DataBerry" width={30} height={30} />
            <span
              className="text-2xl font-bold text-[#E96021]"
              style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '0.05em' }}
            >
              DataBerry
            </span>
          </div>

          {/* Desktop CTA */}
          {!loading && (
            <Link
              href={ctaHref}
              className="hidden md:block rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-75"
            >
              {ctaLabel}
            </Link>
          )}
        </div>

        <svg className="-scale-y-100" width="36" height="36" viewBox="0 0 50 50" fill="none" aria-hidden="true">
          <path d={CORNER_PATH} fill="white" />
        </svg>
      </div>

      {/* Mobile full-screen menu */}
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
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-3xl font-semibold text-gray-900 hover:text-orange-500 transition-colors"
                style={{ fontFamily: 'var(--font-bricolage)' }}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="text-3xl font-semibold text-gray-900 hover:text-orange-500 transition-colors"
                style={{ fontFamily: 'var(--font-bricolage)' }}
              >
                Sign up
              </Link>
            </div>

            <div className="px-8 pb-10 text-sm text-gray-400">
              © {new Date().getFullYear()} Databerry
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Navbar
