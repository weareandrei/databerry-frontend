'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { DATABERRY_LOGO_PATH } from '@/constants/brand'
import { TextMorph } from './TextMorph'
import { INTEGRATION_LOGOS } from '@/constants/integrationLogos'

/** The wordmark appears, holds, then morphs into the row of tool logos. */
const MORPH = { delay: 0.1, duration: 0.6, hold: 0.5 }

/** Seconds from the start of the sequence until the tagline has landed
 *  and been on screen for one more `hold`. */
const SEQUENCE_MS = (MORPH.delay + 2 * MORPH.duration + 2 * MORPH.hold) * 1000

/** Every tile in the lockup — Databerry's and the tools' — is this size:
 *  smaller on phones so all eight fit on one line. */
const TILE = 'size-8 shrink-0 md:size-[50px]'

/**
 * The tools, ordered for balance rather than as the hero lists them: light
 * tiles next to Databerry's solid orange one, the two black marks apart,
 * and Stripe's solid purple at the far end as its counterweight.
 */
const TOOL_ORDER = [
  'Datafast',
  'PostHog',
  'Notion',
  'Gmail',
  'Google Analytics',
  'Sentry',
  'Stripe',
]
const TOOLS = TOOL_ORDER.map(name => INTEGRATION_LOGOS.find(logo => logo.alt === name)!)

export function LoadingScreen() {
  const [show, setShow] = useState(true)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    // The sequence waits for the page to finish loading: while the page is
    // still loading, the browser is too busy to draw it smoothly (in dev it
    // would play half-frozen, or be over before it was seen). The screen
    // then stays up until the sequence has finished.
    let timer: ReturnType<typeof setTimeout> | undefined

    const start = () => {
      setPlaying(true)
      timer = setTimeout(() => setShow(false), SEQUENCE_MS)
    }

    if (document.readyState === 'complete') {
      start()
    } else {
      window.addEventListener('load', start, { once: true })
    }

    return () => {
      window.removeEventListener('load', start)
      clearTimeout(timer)
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ opacity: 0, transition: { duration: 0.55, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
        >
          {/* Databerry's logo stays put; beside it, the wordmark morphs into
              the tools it brings together, as tiles of the same size. */}
          <div className="flex items-center gap-1.5 px-6 md:gap-3">
            <Image
              src={DATABERRY_LOGO_PATH}
              alt="Databerry"
              width={50}
              height={50}
              priority
              // The SVG's artwork fills only ~87% of its box; scaling it up
              // makes it the same visible size as the tool tiles.
              className={`loading-logo-in ${TILE} scale-[1.15] rounded-xl`}
              // Arrives with the wordmark, once the page has loaded — by
              // then the lockup has its final position.
              style={{ animationPlayState: playing ? 'running' : 'paused' }}
            />

            <TextMorph
              {...MORPH}
              paused={!playing}
              align="start"
              items={[
                {
                  id: 'wordmark',
                  content: 'databerry',
                  className:
                    'text-[1.6rem] md:text-[2.25rem] font-bold tracking-[-0.01em] text-secondary [font-family:var(--font-bricolage)]',
                },
                {
                  id: 'tools',
                  content: (
                    <span className="flex items-center gap-1.5 md:gap-3">
                      {TOOLS.map(logo => (
                        <Image
                          key={logo.alt}
                          src={logo.src}
                          alt={logo.alt}
                          width={50}
                          height={50}
                          // Solid border, not a shadow: the morph's filter
                          // erases soft shadows mid-animation.
                          className={`${TILE} rounded-xl border border-stroke bg-white`}
                        />
                      ))}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
