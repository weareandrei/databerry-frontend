import type { MetadataRoute } from 'next'

/**
 * Sitemap for crawler / AI-agent indexing.
 *
 * Only the PUBLIC-facing routes are listed — everything under `/hub`
 * is auth-gated and shouldn't surface in search results. The set of
 * URLs here is what Google, Bing, GPTBot, ClaudeBot, PerplexityBot,
 * etc. will see when they ingest `/sitemap.xml`.
 *
 * Priorities reflect marketing intent:
 *   - `/`        — primary landing, highest priority.
 *   - `/signup`  — conversion endpoint, near-top.
 *   - `/login`   — utility page, mid.
 *   - legal     — required but low-priority.
 *
 * `lastModified` uses the current build time. For a static landing
 * that changes weekly-ish, this is honest enough — search engines
 * use it as a "did anything actually change?" hint, and we always
 * return "yes since the last crawl" because every deploy gets a
 * fresh timestamp.
 *
 * Next 16 generates the actual `/sitemap.xml` route from this file
 * (per the `sitemap.(xml|js|ts)` convention in
 * `node_modules/next/dist/docs/01-app/.../sitemap.md`).
 */

const BASE = 'https://databerry.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE}/forgot-password`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
