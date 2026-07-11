/**
 * Demo time-series — fetches `public/demo/timeseries.csv`, parses each
 * row into a typed object, and exposes a small set of helpers the
 * `DemoContext` uses to derive view values for the user's currently-
 * selected date range.
 *
 * Why a real CSV file (vs a TS array)? The user explicitly asked for
 * CSV — they want to be able to crack open `public/demo/timeseries.csv`
 * and edit numbers without touching code. The trade-off is one fetch
 * round-trip on demo mount; we cache the parsed rows in a module-level
 * Promise so subsequent provider mounts (re-renders, route changes
 * within the demo) reuse the same in-flight or resolved data.
 *
 * Parser is hand-rolled (no `csv-parse` etc) — the file shape is
 * trivial: one comma-separated header row, every other row is numbers
 * (or one decimal `acme_conversion_pct`). Quoting / escaping is not
 * needed because the data we generate has none.
 */

/** Shape of one parsed CSV row — every numeric column except `date`. */
export interface DemoTimeSeriesRow {
  /** ISO `yyyy-mm-dd` (UTC). */
  date: string

  // ── Acme columns ─────────────────────────────────────────────────
  /** Stripe MRR in cents — instantaneous, take the latest in range. */
  acme_mrr_cents: number
  /** Gross volume in cents — additive across days. */
  acme_gross_cents: number
  /** PostHog `user_signed_up` count — additive. */
  acme_signups: number
  /** PostHog `payment_completed` count — additive. */
  acme_payments: number
  /** GA realtime "active right now" — instantaneous, take the latest. */
  acme_ga_active_now: number
  /** GA sessions — additive. */
  acme_ga_sessions: number
  /** Overview-chart visitors per source — all additive. Acme has a
   *  diverse traffic mix with organic search at the top, plus
   *  branded referrers (Reddit + X + ProductHunt) — same source
   *  keys the production `SOURCE_STYLE` table recognizes, so the
   *  brand colours flow through automatically. */
  acme_visitors_organic: number
  acme_visitors_direct: number
  acme_visitors_reddit: number
  acme_visitors_x: number
  acme_visitors_producthunt: number
  /** Conversion %, used as the overview chart's secondary metric. */
  acme_conversion_pct: number

  // ── Side Project columns ─────────────────────────────────────────
  side_pageviews: number
  side_gross_cents: number
  side_dashboard_events: number
  side_ga_users: number
  side_visitors_organic: number
  side_visitors_direct: number
  side_visitors_reddit: number
}

const NUMERIC_COLS: ReadonlyArray<keyof DemoTimeSeriesRow> = [
  'acme_mrr_cents',
  'acme_gross_cents',
  'acme_signups',
  'acme_payments',
  'acme_ga_active_now',
  'acme_ga_sessions',
  'acme_visitors_organic',
  'acme_visitors_direct',
  'acme_visitors_reddit',
  'acme_visitors_x',
  'acme_visitors_producthunt',
  'acme_conversion_pct',
  'side_pageviews',
  'side_gross_cents',
  'side_dashboard_events',
  'side_ga_users',
  'side_visitors_organic',
  'side_visitors_direct',
  'side_visitors_reddit',
]

/**
 * Parse the raw CSV text into typed rows. Header order is honoured —
 * we read the first line, map each header to a `DemoTimeSeriesRow`
 * field, and validate that every numeric column resolved to a number
 * (a malformed cell would otherwise propagate `NaN` into chart
 * aggregates).
 */
function parseCsv(text: string): DemoTimeSeriesRow[] {
  // Trim BOM / whitespace at the very start. The Node generator we
  // use produces clean output, but if a future maintainer edits the
  // CSV in Excel + saves it can land with a UTF-8 BOM.
  const cleaned = text.replace(/^﻿/, '').trim()
  const lines = cleaned.split('\n')
  if (lines.length < 2) return []

  const header = lines[0].split(',').map(s => s.trim())
  const rows: DemoTimeSeriesRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cells = line.split(',')

    // Build the row object dynamically — the header order is the
    // source of truth, so the CSV can be reordered without breaking
    // the parser as long as the column names stay the same.
    const row: Partial<DemoTimeSeriesRow> = {}
    for (let c = 0; c < header.length; c++) {
      const key = header[c] as keyof DemoTimeSeriesRow
      const raw = cells[c]
      if (key === 'date') {
        row.date = raw
        continue
      }
      const num = Number(raw)
      // Type-narrow: assigning a number to a numeric field is fine,
      // but the dynamic assignment via `row[key]` confuses TS. Cast
      // through `unknown` to communicate "I know this is right".
      ;(row as unknown as Record<string, number>)[key] = Number.isFinite(num) ? num : 0
    }
    rows.push(row as DemoTimeSeriesRow)
  }

  // Sort by date ascending so range queries can binary-search if we
  // ever add that optimisation. Linear scans are fine for ~90 rows.
  rows.sort((a, b) => a.date.localeCompare(b.date))
  return rows
}

// ─── Module-level cache so multiple provider mounts share one fetch ──

let cache: Promise<DemoTimeSeriesRow[]> | null = null

/**
 * Fetch + parse the demo CSV. Returns the same promise on subsequent
 * calls so we never re-fetch within a session. On error, logs and
 * returns an empty array — the demo degrades to "loading" empty
 * tiles rather than throwing.
 */
export function loadDemoTimeSeries(): Promise<DemoTimeSeriesRow[]> {
  if (cache) return cache
  cache = (async () => {
    try {
      const res = await fetch('/demo/timeseries.csv')
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn(`Demo CSV fetch failed: ${res.status}`)
        return []
      }
      const text = await res.text()
      return parseCsv(text)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Demo CSV load error:', err)
      return []
    }
  })()
  return cache
}

// ─── Aggregation helpers ──────────────────────────────────────────────

/** Inclusive on both ends. */
export function rowsInRange(
  rows: DemoTimeSeriesRow[],
  fromIso: string,
  toIso: string,
): DemoTimeSeriesRow[] {
  return rows.filter(r => r.date >= fromIso && r.date <= toIso)
}

/** Sum a numeric column across the range. */
export function sumColumn(
  rows: DemoTimeSeriesRow[],
  fromIso: string,
  toIso: string,
  col: keyof DemoTimeSeriesRow,
): number {
  let total = 0
  for (const r of rows) {
    if (r.date < fromIso || r.date > toIso) continue
    const v = r[col]
    if (typeof v === 'number') total += v
  }
  return total
}

/** Latest (= most recent date) value of a column inside the range. */
export function lastColumn(
  rows: DemoTimeSeriesRow[],
  fromIso: string,
  toIso: string,
  col: keyof DemoTimeSeriesRow,
): number {
  // Rows are already date-sorted ascending; walk from the end.
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]
    if (r.date < fromIso || r.date > toIso) continue
    const v = r[col]
    if (typeof v === 'number') return v
  }
  return 0
}

/** Average of a column across the range — used for `conversion_pct`. */
export function avgColumn(
  rows: DemoTimeSeriesRow[],
  fromIso: string,
  toIso: string,
  col: keyof DemoTimeSeriesRow,
): number {
  let total = 0
  let count = 0
  for (const r of rows) {
    if (r.date < fromIso || r.date > toIso) continue
    const v = r[col]
    if (typeof v === 'number') {
      total += v
      count++
    }
  }
  return count > 0 ? total / count : 0
}

// ─── Bucketing helpers ────────────────────────────────────────────────
//
// The demo's date pill can emit any range from 1 day to ~90 days. Naively
// rendering one bar per day produces a forest of ~30 bars labelled
// "Mar Mar Mar Apr Apr…" — recharts' x-axis can't fit them all and the
// month abbreviations bunch together. Solution: auto-pick the bucket
// granularity from the range size, so a 7-day range gets daily bars
// labelled "Mon"/"Tue"/…, a 30-day range gets weekly bars labelled by
// the Monday of each week ("Mar 2"/"Mar 9"/…), and 3 months gets
// monthly bars labelled "Jan"/"Feb"/"Mar".

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function toUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtcDate(toIso).getTime() - toUtcDate(fromIso).getTime()) / 86400000)
}

export type BucketGranularity = 'day' | 'week' | 'month'

/**
 * Pick a bucket size that keeps the chart readable for the given
 * range. Thresholds: ≤14 days → daily (≤14 bars), ≤90 days →
 * weekly (≤13 bars), more than 90 days → monthly. Tuned so a
 * "last 30 days" range never shows more than 5 bars and a
 * "last 7 days" still feels granular.
 */
export function chooseGranularity(fromIso: string, toIso: string): BucketGranularity {
  const days = daysBetween(fromIso, toIso) + 1
  if (days <= 14) return 'day'
  if (days <= 90) return 'week'
  return 'month'
}

/**
 * Bucket key — a string that's unique per bucket so multiple days
 * inside the same bucket collapse into one. Daily buckets key off
 * the date itself; weekly buckets key off the Monday of the week;
 * monthly buckets key off `YYYY-MM`. Sortable as plain strings.
 */
function bucketKeyFor(iso: string, granularity: BucketGranularity): string {
  if (granularity === 'day') return iso
  if (granularity === 'month') return iso.slice(0, 7) // 'YYYY-MM'
  // 'week' — Monday of this week (UTC).
  const d = toUtcDate(iso)
  const dow = d.getUTCDay() // 0 = Sun
  // Monday-anchored: 0 if Mon, 6 if Sun.
  const daysFromMonday = (dow + 6) % 7
  const monday = new Date(d.getTime() - daysFromMonday * 86400000)
  return monday.toISOString().slice(0, 10)
}

function bucketLabelFor(
  key: string,
  granularity: BucketGranularity,
  rangeDays: number,
): string {
  if (granularity === 'month') {
    // key is `YYYY-MM` — extract month index.
    const monthIndex = parseInt(key.slice(5, 7), 10) - 1
    return MONTH_SHORT[monthIndex]
  }
  if (granularity === 'week') {
    // key is the Monday's date (`YYYY-MM-DD`); render as "Mar 2".
    const d = toUtcDate(key)
    return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`
  }
  // 'day' — for short ranges (≤7 days) the day-of-week label
  // ("Mon"/"Tue"/…) is most readable. For 8–14 day ranges it
  // repeats every 7 days, so we switch to a date label there too.
  const d = toUtcDate(key)
  if (rangeDays <= 7) return DOW_LABELS[d.getUTCDay()]
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export interface BucketGroup {
  /** Stable, sortable bucket id (date or `YYYY-MM`). */
  key: string
  /** Pre-computed display label. */
  label: string
  /** Rows that fall inside this bucket. */
  rows: DemoTimeSeriesRow[]
}

/**
 * Group rows in `[fromIso, toIso]` into buckets at the auto-chosen
 * granularity. Ordered chronologically. Reused by both the simple
 * chart-points helpers (Stripe gross volume) and the richer
 * overview-chart builder (per-source aggregates).
 */
export function groupRowsByGranularity(
  rows: DemoTimeSeriesRow[],
  fromIso: string,
  toIso: string,
): { groups: BucketGroup[]; granularity: BucketGranularity } {
  const inRange = rowsInRange(rows, fromIso, toIso)
  const granularity = chooseGranularity(fromIso, toIso)
  const rangeDays = daysBetween(fromIso, toIso) + 1

  const map = new Map<string, DemoTimeSeriesRow[]>()
  for (const r of inRange) {
    const key = bucketKeyFor(r.date, granularity)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }

  const groups: BucketGroup[] = Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, rs]) => ({
      key,
      label: bucketLabelFor(key, granularity, rangeDays),
      rows: rs,
    }))

  return { groups, granularity }
}

/**
 * Chart points for a numeric column inside `[fromIso, toIso]`. Each
 * point's value is the SUM of the bucket's rows for the column —
 * suitable for additive metrics (gross volume, sessions, signups).
 * For instantaneous metrics (MRR, GA-active-now) callers should use
 * `lastColumn` instead, not this helper.
 *
 * Bucket size is auto-picked from the range so 7-day windows render
 * 7 bars and 30-day windows render ~5 weekly bars instead of 30
 * crammed daily bars.
 */
export function chartPoints(
  rows: DemoTimeSeriesRow[],
  fromIso: string,
  toIso: string,
  col: keyof DemoTimeSeriesRow,
): { label: string; value: number }[] {
  const { groups } = groupRowsByGranularity(rows, fromIso, toIso)
  return groups.map(g => ({
    label: g.label,
    value: g.rows.reduce(
      (s, r) => s + (typeof r[col] === 'number' ? (r[col] as number) : 0),
      0,
    ),
  }))
}
