'use client'

/**
 * Tiny inline SVG previews keyed by `ViewKind`. Used on each view-type
 * card in the picker so the user can recognise at a glance whether the
 * view they're about to create renders as a number, a chart, or a list.
 *
 * Why inline SVGs and not Phosphor icons:
 *  - Phosphor's chart/list icons are crisp but read as *icons*. We want
 *    a slightly softer, "preview" feel — closer to a thumbnail of the
 *    real tile than to a label.
 *  - Inline SVGs let us use rounded primitives + currentColor so they
 *    match the muted grey/foreground palette without an asset pipeline.
 *
 * Sizing: the wrapper provides the card's preview frame (~5:2 aspect on
 * the parent card). The SVGs `viewBox` is 100x40 and uses `width="100%"
 * height="100%"` + `preserveAspectRatio="xMidYMid meet"` so they scale
 * with whatever the parent gives them.
 */

import type { ViewKind } from '@/constants/viewOptions'
import { cn } from '@/lib/utils'

export function ViewIllustration({
  kind,
  className,
}: {
  kind: ViewKind
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground/70',
        className,
      )}
    >
      {kind === 'value' && <ValuePreview />}
      {kind === 'chart' && <ChartPreview />}
      {kind === 'list' && <ListPreview />}
    </div>
  )
}

function ValuePreview() {
  // Stylised "1,234" — large tabular digits in muted-foreground. Mirrors
  // the dashboard ViewCard's `text-2xl font-semibold tabular-nums` rendering.
  return (
    <span className="text-[20px] font-semibold leading-none tabular-nums tracking-tight text-foreground/55">
      1,234
    </span>
  )
}

function ChartPreview() {
  // Seven mini bars rising in a gentle arc. Bars use rounded tops; the
  // last bar is highlighted to suggest "today / latest". Heights chosen
  // to look like a real-ish week of data, not a mathematical curve.
  const bars = [10, 16, 13, 22, 18, 28, 24]
  return (
    <svg
      viewBox="0 0 100 40"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {bars.map((h, i) => {
        const x = 8 + i * 12
        const y = 36 - h
        const isLast = i === bars.length - 1
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={6}
            height={h}
            rx={1.5}
            fill="currentColor"
            opacity={isLast ? 0.85 : 0.45}
          />
        )
      })}
    </svg>
  )
}

function ListPreview() {
  // Three rows: a small leading dot/circle on the left + a horizontal
  // line of varying length on the right. Reads as "list of items" the
  // way `ViewCardList` (Calendly meetings) actually renders.
  const rows = [
    { y: 9, w: 70 },
    { y: 20, w: 56 },
    { y: 31, w: 64 },
  ]
  return (
    <svg
      viewBox="0 0 100 40"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {rows.map((r, i) => (
        <g key={i} fill="currentColor">
          <circle cx={10} cy={r.y + 1} r={1.6} opacity={0.55} />
          <rect x={16} y={r.y - 1} width={r.w} height={3} rx={1.5} opacity={0.45} />
        </g>
      ))}
    </svg>
  )
}
