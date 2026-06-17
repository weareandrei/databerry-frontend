import { cn } from '@/lib/utils'

/**
 * Deterministic generative avatar for a person — replaces name initials.
 *
 * The face is a DiceBear `adventurer` SVG derived from a stable seed (the
 * person's id) and served by the cached `/api/avatar/[seed]` route. We store
 * nothing: the same seed always renders the same face, so there's no DB
 * column or Storage object to keep in sync. `loading="lazy"` means only the
 * rows actually on screen ever hit the route — important when a project has
 * tens of thousands of people.
 */

// Deterministic pastel background per seed, so each (transparent) face reads
// as a distinct chip. Pure hash → hue; no state, no storage.
function pastelBg(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return `hsl(${h % 360} 65% 90%)`
}

export function PersonAvatar({
  seed,
  name,
  size = 28,
  className,
}: {
  seed: string
  name?: string | null
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-stroke',
        className,
      )}
      style={{ width: size, height: size, backgroundColor: pastelBg(seed) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny
          same-origin, already-cached SVG; next/image adds nothing here. */}
      <img
        src={`/api/avatar/${encodeURIComponent(seed)}`}
        alt={name ? `${name}'s avatar` : 'Avatar'}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full"
      />
    </span>
  )
}
