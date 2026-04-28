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

export function differenceInDays(a: Date, b: Date): number {
  const msPerDay = 86400000
  return Math.round((a.getTime() - b.getTime()) / msPerDay)
}

export function parseISODate(s: string): Date {
  // Append `Z` so the date is parsed at UTC midnight. This makes
  // `parseISODate(toDateStr(d))` an identity for any UTC-midnight Date.
  return new Date(s + 'T00:00:00Z')
}

export type GlobalDateMode = 'daily' | 'weekly' | 'monthly'

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
