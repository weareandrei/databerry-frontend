'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Words that melt into one another — adapted from Originkit's "Text Morph".
 *
 * Each item blurs in from small, holds, then blurs out growing while the
 * next one blurs in. A "goo" SVG filter (blur, then a hard alpha threshold)
 * fuses the overlapping blurry shapes, so one word seems to flow into the
 * next instead of cross-fading.
 *
 * Unlike the original it plays once and stops on the last item, and each
 * item can have its own style — a wordmark can morph into a smaller
 * tagline. The keyframes live in `globals.css` (`morph-item`) so the
 * animation starts with the first paint, before any JavaScript has run.
 */

interface TextMorphItem {
  /** Stable, unique key for the item. */
  id: string
  /** Text, or anything else — a row of icons morphs just the same. */
  content: React.ReactNode
  className?: string
}

interface TextMorphProps {
  /** Shown in turn; the last one stays. */
  items: TextMorphItem[]
  /** Seconds before the first item starts to appear. */
  delay?: number
  /** Seconds one item takes to morph into the next. */
  duration?: number
  /** Seconds each item (except the last) stays fully visible. */
  hold?: number
  /** While true the sequence waits at its start, with nothing shown. */
  paused?: boolean
  /** `start` lines every item up on the left edge (and grows/shrinks it
   *  from there) — for text that sits next to something, like a logo.
   *  The box then takes the width of the item on show, gliding to the
   *  next one's width during each morph, so whatever sits beside it stays
   *  centred with it instead of next to a gap sized for the longest item. */
  align?: 'center' | 'start'
  className?: string
}

export function TextMorph({
  items,
  delay = 0,
  duration = 0.6,
  hold = 0.5,
  paused = false,
  align = 'center',
  className,
}: TextMorphProps) {
  const filterId = `text-morph-${useId().replace(/:/g, '')}`
  const stackRef = useRef<HTMLDivElement>(null)
  const settled = useSettled(stackRef)
  const width = useShownItemWidth(stackRef, {
    enabled: align === 'start',
    paused,
    switchTimes: items.slice(1).map((_, i) => delay + (i + 1) * (duration + hold)),
  })

  return (
    <div className={cn('relative', className)}>
      <svg aria-hidden className="pointer-events-none absolute size-0">
        <defs>
          <filter id={filterId}>
            {/* Alpha × 25 − 9: soft blurred edges snap to solid shapes. */}
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* All items share one grid cell, so the box is as big as the
          largest item from the start and nothing shifts as they swap.
          The threshold also hardens the edges of still text, so the filter
          is only on until the last item has landed. */}
      <div
        ref={stackRef}
        data-morph-paused={paused || undefined}
        className={cn(
          'grid items-center select-none',
          align === 'start' ? 'justify-items-start' : 'justify-items-center',
        )}
        style={{
          filter: settled ? undefined : `url(#${filterId})`,
          width,
          transition: `width ${duration}s cubic-bezier(0.65, 0, 0.35, 1)`,
        }}
      >
        {items.map((item, index) => {
          const last = index === items.length - 1
          const appearsAt = delay + index * (duration + hold)

          return (
            <span
              key={item.id}
              aria-hidden={!last}
              className={cn(
                // Not `text-…`: tailwind-merge would read that as a text
                // colour and drop it in favour of the item's own colour.
                // `w-max`: each item keeps its natural width even while the
                // box is narrower (`align="start"` narrows it to the item
                // on show), so measuring it always gives the real width.
                'morph-item w-max whitespace-nowrap',
                last && 'morph-last',
                align === 'start' && 'origin-left',
                item.className,
              )}
              style={
                {
                  '--tm-duration': `${duration}s`,
                  '--tm-in': `${seconds(appearsAt)}`,
                  '--tm-out': `${seconds(appearsAt + duration + hold)}`,
                } as React.CSSProperties
              }
            >
              {item.content}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Width of the item currently on show, in px — `undefined` until measured
 * (the box then simply fits the widest item). Each switch time is when the
 * next item starts morphing in; the box's CSS transition does the gliding.
 */
const useShownItemWidth = (
  ref: React.RefObject<HTMLElement | null>,
  { enabled, paused, switchTimes }: { enabled: boolean; paused: boolean; switchTimes: number[] },
) => {
  const [widths, setWidths] = useState<number[] | null>(null)
  const [shown, setShown] = useState(0)

  useLayoutEffect(() => {
    const element = ref.current
    if (!enabled || !element) return

    // Layout widths, unaffected by the items' running scale animation.
    const measure = () =>
      setWidths(Array.from(element.children, child => (child as HTMLElement).offsetWidth))
    measure()
    // Web fonts change the text's width once they swap in.
    void document.fonts.ready.then(measure)
  }, [enabled, ref])

  const switchKey = switchTimes.join(',')
  useEffect(() => {
    if (!enabled || paused) return
    const timers = switchKey
      .split(',')
      .filter(Boolean)
      .map((at, index) => window.setTimeout(() => setShown(index + 1), Number(at) * 1000))
    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [enabled, paused, switchKey])

  return enabled && widths ? widths[shown] : undefined
}

/**
 * True once every animation inside the element has finished — including
 * when they had already finished before React hydrated, since the CSS
 * animations start with the first paint.
 */
const useSettled = (ref: React.RefObject<HTMLElement | null>) => {
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let cancelled = false
    Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished))
      .then(() => {
        if (!cancelled) setSettled(true)
      })
      // Rejected when an animation is cancelled, e.g. on unmount.
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [ref])

  return settled
}

/** `1.2000000000000002` → `"1.2s"`. */
const seconds = (value: number) => `${Number(value.toFixed(3))}s`
