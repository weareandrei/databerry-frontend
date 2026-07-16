'use client'

/**
 * Icon for a traffic source, shared by the overview Sources panel and the
 * People table's Source column (both render normalized referrers). Priority:
 *
 *   1. Curated brand logo from /public/logos (crisp, brand-controlled).
 *   2. Favicon-on-the-go for any value that resolves to a real domain — but
 *      ONLY where we'd otherwise show the generic Globe (no dedicated Phosphor
 *      brand glyph). Same approach as `ProjectIcon`: an <img> at Google's
 *      favicon resolver, with the browser's HTTP cache handling per-domain
 *      caching for free (no localStorage — that would just duplicate it). On a
 *      load error it falls through to the Phosphor icon.
 *   3. Phosphor fallback (a brand glyph where we have one, else Globe).
 */

import Image from 'next/image'
import { useState } from 'react'
import {
  FacebookLogo,
  GithubLogo,
  Globe,
  InstagramLogo,
  LinkedinLogo,
  LinkSimple,
  NewspaperClipping,
  TiktokLogo,
  YoutubeLogo,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'

function fallbackIcon(sourceKey: string): PhosphorIcon {
  switch (sourceKey) {
    case 'direct':    return LinkSimple
    case 'youtube':   return YoutubeLogo
    case 'facebook':  return FacebookLogo
    case 'linkedin':  return LinkedinLogo
    case 'github':    return GithubLogo
    case 'instagram': return InstagramLogo
    case 'tiktok':    return TiktokLogo
    case 'hn':        return NewspaperClipping
    default:          return Globe
  }
}

function faviconUrl(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
}

// A couple of normalized brand keys carry a brand NAME ("Bing", "DuckDuckGo")
// rather than a domain, so map those to their canonical host. Everything else
// with a real domain already IS the domain (overview's `other` long tail, or a
// People row's raw `$initial_referring_domain`) — resolved by `isDomainLike`.
const KEY_TO_DOMAIN: Record<string, string> = {
  bing: 'bing.com',
  duckduckgo: 'duckduckgo.com',
}

// True when a string looks like a bare hostname we can fetch a favicon for —
// 't.co', 'news.ycombinator.com', 'google.com' — but not a brand label
// ('Hacker News'), a category ('Organic'), 'direct', or the "couldn't tell"
// bucket.
function isDomainLike(value: string): boolean {
  return /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value.trim())
}

function domainForSource(sourceKey: string, label: string): string | null {
  return KEY_TO_DOMAIN[sourceKey] ?? (isDomainLike(label) ? label.trim() : null)
}

export function SourceIcon({
  sourceKey,
  label,
  logo,
  size = 20,
}: {
  sourceKey: string
  label: string
  logo?: string
  size?: number
}) {
  const [errored, setErrored] = useState(false)
  if (logo) {
    return (
      <Image src={logo} alt={label} width={size} height={size} className="rounded-sm shrink-0" />
    )
  }
  const Fallback = fallbackIcon(sourceKey)
  const domain = domainForSource(sourceKey, label)
  if (domain && Fallback === Globe && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- off-domain favicon
      // CDN image; next/image would force domain whitelisting for no benefit.
      <img
        src={faviconUrl(domain)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setErrored(true)}
        className="rounded-sm shrink-0"
      />
    )
  }
  return <Fallback size={size} weight="regular" className="text-foreground shrink-0" />
}
