'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'

const CORNER_PATH = 'M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z'

const Navbar = () => {
  const { user, loading } = useAuth()

  const ctaHref = user ? '/hub/home' : '/login'
  const ctaLabel = user ? 'Dashboard' : 'Login'

  return (
    <div className="fixed z-[100] top-3 left-0 w-full flex flex-row justify-center">
      <svg
        className="-scale-x-100 -scale-y-100"
        width="36"
        height="36"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden="true"
      >
        <path d={CORNER_PATH} fill="white" />
      </svg>

      <div className="flex flex-row items-center justify-between h-[70px] w-[55%] bg-white rounded-b-[42px] px-10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image src="/Databerry_icon.svg" alt="DataBerry" width={30} height={30} />
          <span
            className="text-2xl font-bold text-[#E96021]"
            style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '0.05em' }}
          >
            DataBerry
          </span>
        </div>

        {/* CTA */}
        {!loading && (
          <Link
            href={ctaHref}
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-75"
          >
            {ctaLabel}
          </Link>
        )}
      </div>

      <svg
        className="-scale-y-100"
        width="36"
        height="36"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden="true"
      >
        <path d={CORNER_PATH} fill="white" />
      </svg>
    </div>
  )
}

export default Navbar
