'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ViewWrapperProps {
  children: React.ReactNode
  className?: string
}

export function ViewWrapper({ children, className }: ViewWrapperProps) {
  return (
    <div className={cn('relative h-full', className)}>
      {/* Notch — stays behind while card lifts */}
      <div
        className="absolute inset-x-0 top-1 bottom-[-5px] rounded-xl border bg-[#EAEAEA]/50 border-stroke"
      />
      {/* Main card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 40 }}
        className="relative flex flex-col h-full rounded-xl bg-white border border-stroke shadow-card"
      >
        {children}
      </motion.div>
    </div>
  )
}
