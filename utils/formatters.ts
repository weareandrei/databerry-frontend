export function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatViewValue(value: string | null, type: string): string {
  const MONEY_TYPES = ['stripe_revenue_today', 'daily_revenue', 'stripe_gross_today', 'stripe_gross_week']
  if (value == null) return '—'
  if (MONEY_TYPES.includes(type)) return formatCents(parseInt(value, 10))
  return Number(value).toLocaleString()
}
