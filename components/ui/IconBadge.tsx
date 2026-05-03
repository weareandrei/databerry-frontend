'use client'

/**
 * Small round white container with a subtle border + drop shadow — the
 * "icon-in-a-pill" pattern used in section headers across the app
 * (project view bread-crumbs, settings page, the new connection dialog
 * header). Centralised here so the styling stays in one place and we
 * don't end up with five copies of the same `boxShadow` literal.
 *
 * The default size (28px) matches `SectionHeader`'s round button — so an
 * `IconBadge` next to a `SectionHeader` reads as part of the same
 * visual language.
 */

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface IconBadgeProps {
  children: ReactNode
  /** Outer pill size in px. Children are sized independently. */
  size?: number
  className?: string
}

export function IconBadge({ children, size = 28, className }: IconBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-stroke bg-white shadow-pill',
        className,
      )}
      // `width`/`height` stay inline because they're dynamic (the
      // caller picks the size). The drop shadow used to be inline too
      // but is now the shared `shadow-pill` Tailwind utility.
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  )
}
