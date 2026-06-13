// All date helpers are UTC-anchored. The backend interprets every date
// string we send (`dateFrom` / `dateTo`) as a UTC calendar date — the
// HogQL queries do `toDate(timestamp) BETWEEN '<from>' AND '<to>'` (which
// ClickHouse parses as UTC), and `buildBuckets` builds 24 hourly UTC
// buckets via `setUTCHours`. The chart's x-axis labels (e.g. "12am",
// "1pm") are therefore UTC hours. Standardising the frontend on UTC
// keeps the picker's "Today" and the chart's "12am…11pm" in the same
// frame of reference, eliminating off-by-one-day failures for users
// far from UTC. (See the plan note: a previous bug had the picker emit
// local-date strings while the backend queried UTC, so users east of
// UTC saw an empty Today view in the early hours of their day.)

export function today(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// ────────────────────────────────────────────────────────────────────────────
// Timezone-aware variants. The legacy UTC helpers above stay for code paths
// that genuinely operate on UTC days (caching keys, certain formatting); the
// helpers below are what view-fetch hooks should call so dates align to the
// user's wall-clock day rather than UTC.
//
// Mirrors `backend/src/common/tz.ts`'s approach (Intl-based, no library).
// ────────────────────────────────────────────────────────────────────────────

interface ZonedFields {
  year: number
  month: number
  day: number
}

function fieldsInTz(date: Date, tz: string): ZonedFields {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(date)
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find(p => p.type === t)!.value, 10)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** "YYYY-MM-DD" of `date` as observed in `tz`. */
export function toDateStrInTz(date: Date, tz: string): string {
  const f = fieldsInTz(date, tz)
  return `${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`
}

/**
 * Returns a UTC `Date` such that `toDateStrInTz(date, tz)` equals the
 * user's *current* local date. The Date itself is at UTC midnight of that
 * local-day boundary's UTC instant — so subtracting a UTC day from it (for
 * "yesterday") works the same way the rest of the codebase expects.
 *
 * Example: at wall-clock 23:30 on Apr 30 in Bucharest (UTC+3), `today()`
 * returns the UTC instant 2026-04-30 00:00, but `todayInTz('Europe/Bucharest')`
 * returns an instant tagged Apr 30 from the user's perspective — the
 * downstream `toDateStrInTz` of that instant is `'2026-04-30'`.
 */
export function todayInTz(tz: string): Date {
  // We can't just `new Date()` and `setUTCHours(0)` — that gives UTC
  // midnight, which is "yesterday" for users west of UTC at the right
  // moment. Instead: read today's date *in tz*, then build the UTC
  // midnight of that wall-clock day. The resulting Date prints
  // identically to `today()` for UTC users.
  const now = new Date()
  const f = fieldsInTz(now, tz)
  return new Date(Date.UTC(f.year, f.month - 1, f.day, 0, 0, 0, 0))
}

/**
 * Tz-aware `periodBoundaries`. Caller usually passes
 * `todayInTz(tz)` as the anchor; we then format with `toDateStrInTz` so
 * monthly/weekly windows align to wall-clock month/week boundaries.
 *
 * The result strings are UTC `YYYY-MM-DD` (same shape as the legacy
 * function), which is what the backend expects — but they correspond to
 * *local* days for the user. The backend uses `localMidnightUtc` and the
 * HogQL `toDate(toTimeZone(...))` chain to evaluate them in the user's tz.
 */
export function periodBoundariesInTz(
  mode: GlobalDateMode,
  anchor: Date,
  _tz: string,
): { from: string; to: string } {
  // The anchor is already a UTC-midnight Date built from `todayInTz`, so
  // `toDateStr` (UTC) and `toDateStrInTz(anchor, tz)` produce the same
  // YYYY-MM-DD. We can therefore reuse the existing UTC math — week/month
  // boundary computations operate on day-of-week / day-of-month, which
  // are already in the local frame thanks to the anchor.
  return periodBoundaries(mode, anchor)
}

export function toDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateStr(a) === toDateStr(b)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}

export function formatDateLabel(d: Date): string {
  const t = today()
  if (isSameDay(d, t)) return 'Today'
  if (isSameDay(d, addDays(t, -1))) return 'Yesterday'
  // The toLocaleDateString call here is for the "long form" display; we
  // pass `timeZone: 'UTC'` so the formatted weekday/month/day match the
  // UTC calendar date the rest of the system is keyed on.
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function formatDateRange(start: Date, end: Date): string {
  const sm = start.getUTCMonth(), em = end.getUTCMonth()
  const sy = start.getUTCFullYear(), ey = end.getUTCFullYear()
  const sd = start.getUTCDate(), ed = end.getUTCDate()

  // Same day
  if (sy === ey && sm === em && sd === ed) {
    return `${MONTHS[sm]} ${sd}, ${sy}`
  }
  // Same month & year
  if (sy === ey && sm === em) {
    return `${MONTHS[sm]} ${sd} – ${ed}, ${sy}`
  }
  // Different month (possibly different year)
  if (sy === ey) {
    return `${MONTHS[sm]} ${sd} – ${MONTHS[em]} ${ed}, ${ey}`
  }
  return `${MONTHS[sm]} ${sd}, ${sy} – ${MONTHS[em]} ${ed}, ${ey}`
}

/**
 * Convenience wrapper around `formatDateRange` for callers that hold the
 * range as ISO date strings (`YYYY-MM-DD`) — the shape Redux globals carry.
 * Returns null when either side is missing or unparseable so the caller
 * can omit the caption cleanly without inline ternary noise.
 *
 * Lives here (next to `formatDateRange`) so the date-string parsing
 * convention stays in one place. Previously this was duplicated inline
 * inside `ViewCard` as part of the MRR caption, which forced the view
 * component to know about the Redux-globals date shape — directly
 * violating "low-level components don't reach into app-level state".
 */
export function formatIsoDateRange(
  fromIso: string | null | undefined,
  toIso: string | null | undefined,
): string | null {
  const from = isoDateToUtcDate(fromIso)
  const to = isoDateToUtcDate(toIso)
  return from && to ? formatDateRange(from, to) : null
}

function isoDateToUtcDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  // Anchor to midnight UTC so the resulting Date reflects the calendar
  // day the caller picked, not whatever the local-tz interpretation
  // would shift it to.
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function differenceInDays(a: Date, b: Date): number {
  const msPerDay = 86400000
  return Math.round((a.getTime() - b.getTime()) / msPerDay)
}

export function parseISODate(s: string): Date {
  // Append `Z` so the date is parsed at UTC midnight. This makes
  // `parseISODate(toDateStr(d))` an identity for any UTC-midnight Date.
  return new Date(s + 'T00:00:00Z')
}

// Canonical definition lives in `types/dates.ts` (`DateMode`); this
// alias keeps the long-standing import path working for the many
// existing consumers. New code should import `DateMode` directly.
export type { DateMode } from '@/types/dates'
export type GlobalDateMode = import('@/types/dates').DateMode

// Monday-based week helpers — all UTC.
export function startOfWeekMonday(d: Date): Date {
  const r = new Date(d)
  r.setUTCHours(0, 0, 0, 0)
  const day = r.getUTCDay() // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day
  r.setUTCDate(r.getUTCDate() + diffToMonday)
  return r
}

export function endOfWeekMonday(d: Date): Date {
  const start = startOfWeekMonday(d)
  return addDays(start, 6)
}

export function startOfMonth(d: Date): Date {
  // Date.UTC returns ms for the given UTC Y/M/D — Date(ms) constructor
  // interprets ms as absolute, so we land at UTC midnight of day 1.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

export function endOfMonth(d: Date): Date {
  // Day 0 of next month = last day of this month, in UTC.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  const targetMonth = r.getUTCMonth() + n
  // Snap to day 1 first to avoid month-overflow when the source date is
  // e.g. Jan 31 + 1 month (would otherwise become Mar 3 in UTC).
  r.setUTCDate(1)
  r.setUTCMonth(targetMonth)
  return r
}

export function periodBoundaries(mode: GlobalDateMode, anchor: Date): { from: string; to: string } {
  if (mode === 'daily') {
    const iso = toDateStr(anchor)
    return { from: iso, to: iso }
  }
  if (mode === 'weekly') {
    return {
      from: toDateStr(startOfWeekMonday(anchor)),
      to: toDateStr(endOfWeekMonday(anchor)),
    }
  }
  // monthly
  return {
    from: toDateStr(startOfMonth(anchor)),
    to: toDateStr(endOfMonth(anchor)),
  }
}

export function shiftPeriod(
  mode: GlobalDateMode,
  from: string,
  to: string,
  direction: 1 | -1
): { from: string; to: string } {
  const fromDate = parseISODate(from)
  if (mode === 'daily') {
    const next = addDays(fromDate, direction)
    const iso = toDateStr(next)
    return { from: iso, to: iso }
  }
  if (mode === 'weekly') {
    const nextAnchor = addDays(fromDate, direction * 7)
    return periodBoundaries('weekly', nextAnchor)
  }
  // monthly — shift to a date clearly inside the next/prev month then snap
  const nextAnchor = addMonths(fromDate, direction)
  return periodBoundaries('monthly', nextAnchor)
}

const MONTHS_SHORT = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function formatDailyLabel(iso: string): { main: string; year: string } {
  const d = parseISODate(iso)
  return {
    main: `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`,
    year: String(d.getUTCFullYear()),
  }
}

export function formatWeeklyLabel(from: string, to: string): { main: string; year: string } {
  const start = parseISODate(from)
  const end = parseISODate(to)
  const main = `${start.getUTCDate()} ${MONTHS_SHORT[start.getUTCMonth()]} → ${end.getUTCDate()} ${MONTHS_SHORT[end.getUTCMonth()]}`
  // Use end year — if the week spans a year boundary the end date sets the displayed year.
  return { main, year: String(end.getUTCFullYear()) }
}

export function formatMonthlyLabel(iso: string): { main: string; year: string } {
  const d = parseISODate(iso)
  return {
    main: MONTHS_LONG[d.getUTCMonth()],
    year: String(d.getUTCFullYear()),
  }
}
