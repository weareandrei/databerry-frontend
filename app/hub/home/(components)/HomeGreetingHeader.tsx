'use client'

import { useSelector } from 'react-redux'
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { RootState } from '@/store'
import type { GlobalDateMode } from '@/utils/dateHelpers'

function maskedEmail(email: string | undefined): string {
  if (!email) return 'there'
  const at = email.indexOf('@')
  if (at <= 0) return email

  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const prefix = local.slice(0, Math.min(2, local.length))

  return `${prefix}****@${domain}`
}

function periodPossessive(mode: GlobalDateMode): string {
  switch (mode) {
    case 'daily':
      return "day's"
    case 'monthly':
      return "month's"
    default:
      return "week's"
  }
}

interface HomeGreetingContentProps {
  /**
   * Text after "Hi " when `title` is omitted — e.g. masked email or
   * `"there"`. Prefer `title` when the heading needs richer markup
   * (inline flag, etc.).
   */
  greeting?: string
  /** Full heading content; when set, replaces the default `Hi {greeting}!`. */
  title?: ReactNode
  mode: GlobalDateMode
  /** Slightly tighter type on the mobile home card. */
  compact?: boolean
  /** Formatted revenue (e.g. `"$12,480"`). Defaults to the `$XXX` placeholder. */
  revenueLabel?: string
  /** Formatted visitor count (e.g. `"8,420"`). Defaults to the `XXX` placeholder. */
  visitorsLabel?: string
}

/** Presentational "Hi {name}" + period stats — shared by hub + demo. */
export function HomeGreetingContent({
  greeting = 'there',
  title,
  mode,
  compact = false,
  revenueLabel = '$XXX',
  visitorsLabel = 'XXX',
}: HomeGreetingContentProps) {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <h1
        className={
          compact
            ? 'text-2xl font-bold tracking-tight text-foreground'
            : 'text-3xl font-bold tracking-tight text-foreground'
        }
      >
        {title ?? (
          <>
            Hi {greeting}!
          </>
        )}
      </h1>
      <p
        className={
          compact
            ? 'mt-2 px-3 text-sm font-normal leading-snug text-foreground'
            : 'mt-2.5 text-md font-normal leading-snug text-foreground'
        }
      >
        This{' '}
        <span className="font-bold underline decoration-foreground underline-offset-[3px]">
          {periodPossessive(mode)}
        </span>{' '}
        total revenue: <span className="font-bold">{revenueLabel}</span>. Total traffic:{' '}
        <span className="font-bold">{visitorsLabel}</span> visitors
      </p>
    </div>
  )
}

export function HomeGreetingHeader({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)

  return (
    <HomeGreetingContent
      greeting={maskedEmail(user?.email)}
      mode={mode}
      compact={compact}
    />
  )
}
