'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import type { OverviewSource } from '@/lib/api'
import { sourceStyle } from '@/constants/trafficSources'

interface OverviewSourcesPanelProps {
  sources: OverviewSource[]
  loading?: boolean
  unavailable?: boolean
}

// ---- Bar-geometry constants (kept in one place so math stays in sync) ---------
const BAR_WIDTH = 7 // px — each mini-bar
const BAR_GAP = 2 // px — between bars
const BAR_HEIGHT = 18 // px — vertical size of each mini-bar
const LEFT_BREATHING_RATIO = 0.15 // leave 15% empty on the left of the biggest row
const BAR_MIN = 1 // never render zero bars — always show at least one
const BAR_STEP = BAR_WIDTH + BAR_GAP

// ---- Fallback icon map for sources without a proper brand logo ----------------
// Known logo files in /public/logos live on `NormalizedSource.logo` and take
// precedence. Everything else falls back to a Phosphor icon.
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

// ---- Width-tracking hook (native ResizeObserver, matches existing codebase use)
function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Seed with current width (ResizeObserver may skip the initial paint).
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        // contentBoxSize is the modern accessor; fall back to contentRect for older browsers.
        const w = entry.contentRect.width
        setWidth(Math.round(w))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}

// ---- Bar-count math ------------------------------------------------------------
// For a given row width, determine how many bars the *leader* row should have,
// then scale every other row relative to it so visitors/maxVisitors * leaderBars.
function computeBarCounts(
  sources: OverviewSource[],
  rowWidth: number,
): Map<string, number> {
  const out = new Map<string, number>()
  if (rowWidth <= 0 || sources.length === 0) return out

  const maxVisitors = sources.reduce((m, s) => Math.max(m, s.visitors), 0)
  if (maxVisitors <= 0) return out

  const usable = Math.max(0, rowWidth * (1 - LEFT_BREATHING_RATIO))
  // Bars fit exactly: N * BAR_WIDTH + (N-1) * BAR_GAP <= usable
  //   => N <= (usable + BAR_GAP) / BAR_STEP
  const leaderBars = Math.max(BAR_MIN, Math.floor((usable + BAR_GAP) / BAR_STEP))

  for (const s of sources) {
    const ratio = s.visitors / maxVisitors
    const n = Math.max(BAR_MIN, Math.round(ratio * leaderBars))
    out.set(s.source, n)
  }
  return out
}

// ---- Row ----------------------------------------------------------------------
interface SourceRowProps {
  source: OverviewSource
  barCount: number
  color: string
  outlined?: boolean
  logo?: string
  label: string
}

function SourceRow({ source, barCount, color, outlined, logo, label }: SourceRowProps) {
  const FallbackIcon = fallbackIcon(source.source)
  const [isHovered, setIsHovered] = useState(false)
  return (
    <li
      className="group flex items-center gap-3 rounded-md bg-main px-3 py-2 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left: icon + label — can shrink so long labels truncate gracefully */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {logo ? (
          <Image
            src={logo}
            alt={label}
            width={16}
            height={16}
            className="rounded-sm shrink-0"
          />
        ) : (
          <FallbackIcon size={16} weight="regular" className="text-grey-darkest shrink-0" />
        )}
        <span className="truncate text-sm text-grey-darkest min-w-0">{label}</span>
      </div>

      {/* Right group: bars + count, pushed to the right edge. `shrink-0` so
          bars and number never get clipped — the label truncates first.
          Bars are bottom-aligned so the scaleY-on-hover animation grows
          upward without visibly shifting the baseline. */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-end justify-end shrink-0"
          style={{ gap: `${BAR_GAP}px` }}
          aria-hidden
        >
          {Array.from({ length: barCount }).map((_, i) => (
            <motion.span
              key={i}
              animate={{
                scaleY: isHovered ? 1.1 : 1,
                filter: isHovered ? 'brightness(0.9)' : 'brightness(1)',
              }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="block rounded-[2px]"
              style={{
                width: BAR_WIDTH,
                height: BAR_HEIGHT,
                backgroundColor: color,
                transformOrigin: 'bottom',
                border: outlined ? '1px solid #d1d5db' : undefined,
              }}
            />
          ))}
        </div>
        <span className="tabular-nums text-sm text-grey-darkest font-medium shrink-0 min-w-[2ch] text-right">
          {source.visitors.toLocaleString()}
        </span>
      </div>
    </li>
  )
}

export function OverviewSourcesPanel({ sources, loading, unavailable }: OverviewSourcesPanelProps) {
  // The ref lives on the <ul>; every row shares the same available bars width,
  // so one observer is enough. Rows are laid out as `[label] [bars] [count]`
  // with `[bars]` right-aligned — we subtract label + count widths by using the
  // list width (cheap approximation; good enough at these sizes).
  const [listRef, listWidth] = useElementWidth<HTMLUListElement>()

  // Conservative estimate of the space we keep for the label + count area on
  // each row. We measure the list, not the bars slot directly, to avoid a
  // feedback loop where bars width depends on bars count.
  const RESERVED_FOR_LABEL_AND_COUNT = 150 // px; approx. "google.com … 44"
  const barsSlotWidth = Math.max(0, listWidth - RESERVED_FOR_LABEL_AND_COUNT)

  const barCounts = useMemo(
    () => computeBarCounts(sources, barsSlotWidth),
    [sources, barsSlotWidth],
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 rounded-xl bg-main animate-pulse" />
        ))}
      </div>
    )
  }

  if (unavailable) {
    return (
      <p className="text-xs text-grey-light">
        Pick a traffic source in Settings to see sources.
      </p>
    )
  }

  if (!sources.length) {
    return <p className="text-xs text-grey-light">No sources recorded for this range.</p>
  }

  return (
    <ul ref={listRef} className="flex flex-col gap-1.5">
      {sources.map(s => {
        const style = sourceStyle(s.source, s.label)
        const barCount = barCounts.get(s.source) ?? BAR_MIN
        return (
          <SourceRow
            key={s.source}
            source={s}
            barCount={barCount}
            color={style.color}
            outlined={style.outlined}
            logo={style.logo}
            label={style.label}
          />
        )
      })}
    </ul>
  )
}
