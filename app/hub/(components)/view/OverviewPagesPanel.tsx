'use client'

/**
 * Pages tab panel — third sibling of `OverviewSourcesPanel` /
 * `OverviewCountriesPanel`. Same visual shell (bar histogram +
 * count + client-side pager), with the row identity being a URL
 * path ("/hub/onboarding") instead of a brand or a flag.
 *
 * The headline number per row is PAGEVIEWS (how many pages were
 * viewed, regardless of who — the product's definition), with the
 * unique-visitor count tucked into the row's hover title. Keeping
 * one number per row preserves the scannable rhythm the other two
 * tabs established.
 */

import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CaretLeft, CaretRight, FileText } from '@phosphor-icons/react'
import type { OverviewPage } from '@/lib/api'

interface OverviewPagesPanelProps {
  pages: OverviewPage[]
  loading?: boolean
  pageSize?: number
}

// Bar-geometry — same constants as the Sources/Countries panels so
// the three tabs share a visual rhythm.
const BAR_WIDTH = 7
const BAR_GAP = 2
const BAR_HEIGHT = 18
const LEFT_BREATHING_RATIO = 0.15
const BAR_MIN = 1
const BAR_STEP = BAR_WIDTH + BAR_GAP

// Same palette as the Countries panel — paths have no brand colours,
// so a stable index-based assignment keeps rows distinguishable while
// blending with the overview chart on the left.
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

function computeBarCounts(pages: OverviewPage[], rowWidth: number): Map<string, number> {
  const out = new Map<string, number>()
  if (rowWidth <= 0 || pages.length === 0) return out
  const max = pages.reduce((m, p) => Math.max(m, p.pageviews), 0)
  if (max <= 0) return out
  const usable = Math.max(0, rowWidth * (1 - LEFT_BREATHING_RATIO))
  const leaderBars = Math.max(BAR_MIN, Math.floor((usable + BAR_GAP) / BAR_STEP))
  for (const p of pages) {
    const n = Math.max(BAR_MIN, Math.round((p.pageviews / max) * leaderBars))
    out.set(p.path, n)
  }
  return out
}

function PageRow({
  page,
  barCount,
  color,
}: {
  page: OverviewPage
  barCount: number
  color: string
}) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <li
      className="group flex items-center gap-3 rounded-md bg-main px-3 py-2 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${page.pageviews.toLocaleString()} pageviews · ${page.visitors.toLocaleString()} unique ${page.visitors === 1 ? 'visitor' : 'visitors'}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText size={14} weight="bold" className="text-grey-light shrink-0" />
        <span className="truncate text-sm text-grey-darkest min-w-0 font-mono text-[12px]">
          {page.path}
        </span>
        <span className="text-[10px] text-grey-light tabular-nums shrink-0">
          {Math.round(page.share * 100)}%
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
          {page.pageviews.toLocaleString()}
        </span>
      </div>
    </li>
  )
}

export function OverviewPagesPanel({
  pages,
  loading,
  pageSize = 10,
}: OverviewPagesPanelProps) {
  const [listRef, listWidth] = useElementWidth<HTMLUListElement>()
  const RESERVED_FOR_LABEL_AND_COUNT = 150
  const barsSlotWidth = Math.max(0, listWidth - RESERVED_FOR_LABEL_AND_COUNT)
  const barCounts = useMemo(
    () => computeBarCounts(pages, barsSlotWidth),
    [pages, barsSlotWidth],
  )

  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [pages])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-black/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!pages.length) {
    return <p className="text-xs text-grey-light">No pageviews recorded for this range.</p>
  }

  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(pages.length / safePageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const pageStart = (currentPage - 1) * safePageSize
  const pageRows = pages.slice(pageStart, pageStart + safePageSize)
  const showPager = pages.length > safePageSize

  return (
    <div className="flex flex-col gap-2">
      <ul
        ref={listRef}
        className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-0.5"
      >
        {pageRows.map((p, i) => {
          const globalIndex = pageStart + i
          return (
            <PageRow
              key={p.path}
              page={p}
              barCount={barCounts.get(p.path) ?? BAR_MIN}
              color={PALETTE[globalIndex % PALETTE.length]}
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

function Pager({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  const atStart = page <= 1
  const atEnd = page >= totalPages
  return (
    <div className="flex items-center justify-end gap-2 pt-1 text-xs text-grey-darkest">
      <button
        type="button"
        onClick={onPrev}
        disabled={atStart}
        aria-label="Previous page"
        className="inline-flex size-6 items-center justify-center rounded-md border border-stroke bg-white text-grey-darkest transition-colors hover:bg-hover-fill disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
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
        className="inline-flex size-6 items-center justify-center rounded-md border border-stroke bg-white text-grey-darkest transition-colors hover:bg-hover-fill disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
      >
        <CaretRight size={11} weight="bold" />
      </button>
    </div>
  )
}
