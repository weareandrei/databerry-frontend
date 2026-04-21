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
