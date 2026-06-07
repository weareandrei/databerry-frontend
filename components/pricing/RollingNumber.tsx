'use client'

/**
 * Odometer-style rolling number. Each digit is a vertical strip of
 * 0–9; changing the value translates each strip to its new digit, so
 * the figures "roll" like a mechanical counter. Used for the pricing
 * cards' price when the event-volume slider changes the tier.
 *
 * Pure CSS transform animation — no JS tween loop, no dependency.
 * The strip is `10em` tall (ten `1em` cells); `translateY(-digit em)`
 * shows the target digit through a `1em` overflow window. Because the
 * window is sized in `em`, it scales automatically with the price's
 * font-size across breakpoints.
 *
 * Two things make EVERY transition animate, including digit-count
 * changes ($5 → $15):
 *   1. Digits are keyed by position FROM THE RIGHT, so shared
 *      trailing digits (the units place) persist across a count
 *      change and animate in place instead of remounting.
 *   2. Each digit starts at 0 and rolls to its value on mount, so a
 *      newly-appearing leading digit (the tens place that shows up
 *      when $5 becomes $15) rolls in from 0 rather than snapping.
 *
 * Everything is bottom-aligned (`items-end`) so the digits sit on the
 * same baseline as the surrounding `$` / `/month`, which the caller
 * renders in a `flex items-end` row.
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function RollingDigit({ digit }: { digit: number }) {
  // Start at 0, then roll to the target on mount via the effect.
  // For a persistent column this also rolls 0→value on first paint
  // (a pleasant entrance); for a column that appears mid-transition
  // (the new leading digit) it makes that digit roll in instead of
  // popping.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    // Next frame so the browser registers the initial `0` position
    // before we change it — otherwise it'd collapse both into one
    // paint and skip the transition.
    const id = requestAnimationFrame(() => setShown(digit))
    return () => cancelAnimationFrame(id)
  }, [digit])

  return (
    <span
      className="relative inline-block overflow-hidden align-bottom"
      style={{ height: '1em', width: '0.62em' }}
      aria-hidden="true"
    >
      <span
        className="flex flex-col"
        style={{
          transform: `translateY(-${shown}em)`,
          transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {DIGITS.map(n => (
          <span
            key={n}
            className="flex items-end justify-center"
            style={{ height: '1em', lineHeight: 1 }}
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  )
}

export function RollingNumber({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  // Whole-dollar integer — our price points are all round dollars.
  const safe = Math.max(0, Math.round(value))
  const digits = String(safe).split('')
  const n = digits.length

  return (
    // `tabular-nums` keeps each glyph the same width so the strip
    // windows line up. `aria-label` carries the real value since the
    // per-digit strips are aria-hidden.
    <span
      className={cn('inline-flex items-end tabular-nums leading-none', className)}
      aria-label={String(safe)}
    >
      {digits.map((d, i) => (
        // Key by position FROM THE RIGHT (units = 0, tens = 1, …).
        // Shared trailing digits keep a stable key across a
        // digit-count change, so they animate instead of remounting;
        // only the appearing/disappearing leading digit changes
        // identity.
        <RollingDigit key={n - 1 - i} digit={Number(d)} />
      ))}
    </span>
  )
}
