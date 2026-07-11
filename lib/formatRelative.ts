/** Human-readable relative time — "2 min ago", "3 hours ago", … */
export function formatRelativeAgo(iso: string): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return iso

  const deltaSec = Math.max(0, (Date.now() - ms) / 1000)
  if (deltaSec < 60) return 'just now'
  if (deltaSec < 3600) {
    const mins = Math.round(deltaSec / 60)
    return `${mins} min ago`
  }
  if (deltaSec < 86400) {
    const hours = Math.round(deltaSec / 3600)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  const days = Math.round(deltaSec / 86400)
  return days === 1 ? '1 day ago' : `${days} days ago`
}
