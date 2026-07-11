'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export function LoadingScreen() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Dismiss after a minimum of 1000ms AND after the page has loaded —
    // whichever of the two conditions is last to be satisfied.
    let minDone = false
    let loadDone = false

    const tryDismiss = () => {
      if (minDone && loadDone) setShow(false)
    }

    const minTimer = setTimeout(() => {
      minDone = true
      tryDismiss()
    }, 1000)

    if (document.readyState === 'complete') {
      loadDone = true
    } else {
      window.addEventListener('load', () => { loadDone = true; tryDismiss() }, { once: true })
    }

    return () => clearTimeout(minTimer)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ opacity: 0, transition: { duration: 0.55, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
        >
          {/* Logo + brand name */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <Image
              src="/databerry_logo_v2.svg"
              alt="DataBerry"
              width={40}
              height={40}
              priority
              className="rounded-xl"
            />
            <span
              className="text-[1.6rem] font-bold text-primary"
              style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '0.05em' }}
            >
              DataBerry
            </span>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-5 text-sm text-subtle select-none tracking-wide"
          >
            All business data. In one place.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
