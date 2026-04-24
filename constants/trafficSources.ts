/**
 * Mirrors backend/src/project-overview/source-normalization.ts.
 * Frontend uses this only to style / render segments when the backend supplies a key.
 *
 * Colours are restrained to fit the Kontext design system — muted greys with a
 * handful of controlled accent colours. The brand orange (#F46719) is reserved
 * for the Reddit source so the colour is re-used intentionally rather than
 * competing with primary UI chrome.
 */

export interface NormalizedSource {
  key: string
  label: string
  color: string
  /** True when the chip should be rendered with an outline because the fill colour is white. */
  outlined?: boolean
  /** Public path to a brand logo asset, when available. */
  logo?: string
}

// Vibrant, well-separated palette — distinct hues at similar saturation so no
// source dominates visually. Brand orange (#F46719) is reserved for Reddit.
export const SOURCE_STYLE: Record<string, NormalizedSource> = {
  direct:     { key: 'direct',     label: 'direct',      color: '#6366f1' }, // indigo
  chatgpt:    { key: 'chatgpt',    label: 'ChatGPT',     color: '#10b981', logo: '/logos/chatgpt.svg' }, // emerald
  google:     { key: 'google',     label: 'Google',      color: '#ffffff', outlined: true, logo: '/logos/google.svg' },
  x:          { key: 'x',          label: 'x.com',       color: '#0ea5e9', logo: '/logos/x.png' }, // sky
  reddit:     { key: 'reddit',     label: 'Reddit',      color: '#F46719', logo: '/logos/reddit.svg' }, // brand orange
  youtube:    { key: 'youtube',    label: 'YouTube',     color: '#f43f5e' }, // rose
  facebook:   { key: 'facebook',   label: 'Facebook',    color: '#3b82f6' }, // blue
  linkedin:   { key: 'linkedin',   label: 'LinkedIn',    color: '#06b6d4' }, // cyan
  github:     { key: 'github',     label: 'GitHub',      color: '#8b5cf6' }, // violet
  hn:         { key: 'hn',         label: 'Hacker News', color: '#f97316' }, // orange
  bing:       { key: 'bing',       label: 'Bing',        color: '#14b8a6' }, // teal
  duckduckgo: { key: 'duckduckgo', label: 'DuckDuckGo',  color: '#f59e0b' }, // amber
  instagram:  { key: 'instagram',  label: 'Instagram',   color: '#ec4899' }, // pink
  tiktok:     { key: 'tiktok',     label: 'TikTok',      color: '#a855f7' }, // purple
  other:      { key: 'other',      label: 'other',       color: '#c4b5fd' }, // violet-300
  total:      { key: 'total',      label: 'Total',       color: '#64748b' }, // slate-500
  revenue:    { key: 'revenue',    label: 'Revenue',     color: '#F46719' }, // brand orange
}

export function sourceStyle(key: string, fallbackLabel?: string): NormalizedSource {
  return (
    SOURCE_STYLE[key] ?? {
      key,
      label: fallbackLabel ?? 'other',
      color: '#CBC9CA',
    }
  )
}
