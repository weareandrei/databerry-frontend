export function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// View types whose backend `value` is a cents-string ("12345" → "$123.45").
// Add new currency tiles here (see also `MONEY_TYPES` in chart components).
const MONEY_TYPES = [
  'stripe_revenue_today',
  'daily_revenue',
  'stripe_gross_today',
  'stripe_gross_week',
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
