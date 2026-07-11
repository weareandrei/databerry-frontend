'use client'

/**
 * Discrete event-volume slider that sits above the pricing cards.
 * Six fixed stops — 50K, 250K, 500K, 1M, 5M, 10M+ — that the thumb
 * snaps to (no in-between values). Dragging or arrow-keying changes
 * the selected tier, which the parent uses to swap each card's price.
 *
 * Implementation: a real `<input type="range" step="1">` (0–5)
 * provides dragging, keyboard, and snap-to-step for free, rendered
 * invisible on top of a styled track. The visible track, fill, stop
 * dots, thumb, and the floating value tooltip are all positioned
 * from the same `index / (count − 1)` percentage so they stay glued
 * to the native thumb.
 */

import { cn } from '@/lib/utils'

export interface EventTier {
  events: number
  label: string
}

/**
 * The canonical breakpoints. `events` matches `max_events_monthly`
 * in the `subscriptions` table (50000 = base Starter/Pro, the rest
 * are variation rows). Keep in sync with the seed SQL.
 */
export const EVENT_TIERS: EventTier[] = [
  { events: 50_000, label: '50K' },
  { events: 250_000, label: '250K' },
  { events: 500_000, label: '500K' },
  { events: 1_000_000, label: '1M' },
  { events: 5_000_000, label: '5M' },
  { events: 10_000_000, label: '10M+' },
]

export function EventVolumeSlider({
  index,
  onChange,
}: {
  index: number
  onChange: (index: number) => void
}) {
  const last = EVENT_TIERS.length - 1
  const pct = (index / last) * 100
  const current = EVENT_TIERS[index]

  return (
    <div className="mx-auto w-full max-w-xl px-2">
      {/* Floating tooltip — slides along with the thumb. `left` is
          animated so it glides rather than jumps between stops. */}
      <div className="relative h-10">
        <div
          className="absolute -translate-x-1/2 transition-[left] duration-300 ease-out"
          style={{ left: `${pct}%` }}
        >
          <div className="relative flex flex-col items-center">
            <span className="rounded-lg bg-foreground px-2.5 py-1 text-xs font-bold text-white shadow-card whitespace-nowrap">
              {current.label}
            </span>
            {/* Little downward caret on the bubble. */}
            <span className="h-2 w-2 -mt-1 rotate-45 bg-foreground" />
          </div>
        </div>
      </div>

      {/* Track region. `h-6` gives the thumb vertical room; the
          visual track is centered within it. */}
      <div className="relative h-6 select-none">
        {/* Base track */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1.5 rounded-full bg-stroke" />
        {/* Filled portion up to the thumb */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-1.5 rounded-full bg-secondary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
        {/* Stop dots */}
        {EVENT_TIERS.map((t, i) => {
          const dotPct = (i / last) * 100
          const passed = i <= index
          return (
            <span
              key={t.events}
              className={cn(
                'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 transition-colors',
                passed
                  ? 'bg-secondary border-secondary'
                  : 'bg-white border-stroke',
              )}
              style={{ left: `${dotPct}%` }}
            />
          )
        })}
        {/* Thumb */}
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border-2 border-secondary shadow-card transition-[left] duration-300 ease-out pointer-events-none"
          style={{ left: `${pct}%` }}
        />
        {/* Invisible native range on top — owns all interaction. */}
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={index}
          onChange={e => onChange(Number(e.target.value))}
          aria-label="Monthly tracked events"
          aria-valuetext={current.label}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        />
      </div>

      {/* Caption — the "Up to X" framing. */}
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Up to{' '}
        <span className="font-semibold text-foreground">{current.label}</span>{' '}
        tracked events / month
      </p>
    </div>
  )
}
