export function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// View types whose backend `value` is a cents-string ("12345" → "$123.45").
// Add new currency tiles here (see also `MONEY_TYPES` in chart components).
//
// `stripe_gross` is now polymorphic on `config.displayMode`: chart mode is
// rendered by `<ChartWidget>` (its own formatter), value mode flows through
// here. Including it in MONEY_TYPES is safe — chart mode never hits this
// path because chart cards don't use `formatViewValue`.
const MONEY_TYPES = [
  'daily_revenue',
  'stripe_gross_today',
  'stripe_gross_week',
  'stripe_gross',
  'stripe_mrr',
]

// View types whose value is already a percent string ("4.2" → "4.2%").
// Backend formats the decimal precision; we just append the symbol so the
// number stays right-aligned with other numeric tiles.
const PERCENT_TYPES = ['stripe_churn_rate']

export function formatViewValue(value: string | null, type: string): string {
  if (value == null) return '—'
  if (MONEY_TYPES.includes(type)) return formatCents(parseInt(value, 10))
  if (PERCENT_TYPES.includes(type)) return `${value}%`
  return Number(value).toLocaleString()
}

/**
 * Predicate exported for chart components — they need to switch
 * between currency formatting (Stripe) and integer counts
 * (PostHog event counters, GA users/sessions/pageviews) without
 * having to round-trip through `formatViewValue` (which expects
 * a string and returns a string with the unit baked in).
 */
export function isMoneyViewType(type: string): boolean {
  return MONEY_TYPES.includes(type)
}

/**
 * Number-as-cents formatted as a USD amount (Stripe), or as a
 * locale-aware integer (everyone else). Used by chart cards for
 * the "total" header value AND for tooltip values, both of which
 * receive a `number` (already summed from per-bucket points).
 *
 * For non-money views, fractional values are floored to integers
 * — bucket counts are inherently whole numbers, but the chart
 * total is a sum which TypeScript keeps as `number` for type
 * consistency with the cents path.
 */
export function formatChartValue(value: number, type: string): string {
  if (isMoneyViewType(type)) return formatCents(value)
  return Math.round(value).toLocaleString()
}

/**
 * Compact axis-tick formatter — designed to fit inside narrow
 * Y-axis gutters. Money types render `$` prefixes; counts use
 * a "k"/"M" abbreviation past a thousand so a 12,000-event tile
 * doesn't blow out the gutter as "12,000".
 */
export function formatChartAxisTick(v: number, type: string): string {
  if (isMoneyViewType(type)) {
    if (v === 0) return '$0'
    const dollars = v / 100
    if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
    if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars >= 10_000 ? 0 : 1)}k`
    return `$${Math.round(dollars)}`
  }
  if (v === 0) return '0'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`
  return String(Math.round(v))
}
