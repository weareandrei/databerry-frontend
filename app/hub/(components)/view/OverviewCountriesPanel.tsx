'use client'

/**
 * Countries tab panel — sibling of `OverviewSourcesPanel`. Same visual
 * shell (bar histogram + count + client-side pager), with the left
 * brand logo swapped for the country's flag.
 *
 * Flags come from `country-flag-icons/react/3x2/<CODE>` — one SVG
 * component per country. We star-import the whole module so any ISO-2
 * code coming back from the backend resolves without per-render
 * dynamic imports; tree-shaking still keeps unused codes out of the
 * bundle in production builds where the analyser can see the star
 * import is only ever indexed by string.
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CaretLeft, CaretRight, Globe } from '@phosphor-icons/react'
import * as Flags from 'country-flag-icons/react/3x2'
import type { OverviewCountry } from '@/lib/api'

interface OverviewCountriesPanelProps {
  countries: OverviewCountry[]
  loading?: boolean
  pageSize?: number
}

// Bar-geometry — same constants as the Sources panel so the two tabs
// share a visual rhythm. Keeping them in sync by copy is fine for now;
// extract to a shared module if a third panel adopts the pattern.
const BAR_WIDTH = 7
const BAR_GAP = 2
const BAR_HEIGHT = 18
const LEFT_BREATHING_RATIO = 0.15
const BAR_MIN = 1
const BAR_STEP = BAR_WIDTH + BAR_GAP

// Soft palette used to colour the bars. Stable per country code so a
// given country reads the same colour across renders, but not tied to
// any provider colour system (countries don't have brand colours).
// First few entries match Databerry's chart palette so the panel
// blends with the overview chart on the left.
const PALETTE = [
  '#FFA446',
  '#FF834D',
  '#FF4852',
  '#A56AF2',
  '#3D8BFD',
  '#10B981',
  '#F59E0B',
  '#06B6D4',
  '#EC4899',
  '#8B5CF6',
]

function colorForCountry(code: string, index: number): string {
  // Use the country code's first char for a stable-ish hash so the
  // colour assignment doesn't shift when the list re-sorts. The
  // index-based fallback ensures every row gets a colour even if two
  // codes hash to the same slot.
  void code
  return PALETTE[index % PALETTE.length]
}

function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(Math.round(entry.contentRect.width))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}

function computeBarCounts(
  countries: OverviewCountry[],
  rowWidth: number,
): Map<string, number> {
  const out = new Map<string, number>()
  if (rowWidth <= 0 || countries.length === 0) return out
  const max = countries.reduce((m, c) => Math.max(m, c.visitors), 0)
  if (max <= 0) return out
  const usable = Math.max(0, rowWidth * (1 - LEFT_BREATHING_RATIO))
  const leaderBars = Math.max(BAR_MIN, Math.floor((usable + BAR_GAP) / BAR_STEP))
  for (const c of countries) {
    const n = Math.max(BAR_MIN, Math.round((c.visitors / max) * leaderBars))
    out.set(c.countryCode, n)
  }
  return out
}

/**
 * Renders one country flag as a small rounded rectangle. Falls back
 * to a generic globe icon when `country-flag-icons` doesn't have an
 * entry for the code (most ISO-2 codes are covered, but PostHog
 * occasionally returns regional codes like 'XK' for Kosovo that
 * various flag libs disagree on).
 */
function CountryFlag({ code, name }: { code: string; name?: string }) {
  const FlagComp = (Flags as Record<string, React.ComponentType<{ title?: string; className?: string }>>)[
    code.toUpperCase()
  ]
  if (!FlagComp) {
    return (
      <Globe
        size={16}
        weight="regular"
        className="text-grey-darkest shrink-0"
        aria-label={name || code}
      />
    )
  }
  return (
    <FlagComp
      title={name || code}
      className="w-5 h-auto rounded-sm shrink-0 ring-1 ring-black/[0.06]"
    />
  )
}

interface CountryRowProps {
  country: OverviewCountry
  barCount: number
  color: string
}

function CountryRow({ country, barCount, color }: CountryRowProps) {
  const [isHovered, setIsHovered] = useState(false)
  const label = country.countryName || country.countryCode
  return (
    <li
      className="group flex items-center gap-3 rounded-md bg-main px-3 py-2 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <CountryFlag code={country.countryCode} name={country.countryName} />
        <span className="truncate text-sm text-grey-darkest min-w-0">{label}</span>
        <span className="text-[10px] text-grey-light tabular-nums shrink-0">
          {Math.round(country.share * 100)}%
        </span>
      </div>

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
              }}
            />
          ))}
        </div>
        <span className="tabular-nums text-sm text-grey-darkest font-medium shrink-0 min-w-[2ch] text-right">
          {country.visitors.toLocaleString()}
        </span>
      </div>
    </li>
  )
}

export function OverviewCountriesPanel({
  countries,
  loading,
  pageSize = 10,
}: OverviewCountriesPanelProps) {
  const [listRef, listWidth] = useElementWidth<HTMLUListElement>()
  const RESERVED_FOR_LABEL_AND_COUNT = 150
  const barsSlotWidth = Math.max(0, listWidth - RESERVED_FOR_LABEL_AND_COUNT)
  const barCounts = useMemo(
    () => computeBarCounts(countries, barsSlotWidth),
    [countries, barsSlotWidth],
  )

  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [countries])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 rounded-xl bg-main animate-pulse" />
        ))}
      </div>
    )
  }

  if (!countries.length) {
    return <p className="text-xs text-grey-light">No countries recorded for this range.</p>
  }

  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(countries.length / safePageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const pageStart = (currentPage - 1) * safePageSize
  const pageRows = countries.slice(pageStart, pageStart + safePageSize)
  const showPager = countries.length > safePageSize

  return (
    <div className="flex flex-col gap-2">
      <ul
        ref={listRef}
        className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-0.5"
      >
        {pageRows.map((c, i) => {
          const globalIndex = pageStart + i
          return (
            <CountryRow
              key={c.countryCode}
              country={c}
              barCount={barCounts.get(c.countryCode) ?? BAR_MIN}
              color={colorForCountry(c.countryCode, globalIndex)}
            />
          )
        })}
      </ul>

      {showPager && (
        <Pager
          page={currentPage}
          totalPages={totalPages}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        />
      )}
    </div>
  )
}

interface PagerProps {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

function Pager({ page, totalPages, onPrev, onNext }: PagerProps) {
  const atStart = page <= 1
  const atEnd = page >= totalPages
  return (
    <div className="flex items-center justify-end gap-2 pt-1 text-xs text-grey-darkest">
      <button
        type="button"
        onClick={onPrev}
        disabled={atStart}
        aria-label="Previous page"
        className="inline-flex size-6 items-center justify-center rounded-md border border-stroke bg-white text-grey-darkest transition-colors hover:bg-hover-fill disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
      >
        <CaretLeft size={11} weight="bold" />
      </button>
      <span className="tabular-nums select-none text-grey-dark">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        aria-label="Next page"
        className="inline-flex size-6 items-center justify-center rounded-md border border-stroke bg-white text-grey-darkest transition-colors hover:bg-hover-fill disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
      >
        <CaretRight size={11} weight="bold" />
      </button>
    </div>
  )
}
