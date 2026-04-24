export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateStr(a) === toDateStr(b)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function formatDateLabel(d: Date): string {
  const today = new Date()
  if (isSameDay(d, today)) return 'Today'
  if (isSameDay(d, addDays(today, -1))) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function formatDateRange(start: Date, end: Date): string {
  const sm = start.getMonth(), em = end.getMonth()
  const sy = start.getFullYear(), ey = end.getFullYear()
  const sd = start.getDate(), ed = end.getDate()

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
  return new Date(s + 'T00:00:00')
}

export type GlobalDateMode = 'daily' | 'weekly' | 'monthly'

// Monday-based week helpers
export function startOfWeekMonday(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const day = r.getDay() // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day
  r.setDate(r.getDate() + diffToMonday)
  return r
}

export function endOfWeekMonday(d: Date): Date {
  const start = startOfWeekMonday(d)
  return addDays(start, 6)
}

export function startOfMonth(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), 1)
  r.setHours(0, 0, 0, 0)
  return r
}

export function endOfMonth(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  r.setHours(0, 0, 0, 0)
  return r
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  const targetMonth = r.getMonth() + n
  r.setDate(1)
  r.setMonth(targetMonth)
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
    main: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`,
    year: String(d.getFullYear()),
  }
}

export function formatWeeklyLabel(from: string, to: string): { main: string; year: string } {
  const start = parseISODate(from)
  const end = parseISODate(to)
  const main = `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} → ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`
  // Use end year — if the week spans a year boundary the end date sets the displayed year.
  return { main, year: String(end.getFullYear()) }
}

export function formatMonthlyLabel(iso: string): { main: string; year: string } {
  const d = parseISODate(iso)
  return {
    main: MONTHS_LONG[d.getMonth()],
    year: String(d.getFullYear()),
  }
}

