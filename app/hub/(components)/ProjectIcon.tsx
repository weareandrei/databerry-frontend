'use client'

/**
 * Per-project icon — the website's favicon when `project.websiteUrl`
 * is set, the generic Cube icon otherwise.
 *
 * Storage strategy: we don't store the favicon image anywhere. The
 * `<img>` points at Google's `s2/favicons` resolver, which returns a
 * PNG for any domain (heavily CDN-cached). The browser's HTTP cache
 * handles per-domain caching automatically.
 *
 * Visual chrome differs between the two states:
 *
 *   - **Cube fallback** keeps the dashboard's "icon-in-a-pill" look
 *     (rounded-full bg-white + border-stroke + shadow) when `pill`
 *     is true. Compact contexts like the sidebar pass `pill=false`
 *     for a bare Cube.
 *   - **Favicon** never gets the pill — no white background, no
 *     border, no padding, no shadow. The favicon image fills the
 *     icon slot directly with just a tiny `rounded-sm` to soften
 *     hard corners. Site icons already have their own visual
 *     identity; wrapping them in pill chrome would fight with that.
 *
 * Failure modes (all surface the Cube fallback):
 *   - User entered an unparseable URL → host extraction returns null.
 *   - Google's resolver 4xx/5xx for the domain → `<img>` fires
 *     `onError`.
 *   - Network blip → same.
 */

import { useState } from 'react'
import { Cube } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface ProjectIconProps {
  /** Project's website URL (or null/undefined for the Cube fallback). */
  websiteUrl: string | null | undefined
  /**
   * Outer visual size of the icon slot in px. The Cube is rendered
   * inside its pill chrome (when `pill=true`) or bare (when
   * `pill=false`); the favicon always fills this size directly.
   */
  size?: number
  /**
   * Wrap the Cube fallback in the dashboard's rounded white pill
   * (border + shadow). Default true. Set false for compact contexts
   * (sidebar) where icons appear bare. Has no effect on the favicon
   * — favicons never get the pill.
   */
  pill?: boolean
  /** Optional className applied to whichever element renders. */
  className?: string
}

/**
 * Pull the host out of a stored URL. Tolerates stored values that
 * may or may not have a scheme; returns null when the URL doesn't
 * parse.
 */
function hostOf(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).host
  } catch {
    return null
  }
}

function faviconUrlFor(host: string): string {
  // `sz=64` requests a target size — Google scales up smaller
  // favicons. We always ask for 64 even when rendering smaller so
  // retina displays look crisp.
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
}

// Tailwind `p-2` = 8 px on each side. The Cube's pill chrome uses
// this padding; we mirror it as an explicit pixel value so we can
// derive the inner Cube size from the outer `size` prop.
const PILL_PADDING_PX = 8

export function ProjectIcon({
  websiteUrl,
  size = 30,
  pill = true,
  className,
}: ProjectIconProps) {
  // `errored` flips when the favicon `<img>` fires onError — we
  // remember it so a single failure doesn't cause a flicker loop.
  const [errored, setErrored] = useState(false)
  const host = hostOf(websiteUrl)

  // ── Cube fallback ────────────────────────────────────────────────
  if (!host || errored) {
    if (pill) {
      // Inner Cube is sized to leave the pill's padding around it;
      // the math matches the original `<Cube size={14}>` inside a
      // `p-2` (8 px) pill from the project header (14 + 8 + 8 = 30).
      const innerSize = Math.max(8, size - PILL_PADDING_PX * 2)
      return (
        <span
          style={{ width: size, height: size }}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-white border border-stroke shadow-pill',
            className,
          )}
        >
          <Cube size={innerSize} weight="bold" className="text-grey-darkest" />
        </span>
      )
    }
    return (
      <Cube
        size={size}
        weight="bold"
        className={cn('text-grey-darkest shrink-0', className)}
      />
    )
  }

  // ── Favicon (bare, no pill) ──────────────────────────────────────
  // `eslint-disable-next-line @next/next/no-img-element` — Next's
  // `<Image>` would force us to whitelist `google.com` in
  // `next.config.ts` and adds bundle weight for an off-domain CDN
  // image we don't optimize anyway. Native `<img>` is correct here.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faviconUrlFor(host)}
      alt=""
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className={cn('block shrink-0 rounded-sm', className)}
    />
  )
}
