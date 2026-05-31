'use client'

import Image from 'next/image'
import {
  GitBranch,
  XLogo,
  RedditLogo,
  EnvelopeSimple,
  WebhooksLogoIcon,
  PlugsConnected,
  ChartBar,
  Cpu,
} from '@phosphor-icons/react'

// Types that have a custom image in /public/connections/
const TYPE_IMAGES: Record<string, string> = {
  posthog:          '/connections/posthog_icon.png',
  stripe:           '/connections/stripe_icon.png',
  stripe_manual:    '/connections/stripe_icon.png',
  calendly:         '/connections/calendly_icon.png',
  google_analytics: '/connections/ga_icon.png',
  vercel:           '/connections/vercel_icon.png',
  sentry:           '/connections/sentry_icon.png',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  github: GitBranch,
  x: XLogo,
  reddit: RedditLogo,
  gmail: EnvelopeSimple,
  webhook: WebhooksLogoIcon,
  custom: PlugsConnected,
  composite: ChartBar,
  // MCP (Model Context Protocol) — no per-provider brand here (it's
  // a protocol, not a single vendor). `Cpu` reads as "general
  // tool-calling endpoint" without leaning on any one MCP server.
  mcp: Cpu,
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
