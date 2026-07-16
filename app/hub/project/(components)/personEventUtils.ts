/**
 * Shared formatting + presentation helpers for a person's event
 * timeline. Extracted from `PersonEventsSheet` so both the sheet
 * (header, filter badges, loading/empty states) and the horizontal
 * `PersonEventsTimeline` render the exact same labels, details, and
 * per-source accent colours.
 */

import type { PersonEvent } from '@/lib/api'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'

/** Capitalise the first letter — for login-method labels like "Google". */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/**
 * Short connection name for a filter badge / card — strips the
 * "(Connect)" / "(Twitter)" qualifiers in CONNECTION_DISPLAY_NAMES so
 * labels stay tidy.
 */
export function connectionName(source: string): string {
  return (CONNECTION_DISPLAY_NAMES[source] ?? capitalize(source)).replace(/\s*\(.*\)$/, '')
}

/** "Jun 14, 2026 · 3:42 PM" — absolute date + time, local zone. */
export function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "3:42 PM" — time only, for the compact timeline card. */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "Mon, Jun 14, 2026 · 3:42 PM" — full stamp for the expanded card. */
export function formatFull(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Currency-format a Stripe charge amount (smallest unit → major). */
export function formatAmount(props: Record<string, unknown>): string | null {
  const amount = props.amount
  const currency = props.currency
  if (typeof amount !== 'number' || typeof currency !== 'string') return null
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

/**
 * A short, human "what exactly" line for an event — the page visited,
 * the element clicked, the login method, or the charge amount —
 * derived from the curated `properties` the backend captured. Returns
 * null when there's nothing extra worth showing.
 */
export function detailFor(ev: PersonEvent): string | null {
  const p = ev.properties ?? {}
  // Stripe charges → the amount.
  if (ev.source === 'stripe') return formatAmount(p)
  // Login → "via Google" (only login-type events carry `method`).
  if (typeof p.method === 'string' && p.method) return `via ${capitalize(p.method)}`
  // Click → the clicked element's text.
  if (typeof p.elementText === 'string' && p.elementText) return `“${p.elementText}”`
  // Page view / leave → the path.
  if (typeof p.path === 'string' && p.path) return p.path
  return null
}

/** snake_case / camelCase → "Title Case" for the expanded property list. */
function prettyKey(k: string): string {
  return k
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

/**
 * Curated key/value rows shown when a timeline card is expanded.
 * Known properties (amount, status, path, …) get friendly labels +
 * formatting; any remaining primitive properties are appended
 * generically (objects/arrays skipped), capped so a chatty payload
 * doesn't blow the card open.
 */
export function propertyRows(ev: PersonEvent): { label: string; value: string }[] {
  const p = ev.properties ?? {}
  const rows: { label: string; value: string }[] = []
  const seen = new Set<string>()
  const push = (label: string, value: unknown) => {
    if (value == null || value === '') return
    rows.push({ label, value: String(value) })
  }

  const amount = formatAmount(p)
  if (amount) {
    push('Amount', amount)
    seen.add('amount')
    seen.add('currency')
  }
  if (typeof p.status === 'string') {
    push('Status', capitalize(p.status))
    seen.add('status')
  }
  if (typeof p.path === 'string') {
    push('Path', p.path)
    seen.add('path')
  }
  if (typeof p.elementText === 'string') {
    push('Element', p.elementText)
    seen.add('elementText')
  }
  if (typeof p.method === 'string') {
    push('Method', capitalize(p.method))
    seen.add('method')
  }

  for (const [k, v] of Object.entries(p)) {
    if (seen.has(k) || v == null || typeof v === 'object') continue
    push(prettyKey(k), typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v)
    if (rows.length >= 8) break
  }

  return rows
}

/**
 * Per-source accent colour — the vertical line on the left of every
 * timeline card, so "same colour = same source" reads at a glance.
 * Known integrations use their brand colour; unknown sources hash into
 * a stable palette so they still get a consistent, distinct colour.
 */
const SOURCE_COLORS: Record<string, string> = {
  posthog: '#F54E00',
  stripe: '#635BFF',
  stripe_manual: '#635BFF',
  google_analytics: '#E8710A',
  calendly: '#006BFF',
  sentry: '#362D59',
  vercel: '#1A1A1A',
  gmail: '#EA4335',
  github: '#24292E',
  x: '#1DA1F2',
  reddit: '#FF4500',
}

const FALLBACK_PALETTE = [
  '#6366F1',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
]

export function sourceColor(source: string | null): string {
  const key = source ?? 'custom'
  if (SOURCE_COLORS[key]) return SOURCE_COLORS[key]
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length]
}
