'use client'

/**
 * Minimal rectangular country flag (3×2 SVG) for dashboard tables and
 * panels. Uses `country-flag-icons` — same source as the overview
 * countries panel. Falls back to a globe icon for unknown codes.
 */

import * as Flags from 'country-flag-icons/react/3x2'
import { Globe } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type CountryFlagSize = 'sm' | 'md'

const SIZE_CLASS: Record<CountryFlagSize, string> = {
  sm: 'w-[18px] rounded-[1px]',
  md: 'w-5 rounded-[2px]',
}

const GLOBE_SIZE: Record<CountryFlagSize, number> = {
  sm: 14,
  md: 16,
}

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code (e.g. `US`, `GB`). */
  code: string | null | undefined
  name?: string
  size?: CountryFlagSize
  className?: string
  /** Globe fallback colour when the code is missing or unsupported. */
  fallbackClassName?: string
}

export function CountryFlag({
  code,
  name,
  size = 'md',
  className,
  fallbackClassName = 'text-muted-foreground',
}: CountryFlagProps) {
  if (!code || !/^[a-z]{2}$/i.test(code)) return null

  const upper = code.toUpperCase()
  const FlagComp = (
    Flags as Record<string, React.ComponentType<{ title?: string; className?: string }>>
  )[upper]

  if (!FlagComp) {
    return (
      <Globe
        size={GLOBE_SIZE[size]}
        weight="regular"
        className={cn('shrink-0', fallbackClassName, className)}
        aria-label={name || upper}
      />
    )
  }

  return (
    <FlagComp
      title={name || upper}
      className={cn('h-auto shrink-0 ring-1 ring-black/[0.06]', SIZE_CLASS[size], className)}
    />
  )
}
