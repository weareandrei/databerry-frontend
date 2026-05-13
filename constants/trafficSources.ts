/**
 * Mirrors backend/src/project-overview/source-normalization.ts.
 * Frontend uses this only to style / render segments when the backend supplies a key.
 *
 * Colours are restrained to fit the Kontext design system — muted greys with a
 * handful of controlled accent colours. The brand orange (#F46719) is reserved
 * for the Reddit source so the colour is re-used intentionally rather than
 * competing with primary UI chrome.
 */

export interface NormalizedSource {
  key: string
  label: string
  color: string
  /** True when the chip should be rendered with an outline because the fill colour is white. */
  outlined?: boolean
  /** Public path to a brand logo asset, when available. */
  logo?: string
}

// Restrained dashboard palette — Datafast/PostHog-style soft tones, not
// playground candy and not data-mortuary dark. Brand integrations keep
// their recognisable hues (Reddit's orange, ChatGPT's emerald, X's
// near-black wordmark grey) so a logo + bar combo reads as one thing.
// Generic sources (`direct`, `other`) use neutrals so they recede behind
// the named sources rather than competing.
export const SOURCE_STYLE: Record<string, NormalizedSource> = {
  direct:      { key: 'direct',      label: 'direct',      color: '#94a3b8' }, // slate-400 — neutral, recedes
  // 'organic' — generic search/SEO traffic. Backend's
  // source-normalization.ts doesn't emit this key today (real-mode
  // referrers normalize to 'google' / 'bing' / 'duckduckgo' / 'other'),
  // but the demo CSV uses 'organic' as a catch-all SEO bucket so we
  // give it a brand-aligned warm gold here. Adding the entry costs
  // nothing in production.
  organic:     { key: 'organic',     label: 'Organic',     color: '#F59E0B' }, // amber-500 — warm gold, distinct
  chatgpt:     { key: 'chatgpt',     label: 'ChatGPT',     color: '#10a37f', logo: '/logos/chatgpt.svg' }, // brand emerald
  google:      { key: 'google',      label: 'Google',      color: '#ffffff', outlined: true, logo: '/logos/google.svg' },
  x:           { key: 'x',           label: 'x.com',       color: '#1f2937', logo: '/logos/x.png' }, // X wordmark grey
  reddit:      { key: 'reddit',      label: 'Reddit',      color: '#F46719', logo: '/logos/reddit.svg' }, // brand orange
  // ProductHunt — `#DA552F` is PH's actual brand red-orange. Sits
  // close to our brand orange (`#F46719`) so it's still in the warm
  // family that keeps the dashboard cohesive, but darker / redder so
  // it reads as a distinct source from Reddit when the two are
  // rendered side-by-side in a stacked bar.
  producthunt: { key: 'producthunt', label: 'ProductHunt', color: '#DA552F' },
  youtube:     { key: 'youtube',     label: 'YouTube',     color: '#f43f5e' }, // rose-500
  facebook:    { key: 'facebook',    label: 'Facebook',    color: '#3b82f6' }, // blue-500
  linkedin:    { key: 'linkedin',    label: 'LinkedIn',    color: '#06b6d4' }, // cyan-500
  github:      { key: 'github',      label: 'GitHub',      color: '#8b5cf6' }, // violet-500
  hn:          { key: 'hn',          label: 'Hacker News', color: '#f97316' }, // orange-500
  bing:        { key: 'bing',        label: 'Bing',        color: '#14b8a6' }, // teal-500
  duckduckgo:  { key: 'duckduckgo',  label: 'DuckDuckGo',  color: '#f59e0b' }, // amber-500
  instagram:   { key: 'instagram',   label: 'Instagram',   color: '#ec4899' }, // pink-500
  tiktok:      { key: 'tiktok',      label: 'TikTok',      color: '#a855f7' }, // purple-500
  other:       { key: 'other',       label: 'other',       color: '#cbd5e1' }, // slate-300 — even quieter than direct
  total:       { key: 'total',       label: 'Total',       color: '#64748b' }, // slate-500
  revenue:     { key: 'revenue',     label: 'Revenue',     color: '#F46719' }, // brand orange
}

/**
 * Hash-based palette for sources we don't have a fixed style for (custom
 * domains like `tinylaunch.com`). Each unknown source-key or label maps
 * stably to one of these — so the same domain gets the same colour every
 * render — while different unknowns get different colours.
 *
 * Reference points for the palette: Plausible Analytics (single muted
 * indigo for everything), Datafast (warm soft pastels), PostHog (similar
 * pastels with more variety). The shared trait is **low saturation, soft
 * tones, friendly warmth** — never pure neon (childish) or 700-range
 * (grim). All sit in the 300/400 Tailwind range.
 *
 * Hues anchor on indigo (matches the Stripe-purple Stripe tile already in
 * the dashboard) plus complementary warms (peach, amber) that harmonise
 * with the brand orange. A few cool accents (mint, sky) round out the
 * set. None collide with `SOURCE_STYLE`'s 500-range brand colours, so a
 * custom domain never accidentally borrows a known integration's hue.
 */
const FALLBACK_PALETTE: ReadonlyArray<string> = [
  '#818cf8', // indigo-400  — soft lavender (anchor)
  '#fbbf24', // amber-400   — warm gold, complements brand orange
  '#22d3ee', // cyan-400    — fresh aqua
  '#fdba74', // orange-300  — soft peach
  '#a5b4fc', // indigo-300  — softer lavender (paired with anchor)
  '#86efac', // green-300   — soft mint
  '#f9a8d4', // pink-300    — soft pink
  '#7dd3fc', // sky-300     — soft sky
]

function pickFallbackColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return FALLBACK_PALETTE[Math.abs(h) % FALLBACK_PALETTE.length]!
}

// ─── Chart palette (project-overview stacked bar + sources panel) ──────────
//
// The overview chart (and its sibling sources panel) use a FIXED gradient
// palette rather than the per-source brand colours in `SOURCE_STYLE`. Two
// reasons:
//   1. The gradient (red → orange → yellow → grey) reads as "ranked
//      importance" — biggest source at the bottom in red, smallest at
//      the top in grey. That semantic doesn't translate from a
//      collection of brand colours (Google's white, X's near-black, etc.)
//      which would read as arbitrary noise.
//   2. The palette stays stable when sources rotate — adding a new
//      integration tomorrow doesn't reshuffle the chart's visual
//      identity, just slots the new source into its rank position.
//
// Reserved colours:
//   - Reddit  → `#FF4500` (Reddit's own brand orange — keeps reddit.com
//     recognisable in both chart + panel)
//   - direct, other → `#C6C6C6` (neutral grey — these are "no source"
//     buckets, they should recede behind the named sources)
//
// All other sources are ranked by total value and assigned colours from
// `RANKED_PALETTE` in order (biggest → first colour → bottom of stack).
// Sources beyond the palette length re-use the last colour (FFD239).
const CHART_RANKED_PALETTE: ReadonlyArray<string> = [
  '#FF4852', // 1st (biggest)  — deep coral red, bottom of stack
  '#FF834D', // 2nd            — warm orange
  '#FFA446', // 3rd            — lighter orange
  '#FFD239', // 4th (smallest) — yellow
]
const CHART_RESERVED: Record<string, string> = {
  reddit: '#FF4500', // Reddit's brand orange, always slot-2 from bottom
  direct: '#C6C6C6', // neutral grey, always at top
  other:  '#C6C6C6', // same grey — direct + other read as one quiet block
}

/**
 * Compute the chart's source-key colour assignment + render order.
 *
 * Pass each source's TOTAL value (sum across all buckets for the chart;
 * the panel's `visitors` field for the sources panel). The function:
 *   1. Pulls out reserved keys (reddit, direct, other) — they get fixed
 *      colours regardless of value.
 *   2. Sorts the rest by `totalValue` descending and assigns
 *      `CHART_RANKED_PALETTE` colours in order.
 *   3. Returns the keys in the order they should render BOTTOM-TO-TOP in
 *      a stacked bar: biggest non-reserved first, then reddit (if any),
 *      then 2nd biggest, 3rd, 4th, then direct/other at the top.
 *
 * Recharts respects the order of `<Bar>` children for stacking — the
 * first `<Bar>` is the bottom segment — so the returned `order` array
 * doubles as the iteration order at render time.
 */
export interface ChartSourceInput {
  key: string
  totalValue: number
}
export interface ChartSourcePalette {
  /** `key → color` lookup. */
  colorByKey: Record<string, string>
  /** Keys in BOTTOM-TO-TOP render order. The biggest non-reserved
   *  source is `order[0]`. Excludes any key in `mergedToOther`. */
  order: string[]
  /**
   * Non-reserved source keys that exceed the ranked-palette length
   * (4 slots). Callers must fold their per-row values into the
   * `'other'` data column before handing rows to recharts — that's
   * how the overflow surfaces visually (one quiet grey segment
   * lumped into existing "other"). The tooltip can then expand
   * `'other'` to list each merged source individually.
   *
   * Empty when the source count is ≤ palette length + reserved.
   */
  mergedToOther: string[]
}

export function assignChartColors(
  sources: ChartSourceInput[],
): ChartSourcePalette {
  const colorByKey: Record<string, string> = {}
  const ranked: ChartSourceInput[] = []
  const reddit: ChartSourceInput[] = []
  const directOther: ChartSourceInput[] = []

  for (const s of sources) {
    if (s.key === 'reddit') {
      colorByKey[s.key] = CHART_RESERVED.reddit
      reddit.push(s)
    } else if (s.key === 'direct' || s.key === 'other') {
      colorByKey[s.key] = CHART_RESERVED[s.key]
      directOther.push(s)
    } else {
      ranked.push(s)
    }
  }

  // Sort non-reserved by descending value. Stable enough: the secondary
  // sort by key keeps the order deterministic when two sources tie.
  ranked.sort((a, b) => {
    if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue
    return a.key.localeCompare(b.key)
  })

  // First N (= palette length) keep their own segment. Anything
  // beyond N is folded into "other" — caller does the merging at
  // the data-row level.
  const N = CHART_RANKED_PALETTE.length
  const kept = ranked.slice(0, N)
  const overflow = ranked.slice(N)
  const mergedToOther: string[] = overflow.map(o => o.key)

  for (let i = 0; i < kept.length; i++) {
    colorByKey[kept[i]!.key] = CHART_RANKED_PALETTE[i]!
  }

  // If there's overflow but the data didn't carry an `'other'`
  // bucket of its own, synthesise one — the merged segment still
  // needs a column to live in. Without this, callers would have
  // overflow with nowhere to render. The merged value flows in at
  // the row-build step.
  if (mergedToOther.length > 0 && !('other' in colorByKey)) {
    colorByKey.other = CHART_RESERVED.other
    directOther.push({ key: 'other', totalValue: 0 })
  }

  // Build bottom-to-top render order:
  //   biggest kept → reddit (if present) → rest of kept →
  //   direct/other.
  // direct + other order between each other follows whatever order
  // they appeared in `sources` (usually backend-defined); both end up
  // at the top so visually they're indistinguishable.
  const order: string[] = []
  if (kept.length > 0) order.push(kept[0]!.key)
  for (const r of reddit) order.push(r.key)
  for (let i = 1; i < kept.length; i++) order.push(kept[i]!.key)
  for (const dz of directOther) order.push(dz.key)

  return { colorByKey, order, mergedToOther }
}

/**
 * Resolve display style for a source.
 *
 * The backend's `normalizeSource` collapses unrecognised domains into
 * `key='other'` while keeping the original domain in `label` (e.g.
 * `key='other'`, `label='tinylaunch.com'`). The previous version of this
 * function returned `SOURCE_STYLE['other']` verbatim — clobbering the
 * domain label with the literal string `'other'`. That's why hovering
 * `tinylaunch.com` and the catch-all `Other` bar both showed "other"
 * in the tooltip — same label, different segments, indistinguishable.
 *
 * New behaviour:
 *   1. If caller provides a `fallbackLabel` AND it's more specific than
 *      what `SOURCE_STYLE` would return, use the caller's label and pick
 *      a stable per-label colour from the fallback palette. This applies
 *      to `key='other'` (the catch-all) where the backend always
 *      forwards the original domain — `tinylaunch.com` ends up with its
 *      own distinct colour AND the right label in the tooltip.
 *   2. Otherwise prefer the `SOURCE_STYLE` entry verbatim (known
 *      integrations like `google`, `x`, `chatgpt`).
 *   3. For keys completely outside `SOURCE_STYLE` (e.g. `'unset'`), fall
 *      back to the caller-supplied label (or the key itself), with a
 *      hash-picked colour.
 */
export function sourceStyle(
  key: string,
  fallbackLabel?: string,
  /**
   * Optional caller-supplied colour. When provided AND the source key
   * isn't in `SOURCE_STYLE` (i.e. we'd otherwise hash-pick a fallback),
   * we use this colour instead of the hash result.
   *
   * Production callers (OverviewChart / OverviewSourcesPanel) pass the
   * `color` field straight from each `bySource` entry — for known
   * integrations this is ignored (the table entry wins, preserving the
   * existing brand-controlled palette), so production rendering for
   * `direct` / `google` / `reddit` / etc. is unchanged. Unknown keys
   * (the demo's `organic`/`referral`/`social`, or backend's `unset`)
   * now honour the data's colour instead of a hash-picked pastel —
   * which is what lets the demo's brand-orange palette actually reach
   * the screen.
   */
  preferredColor?: string,
): NormalizedSource {
  // Special-case the 'other' catch-all FIRST. The backend collapses every
  // unrecognised domain into `key='other'` while keeping the original
  // domain in `label` (e.g. `key='other', label='tinylaunch.com'`). If we
  // returned `SOURCE_STYLE['other']` verbatim we'd clobber that domain
  // label with the generic literal `'other'` — which is the bug that made
  // tinylaunch.com and the literal "Other" bar both render as "other" in
  // the tooltip.
  //
  // For 'other' with a non-empty, non-"other" fallback label, treat as a
  // distinct unknown source: honour the label and pick a stable colour
  // from the fallback palette so different unknown domains look different.
  if (
    key === 'other' &&
    fallbackLabel &&
    fallbackLabel.trim() &&
    fallbackLabel.toLowerCase() !== 'other'
  ) {
    return {
      key,
      label: fallbackLabel,
      color: preferredColor ?? pickFallbackColor(fallbackLabel),
    }
  }

  // Known integrations (`google`, `x`, `chatgpt`, …) — trust the table
  // entry verbatim. Backend-supplied labels for these keys are usually
  // generic ("X", "Direct"); the table's label ("x.com", "direct") is
  // intentionally what we render.
  const known = SOURCE_STYLE[key]
  if (known) return known

  // Anything outside the table — e.g. `'unset'` (backend's label='Other'
  // for "(not set)" referrers) or the demo's custom keys. Use the
  // caller's label and prefer the caller's supplied colour over the
  // hash-picked fallback.
  return {
    key,
    label: fallbackLabel ?? key,
    color: preferredColor ?? pickFallbackColor(fallbackLabel ?? key),
  }
}
