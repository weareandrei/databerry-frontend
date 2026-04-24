'use client'

import Image from 'next/image'
import {
  Bug,
  GitBranch,
  XLogo,
  RedditLogo,
  EnvelopeSimple,
  WebhooksLogoIcon,
  PlugsConnected,
  ChartBar,
} from '@phosphor-icons/react'

// Types that have a custom image in /public/connections/
const TYPE_IMAGES: Record<string, string> = {
  posthog:          '/connections/posthog_icon.png',
  stripe:           '/connections/stripe_icon.png',
  stripe_manual:    '/connections/stripe_icon.png',
  calendly:         '/connections/calendly_icon.png',
  google_analytics: '/connections/ga_icon.png',
  vercel:           '/connections/vercel_icon.png',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  sentry: Bug,
  github: GitBranch,
  x: XLogo,
  reddit: RedditLogo,
  gmail: EnvelopeSimple,
  webhook: WebhooksLogoIcon,
  custom: PlugsConnected,
  composite: ChartBar,
}

interface ConnectionIconProps {
  type: string
  /** Size in px used for both the image and the Phosphor icon fallback */
  size?: number
  className?: string
}

export function ConnectionIcon({ type, size = 16, className }: ConnectionIconProps) {
  const imageSrc = TYPE_IMAGES[type]

  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt={type}
        width={size}
        height={size}
        className={`rounded-sm shrink-0 ${className ?? ''}`}
      />
    )
  }

  const Icon = TYPE_ICONS[type] ?? PlugsConnected
  return <Icon size={size} weight="bold" className={`shrink-0 ${className ?? ''}`} />
}
