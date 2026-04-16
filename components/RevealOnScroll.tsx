'use client'

import { motion } from 'framer-motion'

interface RevealOnScrollProps {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
}

/**
 * Wraps content and animates it in (fade + rise) when it enters the viewport.
 * Uses `whileInView` with `once: true` so it only plays the first time.
 */
export function RevealOnScroll({ children, className, delay = 0, y = 28 }: RevealOnScrollProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
