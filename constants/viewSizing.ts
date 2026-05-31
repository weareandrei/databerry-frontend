/**
 * Per-view-type cell sizing rules for the project tile grid.
 *
 * ── Why this file exists ────────────────────────────────────────────────
 *
 * The project grid renders ~15 distinct view types side-by-side, each
 * with its own "natural width" in cells (a PostHog event-count value
 * is 1 cell; a funnel is 4; the project_overview chart is the whole
 * row). Without a single source of truth, every renderer was inlining
 * its own `col-span-X row-span-Y` classes — easy to drift, easy to
 * break the dense-pack layout when adding a new view type.
 *
 * One map. One helper. One place to change a view's footprint.
 *
 * ── Sizing convention ───────────────────────────────────────────────────
 *
 * `cols` is the count of CELLS the tile occupies on the largest
 * breakpoint we ship today (3xl = 1792 px → 6 cols total). Smaller
 * breakpoints downscale automatically via `cellSpanClasses` — a
 * 4-cell tile collapses to full-width on screens that only have 3
 * or fewer columns, since spanning more cols than the grid has
 * would either overflow or implicit-extend the grid.
 *
 * `rows` is the height in rows. Each grid row is 140 px tall (set by
 * `gridAutoRows: '140px'` on the container) plus 24 px gap, so:
 *   - 1 row  = 140 px (value tiles)
 *   - 2 rows = 304 px (charts, lists, funnels — uniform "tall tile"
 *              height; ~2× a value tile vertically, the sweet spot
 *              we landed on after the initial 3-row version made
 *              every multi-cell tile feel oversized)
 *
 * `cols: 'full'` is reserved for tiles that should ALWAYS occupy
 * the whole row regardless of viewport — currently only
 * project_overview, which is the "headline" view of the page
 * (rendered as a paired chart+sources block, see ProjectView).
 */

export type CellSpan = { cols: number | 'full'; rows: number }

/**
 * Canonical sizing per view type. Polymorphic types (those with both
 * 'value' and 'chart' display modes) declare their VALUE-mode size
 * here; `getViewSizing` promotes them to a wider span when the view
 * is configured as a chart.
 */
const VIEW_SIZING: Record<string, CellSpan> = {
  // ── Composite (connection-less) ──────────────────────────────────────
  //
  // `project_overview` is special — it's NOT actually rendered as a
  // single tile through this sizing map. ProjectView pairs it with
  // its sibling `project_overview_sources` view and emits both as
  // ONE full-row block with an internal split (chart left, sources
  // right). The entry below is the fallback footprint used when the
  // sources sibling is missing — chart-only, full width, 2 rows.
  project_overview:         { cols: 'full', rows: 2 },
  // Sources tile when STANDALONE (no chart sibling). When paired
  // with the chart, the chart-and-sources block renders together
  // via the special-case path in ProjectView.
  project_overview_sources: { cols: 2,      rows: 2 },
  // Standalone single-metric chart — matches the 2-cell footprint
  // we landed on for all "one metric over time" tiles (Gross
  // Volume, GA Users/Sessions/Pageviews chart, PostHog event
  // count chart). Keeps the grid visually coherent: charts at 2,
  // lists at 3, funnels at 3, retention at 4.
  custom_chart:             { cols: 2,      rows: 2 },

  // ── PostHog ──────────────────────────────────────────────────────────
  daily_counter:    { cols: 1, rows: 1 },   // value-mode default (chart → 3×2)
  // Funnel sits at 3 cells (same width as Top Customers / Gross
  // Volume / event-count charts) — visually grouped with the other
  // 3-cell visualisations rather than feeling oversized at 4. Each
  // funnel step renders as a wide horizontal segment with plenty
  // of room for the event-name label even at 3-cell width.
  posthog_funnel:   { cols: 3, rows: 2 },
  // Retention stays at 4 cells — its cohort-vs-period grid has
  // genuinely more columns to display (7 day-cohorts × 7 retention
  // periods = 49 cells in the default config), so it needs the
  // extra horizontal room to keep individual cells readable.
  posthog_retention: { cols: 4, rows: 2 },
  posthog_users:    { cols: 3, rows: 2 },

  // ── Google Analytics ─────────────────────────────────────────────────
  // All four polymorphic except `ga_active_users` (realtime only, no chart).
  ga_active_users:    { cols: 1, rows: 1 },
  ga_users_today:     { cols: 1, rows: 1 },
  ga_sessions_today:  { cols: 1, rows: 1 },
  ga_pageviews_today: { cols: 1, rows: 1 },

  // ── Stripe ───────────────────────────────────────────────────────────
  stripe_gross:         { cols: 1, rows: 1 },   // polymorphic — chart mode → 3×2
  stripe_mrr:           { cols: 1, rows: 1 },
  stripe_active_subs:   { cols: 1, rows: 1 },
  stripe_top_customers: { cols: 3, rows: 2 },
  stripe_churn_rate:    { cols: 1, rows: 1 },

  // ── Calendly ─────────────────────────────────────────────────────────
  calendly_meetings_today: { cols: 1, rows: 1 },
  calendly_meetings_list:  { cols: 3, rows: 2 },

  // ── Webhook ──────────────────────────────────────────────────────────
  webhook_gauge:  { cols: 1, rows: 1 },
  webhook_append: { cols: 3, rows: 2 },

  // ── Sentry ───────────────────────────────────────────────────────────
  sentry_issues_list: { cols: 3, rows: 2 },
}

/**
 * View types whose sizing depends on `config.displayMode`. When the
 * mode is 'chart' they get promoted to a 3×3 footprint; otherwise
 * they fall through to the value-mode default in `VIEW_SIZING`.
 *
 * Kept as a Set (not inlined) so adding a new polymorphic type is
 * one edit, not one-edit-per-call-site.
 */
const POLYMORPHIC_CHART_TYPES = new Set([
  'daily_counter',
  'ga_users_today',
  'ga_sessions_today',
  'ga_pageviews_today',
  'stripe_gross',
])

/**
 * Resolve the cell footprint for a view, honouring polymorphic
 * display-mode promotion. Unknown view types fall back to 1×1
 * (safer than overflowing if a future type is added without
 * updating this file).
 */
export function getViewSizing(
  viewType: string,
  displayMode?: string,
): CellSpan {
  // Polymorphic value-mode → chart-mode promotion. Chart-mode is
  // 2 cells wide (matching `custom_chart` and every other
  // single-metric over-time tile). Funnel/retention deliberately
  // sit bigger because they have denser visualisations; they're
  // not polymorphic so they don't pass through this branch.
  if (displayMode === 'chart' && POLYMORPHIC_CHART_TYPES.has(viewType)) {
    return { cols: 2, rows: 2 }
  }
  return VIEW_SIZING[viewType] ?? { cols: 1, rows: 1 }
}

// ────────────────────────────────────────────────────────────────────────
// Tailwind class mapping
// ────────────────────────────────────────────────────────────────────────
//
// CRITICAL: every class string the helper might return must appear
// LITERALLY somewhere Tailwind's content scanner can see. The strings
// below live in this file as literal values, so the scanner picks
// them up. Computing them via `${'col-span-' + n}` template
// concatenation would silently drop them from the generated CSS
// (Tailwind doesn't evaluate JS) — never do that for span classes.

const COL_SPAN_CLASSES: Record<number, string> = {
  // 1 col always fits regardless of grid total — no responsive
  // downscaling needed.
  1: 'col-span-1',
  // 2 cols needs at least 2 grid cols; below sm (1-col grid) the
  // tile takes the whole row.
  2: 'col-span-full sm:col-span-2',
  // 3 cols → need a 3-col grid (lg).
  3: 'col-span-full lg:col-span-3',
  // 4 cols → need a 4-col grid (xl).
  4: 'col-span-full xl:col-span-4',
  // 5 cols → need 5-col grid (2xl, MBP 16" lands here).
  5: 'col-span-full 2xl:col-span-5',
  // 6 cols → 3xl (1792px+); large external displays.
  6: 'col-span-full 3xl:col-span-6',
}

const ROW_SPAN_CLASSES: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
}

/**
 * Convert a `CellSpan` to the Tailwind classes that pin a grid
 * child to the right cell footprint. Drop the result on the
 * wrapper `<div>` around each rendered tile.
 */
export function cellSpanClasses(span: CellSpan): string {
  const rowClass = ROW_SPAN_CLASSES[span.rows] ?? 'row-span-1'
  if (span.cols === 'full') return `col-span-full ${rowClass}`
  const colClass = COL_SPAN_CLASSES[span.cols] ?? 'col-span-1'
  return `${colClass} ${rowClass}`
}

/**
 * Tailwind classes for the project tile grid CONTAINER. Centralised
 * alongside the sizing helpers so the breakpoint columns and the
 * per-tile span classes evolve together — if we ever bump the grid
 * to 7-col at a new breakpoint, the cell-mapping above gets the
 * matching entry in the same edit.
 *
 * Breakpoints:
 *   base (<640px)  → 1 col (mobile)
 *   sm   (≥640px)  → 2 cols (small tablet)
 *   lg   (≥1024px) → 3 cols (small laptop)
 *   xl   (≥1280px) → 4 cols (standard laptop, MBP 14")
 *   2xl  (≥1536px) → 5 cols (MBP 16", typical desktop)
 *   3xl  (≥1792px) → 6 cols (large external display)
 *
 * Past 6 cols we deliberately stop scaling — content max-width
 * (capped at the page level) lets the page padding grow on
 * gigantic monitors instead of producing 200-px-wide tiles that
 * crush their labels. Adding a 7-col breakpoint later would mean
 * also bumping `max-w-*` on the project body's outer container.
 */
// `grid-flow-dense` was dropped when drag-to-reorder shipped: dense
// packing auto-shuffles tiles to fill gaps, which would silently
// rearrange the manual order the user just dragged. Without it the
// user's sequence is respected literally — at the cost of occasional
// gaps when a wide tile follows a narrow one on a row that can't fit
// it. That trade-off is the right one for an explicitly-ordered grid;
// gaps are easier to explain than "I dropped it here but it moved."
export const PROJECT_GRID_CONTAINER_CLASS =
  'grid gap-y-6 gap-x-4 ' +
  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6'

/** Inline style for the grid container — explicit auto-row height
 *  so multi-row tiles (charts at row-span-3 = 420 px + 2× gap) get
 *  predictable heights regardless of content. Kept as a const so
 *  the grid container and `row-span-N` are interpretable as a pair
 *  without spelunking. */
export const PROJECT_GRID_AUTO_ROW_HEIGHT_PX = 140
