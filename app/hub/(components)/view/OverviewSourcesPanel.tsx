'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CaretLeft,
  CaretRight,
  FacebookLogo,
  GithubLogo,
  Globe,
  InstagramLogo,
  LinkedinLogo,
  LinkSimple,
  NewspaperClipping,
  Question,
  TiktokLogo,
  YoutubeLogo,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import type { OverviewSource } from '@/lib/api'
import { assignChartColors, sourceStyle } from '@/constants/trafficSources'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Sentinel key for the "Other" bucket — set by `source-normalization.ts` on
// "(not set)" / "Not set" / "not_set" referrer values. Centralised here so
// the panel can detect the row and attach the help tooltip without
// hardcoding the magic string in two places.
const OTHER_SOURCE_KEY = 'unset'

const OTHER_TOOLTIP =
  "Visits where we couldn't tell where the visitor came from — usually " +
  "because the link was clicked from a private browser, an app, or another " +
  "place that doesn't share that information."

interface OverviewSourcesPanelProps {
  sources: OverviewSource[]
  loading?: boolean
  unavailable?: boolean
  /**
   * Number of source rows per page. Defaults to 10. Backend always sends a
   * generous batch (up to 100); pagination here is purely client-side so
   * flipping pages is instant. When `sources.length <= pageSize`, no pager
   * is rendered.
   */
  pageSize?: number
  /**
   * Fires when the user hovers (or un-hovers) a source row — receives
   * the source key, or `null` on leave. Used by the composite parent
   * (project_overview pair) to drive the cross-component chart
   * highlight: the chart's `externalHoveredSourceKey` prop reads from
   * the same state this writes to. Optional — when omitted, hover is
   * just a local visual state on the row.
   */
  onSourceHover?: (sourceKey: string | null) => void
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
  /**
   * Optional explanatory tooltip — rendered as a `?` icon after the label
   * with on-hover content. Used today for the "Other" row to explain that
   * those are visits whose source couldn't be identified.
   */
  tooltip?: string
  /**
   * Fires when the row enters/leaves hover. Used by the parent
   * composite to drive the cross-component chart highlight (passing
   * the active source key into `<OverviewChart>`'s
   * `externalHoveredSourceKey` prop). Null on leave.
   */
  onHoverChange?: (sourceKey: string | null) => void
}

function SourceRow({ source, barCount, color, outlined, logo, label, tooltip, onHoverChange }: SourceRowProps) {
  const FallbackIcon = fallbackIcon(source.source)
  const [isHovered, setIsHovered] = useState(false)
  return (
    <li
      className="group flex items-center gap-3 rounded-md bg-main px-3 py-2 overflow-hidden"
      onMouseEnter={() => {
        setIsHovered(true)
        onHoverChange?.(source.source)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        onHoverChange?.(null)
      }}
    >
      {/* Left: icon + label — can shrink so long labels truncate gracefully.
          The optional `?` help icon sits flush next to the label so the
          tooltip target is visually anchored to "Other" rather than
          floating elsewhere on the row. */}
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
        {tooltip && (
          <TooltipProvider delay={150}>
            <Tooltip>
              <TooltipTrigger
                // `cursor-default` so the cursor doesn't suggest the icon
                // is clickable — it's a passive hover affordance.
                className="shrink-0 cursor-default rounded-full p-0.5 text-grey-light hover:text-grey-dark transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30"
                aria-label="What does this mean?"
              >
                <Question size={12} weight="bold" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64">
                <p className="text-xs leading-snug">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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

export function OverviewSourcesPanel({
  sources,
  loading,
  unavailable,
  pageSize = 10,
  onSourceHover,
}: OverviewSourcesPanelProps) {
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

  // Bar counts are scaled relative to the *global* leader across every page —
  // not the page-local leader. Otherwise page 2's #1 row would visually match
  // page 1's #1 row, falsely suggesting equal traffic. Computing once over
  // `sources` and looking up by `source` key during render keeps the visual
  // hierarchy consistent as the user pages.
  const barCounts = useMemo(
    () => computeBarCounts(sources, barsSlotWidth),
    [sources, barsSlotWidth],
  )

  // Chart-palette colour assignment — same helper the overview bar
  // chart uses, fed the same per-source totals (`visitors` here, sum-
  // across-buckets there). Computing once over the full `sources` set
  // gives every row a stable colour that matches its segment in the
  // chart on the left: google.com is red in both, reddit is brand
  // orange in both, direct/other are grey in both. `mergedSet`
  // captures the long-tail sources that the chart folds into "other"
  // — the panel still lists them individually (rows are cheap), but
  // they render in the same grey as the merged "other" segment in
  // the chart so the user can see why those sources got absorbed.
  const palette = useMemo(
    () =>
      assignChartColors(
        sources.map(s => ({ key: s.source, totalValue: s.visitors })),
      ),
    [sources],
  )
  const mergedSet = useMemo(
    () => new Set(palette.mergedToOther),
    [palette.mergedToOther],
  )

  // Pagination state. Reset to page 1 whenever `sources` changes (date-range
  // refetch, refresh tick) so the user never lands on an empty page after
  // the dataset shrinks. Identity comparison via the array reference is fine
  // because `ViewCardOverviewSources` always replaces it on a new fetch.
  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [sources])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-black/[0.04] animate-pulse" />
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

  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(sources.length / safePageSize))
  // Clamp `page` defensively. State *should* track `sources` via the effect
  // above, but a parent that mutates the array in place (rather than
  // replacing the reference) could leave us with a stale page index — clamp
  // here so the slice never returns an empty array on a non-empty list.
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const pageStart = (currentPage - 1) * safePageSize
  const pageRows = sources.slice(pageStart, pageStart + safePageSize)
  const showPager = sources.length > safePageSize

  return (
    <div className="flex flex-col gap-2">
      {/* `max-h-[360px] + overflow-y-auto` is a safety net: when paging is
          active each page is small (≤ pageSize rows), but if the parent
          opts for a large `pageSize` (e.g. 25) the list scrolls inside the
          card rather than expanding the card vertically. */}
      <ul
        ref={listRef}
        className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-0.5"
      >
        {pageRows.map(s => {
          // Label / logo / outlined come from `sourceStyle` (the
          // SOURCE_STYLE table still owns those — we kept the brand
          // metadata even though we no longer use its colours). The
          // bar colour comes from the ranked chart palette computed
          // above so the row matches its segment in the chart.
          const style = sourceStyle(s.source, s.label, s.color)
          // Overflow sources (5+ non-reserved) didn't earn a slot in
          // the ranked palette — render them grey so the panel row
          // matches the chart's merged "other" segment that absorbs
          // their value. Fallback to `style.color` only for sources
          // outside the palette logic entirely (shouldn't happen in
          // practice; defensive).
          const color =
            palette.colorByKey[s.source] ??
            (mergedSet.has(s.source) ? '#C6C6C6' : style.color)
          const barCount = barCounts.get(s.source) ?? BAR_MIN
          // Only the "Other" bucket gets a help tooltip — other rows are
          // self-explanatory (a domain or a recognised brand). Detected
          // via the backend's `unset` key, set by the source-normalisation
          // rule that catches "(not set)" / "Not set" / "not_set" sources.
          const tooltip = s.source === OTHER_SOURCE_KEY ? OTHER_TOOLTIP : undefined
          return (
            <SourceRow
              key={s.source}
              source={s}
              barCount={barCount}
              color={color}
              outlined={style.outlined}
              logo={style.logo}
              label={style.label}
              tooltip={tooltip}
              onHoverChange={onSourceHover}
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

// ---- Pager --------------------------------------------------------------------

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
