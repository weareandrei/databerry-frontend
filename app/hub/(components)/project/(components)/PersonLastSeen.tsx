'use client'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface LastSeenParts {
  date: string
  time: string
}

/**
 * Split a last-seen timestamp into a date label (left) and a 24-h
 * time string (right). Date is "Today" / "Yesterday" when applicable,
 * otherwise "4 Jul" or "4 Jul 2025" when the year differs.
 */
export function formatLastSeenParts(iso: string): LastSeenParts | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null

  const now = new Date()
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000)

  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  let date: string
  if (dayDiff === 0) {
    date = 'Today'
  } else if (dayDiff === 1) {
    date = 'Yesterday'
  } else {
    const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
    date = d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`
  }

  return { date, time }
}

/** Date (subtle) · time (muted) — used in the People table last-seen column. */
export function PersonLastSeen({ iso }: { iso: string }) {
  const parts = formatLastSeenParts(iso)
  if (!parts) return <>—</>

  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
      <span className="text-subtle">{parts.date}</span>
      <span className="text-subtle" aria-hidden="true">
        ·
      </span>
      <span className="text-muted-foreground">{parts.time}</span>
    </span>
  )
}
