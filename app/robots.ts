import type { MetadataRoute } from 'next'

/**
 * `robots.txt` for crawler + AI-agent access.
 *
 * Previously the site had no robots.txt (the request was caught by
 * the SPA's catch-all route and returned login HTML — useless to
 * crawlers). Some AI bots default to "allow" when robots is missing,
 * some default to "skip" — explicitly allowing is the cheapest way
 * to remove the ambiguity.
 *
 * What's allowed:
 *   - Every public bot can crawl everything except the auth-gated
 *     `/hub` namespace and the OAuth-callback `/auth` path.
 *
 * What's explicitly NAMED:
 *   - Major AI training & RAG crawlers (GPTBot, ClaudeBot,
 *     Claude-Web, PerplexityBot, Google-Extended, CCBot, anthropic-
 *     ai, FacebookBot). Naming them doesn't change behaviour
 *     beyond the wildcard `*` rule, BUT some bots only honour
 *     wildcard rules when they ALSO see their own user-agent
 *     listed (signal that the operator knows about them). This is
 *     the "yes, you specifically, come in" handshake.
 *
 * Sitemap: pointing at the same URL the Next.js sitemap.ts
 * generates. Multiple sitemap entries are allowed if we add more
 * later.
 */

const BASE = 'https://databerry.app'

const AI_CRAWLERS = [
  'GPTBot',          // OpenAI training crawler
  'ChatGPT-User',    // ChatGPT browse / browsing actions
  'OAI-SearchBot',   // OpenAI search index
  'ClaudeBot',       // Anthropic training crawler
  'Claude-Web',      // Anthropic web actions
  'anthropic-ai',    // Legacy alias some Anthropic services still use
  'PerplexityBot',   // Perplexity RAG
  'Perplexity-User', // Perplexity user-triggered fetches
  'Google-Extended', // Google AI training opt-in (separate from Googlebot)
  'CCBot',           // Common Crawl — feeds many LLM training corpora
  'FacebookBot',     // Meta AI training crawler
  'Bytespider',      // ByteDance / TikTok AI crawler
  'Applebot-Extended', // Apple Intelligence training opt-in
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Wildcard — everything not under /hub or /auth is fair game.
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/hub/', '/auth/'],
      },
      // Explicit allow per AI crawler so they don't default-skip
      // when their own user-agent isn't named. Same disallow list.
      {
        userAgent: AI_CRAWLERS,
        allow: '/',
        disallow: ['/hub/', '/auth/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
