'use client'

import { motion } from 'framer-motion'
import { CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionHeaderProps {
  label: string
  collapsed: boolean
  onToggle: () => void
  action?: React.ReactNode
  variant?: 'desktop' | 'mobile'
}

export function CollapsibleSectionHeader({
  label,
  collapsed,
  onToggle,
  action,
  variant = 'desktop',
}: CollapsibleSectionHeaderProps) {
  const isDesktop = variant === 'desktop'

  return (
    <div
      className={cn(
        'mb-1 flex w-full items-center justify-between',
        isDesktop
          ? 'px-3 text-xs font-medium uppercase tracking-wider text-subtle'
          : 'pl-5 pr-5 text-sm text-muted-foreground',
      )}
    >
      <span
        onClick={onToggle}
        className={cn(
          'flex-1 cursor-pointer transition-colors',
          isDesktop ? 'hover:text-muted-foreground' : 'text-left hover:text-foreground',
        )}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {action}
        <motion.span
          onClick={onToggle}
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'cursor-pointer transition-colors',
            isDesktop ? 'hover:text-muted-foreground' : 'hover:text-foreground',
          )}
        >
          <CaretDown size={11} weight="bold" />
        </motion.span>
      </div>
    </div>
  )
}
