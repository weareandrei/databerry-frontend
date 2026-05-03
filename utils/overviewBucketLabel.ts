/**
 * Mirrors the backend's bucket label formatters so the frontend can resolve
 * "now" to the same string the backend uses on the chart's categorical
 * x-axis. Keeping these in sync (daily=fmtHourLabel, weekly=DAY_LABELS,
 * monthly=`${MONTH_LABELS} ${date}`) is a soft contract — if the backend
 * changes its formatter, this file must change too.
 *
 * Timezone: the chart now renders in the *viewer's* local timezone — the
 * frontend sends `tz=Intl....resolvedOptions().timeZone` to
 * `/project-overview/chart`, the backend buckets/labels in that tz, and
 * here we read "now" via the local-time `getHours/getDay/getMonth/getDate`
 * getters so the orange "Now" line lands on the bucket the user expects.
 *
 * Source of truth lives at:
 *   backend/src/project-overview/project-overview.service.ts (fmtHourLabel,
 *   DAY_LABELS, MONTH_LABELS, buildBuckets)
 */

export type OverviewMode = 'daily' | 'weekly' | 'monthly'

function fmtHourLabel(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}${suffix}`
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Returns the x-axis label for the bucket that contains "right now" in the
 * currently-viewed range, or `null` if "now" is outside [dateFrom, dateTo].
 *
 * `dateFrom`/`dateTo` are expected in `YYYY-MM-DD` form (backend convention,
 * UTC-anchored). The in-range check stays UTC-anchored: "now" falls inside
 * today's UTC window for any reasonable user, so the comparison is sound.
 *
 * The label itself is built from local-time getters so it matches the
 * backend's tz-aware bucket labels (see file docstring).
 */
export function bucketLabelForNow(
  mode: OverviewMode,
  dateFrom: string,
  dateTo: string,
): string | null {
  const now = new Date()
  const fromUtc = Date.parse(`${dateFrom}T00:00:00Z`)
  // dateTo is inclusive; the window ends at the end of dateTo (exclusive at +1 day).
  const toUtc = Date.parse(`${dateTo}T00:00:00Z`) + 24 * 60 * 60 * 1000
  if (Number.isNaN(fromUtc) || Number.isNaN(toUtc)) return null

  const nowMs = now.getTime()
  if (nowMs < fromUtc || nowMs >= toUtc) return null

  if (mode === 'daily') return fmtHourLabel(now.getHours())
  if (mode === 'weekly') return DAY_LABELS[now.getDay()]
  return `${MONTH_LABELS[now.getMonth()]} ${now.getDate()}`
}
