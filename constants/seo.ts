/**
 * Shared site-wide SEO copy. Keep this in sync with the landing hero
 * (`app/(sections)/Hero.tsx`) and major feature sections — title /
 * description / JSON-LD all import from here so they can't drift.
 */

export const SITE_ORIGIN = 'https://databerry.app' as const

/** Matches the hero H1 story: data trapped in tools → Databerry unlocks it. */
export const SITE_TITLE =
  'Databerry - #1 startup dashboard.' as const

/**
 * Meta / OG / Twitter description. Mirrors the hero subhead + the
 * feature sections that follow (connect, merged users, timeline, agent).
 * Keep ≤ ~160 chars for SERP snippets.
 */
export const SITE_DESCRIPTION =
  'Built for founders who use too many tools. Connect Stripe, PostHog, Google Analytics, Calendly, Sentry & more — metrics side by side, with merged users, a project timeline, and an AI agent.' as const

/** Longer SoftwareApplication.description for JSON-LD (AI / Knowledge Panel). */
export const SOFTWARE_APP_DESCRIPTION =
  'Business dashboard for founders who use too many tools. Databerry unlocks data hidden across Stripe, PostHog, Google Analytics, Calendly, Sentry, Vercel, custom webhooks, and any MCP server — every metric that matters side by side, plus merged users, a project timeline, and an optional AI agent.' as const

/**
 * Schema.org featureList order: dashboard + unlock story first, then
 * people/timeline, then trust/setup, then AI. Matches landing section order
 * after the hero (demo → connect → people → timeline → features → agent).
 */
export const SOFTWARE_APP_FEATURES = [
  'Unlock data hidden across your tools — connect Stripe, PostHog, Google Analytics, Calendly, Sentry, Vercel, custom webhooks, and any MCP server into one dashboard.',
  'Multi-project workspace — one project per business or product, each with its own connections and views.',
  'Pinned home and drag-and-drop view tiles so the metrics you check daily stay front and center.',
  'Merged users across analytics tools — one profile per person stitching Stripe, PostHog, and Google Analytics activity onto a single timeline.',
  'Project timeline — see who visited, signed up, and purchased across your tools on one time axis.',
  'Read-only by design — minimum OAuth scopes; never writes back to your accounts.',
  'Application-layer AES-256-GCM encryption on every stored credential, with per-user derived keys.',
  'No SDK, no tracking snippets, no code changes — reads from accounts you already have.',
  '30-day free trial, no credit card required at signup.',
  'Optional AI agent that answers business questions in plain English using your connected data and any MCP server you connect.',
] as const
