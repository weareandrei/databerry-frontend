/**
 * Content for the `/compare/<competitor>` SEO pages.
 *
 * Each entry is a hand-written, deliberately CONCISE comparison between
 * Databerry and one competitor — built to be scanned, not waded
 * through. Short lead, headline stats, a tight table, three one-line
 * "what matters" points, and a green/red "who it's for" split. Honest
 * and specific: it names what the competitor is genuinely good at.
 * That balance is what AI answer engines (ChatGPT / Claude / Perplexity)
 * quote, and what a skimming founder actually reads.
 *
 * Add a comparison: write one more `Comparison`, add it to
 * `COMPARISONS` + `COMPARISON_LINKS`, and create
 * `app/compare/<slug>/page.tsx`.
 */

/** A headline number for the stat strip ("0", "~10 min", …). */
export interface ComparisonStat {
  value: string
  label: string
}

/** One row of the at-a-glance table. */
export interface ComparisonRow {
  label: string
  databerry: string
  competitor: string
}

/** A one-line "what actually matters" point. */
export interface KeyPoint {
  heading: string
  body: string
}

export interface Comparison {
  slug: string
  competitor: string
  metaTitle: string
  metaDescription: string
  /** One-line summary under the hero header. */
  tagline: string
  /** 2-3 sentence framing — the core difference. No filler. */
  lead: string
  /** 4 headline numbers. */
  stats: ComparisonStat[]
  /** 3 one-line differences that actually matter. */
  keyPoints: KeyPoint[]
  /** Scannable side-by-side table. */
  atAGlance: ComparisonRow[]
  /** Green box — when Databerry is the right call. */
  fitFor: string[]
  /** Red box — when to reach for the competitor instead. */
  notFor: string[]
  /** One tight closing line. */
  verdict: string
}

const STARTER_STATS: ComparisonStat[] = [
  { value: '0', label: 'SDKs or tracking code to install' },
  { value: '~10 min', label: 'From sign-up to a live dashboard' },
  { value: '8+', label: 'Tools in one view' },
  { value: '$0', label: 'To start — 30-day free trial' },
]

export const AMPLITUDE: Comparison = {
  slug: 'amplitude',
  competitor: 'Amplitude',
  metaTitle: 'Databerry vs Amplitude — unlock your tools vs product analytics',
  metaDescription:
    'Databerry vs Amplitude: unlock Stripe, PostHog, Google Analytics & more with no SDK — versus a deep product-analytics platform. Setup, scope, pricing, and who each is for.',
  tagline:
    'Amplitude tells you how users behave inside your product. Databerry unlocks the data already sitting in your tools — revenue, traffic, and usage on one screen, no SDK.',
  lead: 'They solve different problems. Amplitude is deep product analytics: instrument your app, stream events, build funnels and cohorts. Databerry unlocks data hidden across tools you already run — Stripe, PostHog, Google Analytics, Calendly, Sentry — and puts every number that matters side by side. No tracking code, no data team.',
  stats: STARTER_STATS,
  keyPoints: [
    {
      heading: 'Connect, don’t instrument',
      body: 'Databerry reads accounts you already have. Amplitude needs an SDK, an event taxonomy, and weeks of clean data before the charts mean anything.',
    },
    {
      heading: 'Your whole business, not one funnel',
      body: 'Revenue, traffic, usage, meetings, and errors together. Amplitude only knows the in-app events you send it — not your Stripe MRR.',
    },
    {
      heading: 'Pricing that doesn’t scale against you',
      body: 'One flat plan. Amplitude meters on event volume, so the bill climbs — and surprises — as you grow.',
    },
  ],
  atAGlance: [
    { label: 'Setup', databerry: 'Connect accounts, no code', competitor: 'Install SDK, instrument events' },
    { label: 'Time to first insight', databerry: 'Minutes', competitor: 'Days to weeks' },
    { label: 'Data scope', databerry: 'Revenue, traffic, usage, ops', competitor: 'In-app events only' },
    { label: 'Revenue / MRR view', databerry: 'Built in (Stripe)', competitor: 'Not available' },
    { label: 'Pricing', databerry: 'Flat plan', competitor: 'Per-event volume' },
    { label: 'Built for', databerry: 'Founders & small teams', competitor: 'Product & growth teams' },
    { label: 'AI agent on your data', databerry: 'Included (+ any MCP)', competitor: 'Add-on / limited' },
  ],
  fitFor: [
    'You want revenue, traffic, and usage on one screen — the founder’s-eye view.',
    'You’d rather connect existing accounts than instrument an app.',
    'You don’t have (or want) a data team to maintain event tracking.',
    'You want answers in plain English from a built-in AI agent.',
  ],
  notFor: [
    'Deep funnel, cohort, path, and retention analysis is the actual job.',
    'You have the traffic and team to maintain a clean event taxonomy.',
    'In-app behaviour is your core metric, not a side view.',
  ],
  verdict:
    'Want rich, query-able product analytics and the team to maintain it? Amplitude is purpose-built. Want every number that matters on one screen in ten minutes? That’s Databerry — and plenty of founders run both.',
}

export const MIXPANEL: Comparison = {
  slug: 'mixpanel',
  competitor: 'Mixpanel',
  metaTitle: 'Databerry vs Mixpanel — unlock your tools vs product analytics',
  metaDescription:
    'Databerry vs Mixpanel: unlock Stripe, PostHog, Google Analytics & more with no SDK — versus event-based product analytics. Setup, scope, pricing, and who each is for.',
  tagline:
    'Mixpanel is deep analytics for one slice of your business — in-app behaviour. Databerry unlocks data across all of it, with no SDK to install.',
  lead: 'Mixpanel is event-based product analytics: instrument your app, stream events, build funnels and retention reports. Databerry unlocks accounts you already have — Stripe, PostHog, Google Analytics, Calendly, Sentry — and lays revenue, traffic, and usage side by side. No tracking snippet, no event schema to maintain.',
  stats: STARTER_STATS,
  keyPoints: [
    {
      heading: 'Connect, don’t instrument',
      body: 'Databerry reads accounts you already use. Mixpanel needs its SDK, an event schema, and time for data to build up first.',
    },
    {
      heading: 'All of it, not one funnel',
      body: 'Revenue, traffic, usage, meetings, and errors in one place. Mixpanel sees only the in-app events you track — not your MRR or bookings.',
    },
    {
      heading: 'Flat, predictable pricing',
      body: 'One plan. Mixpanel prices on tracked events and users, so cost grows with scale and is hard to forecast.',
    },
  ],
  atAGlance: [
    { label: 'Setup', databerry: 'Connect accounts, no code', competitor: 'Install SDK, track events' },
    { label: 'Time to first insight', databerry: 'Minutes', competitor: 'Days to weeks' },
    { label: 'Data scope', databerry: 'Revenue, traffic, usage, ops', competitor: 'In-app events only' },
    { label: 'Revenue / MRR view', databerry: 'Built in (Stripe)', competitor: 'Not available' },
    { label: 'Pricing', databerry: 'Flat plan', competitor: 'Event / user volume' },
    { label: 'Built for', databerry: 'Founders & small teams', competitor: 'Product & growth teams' },
    { label: 'AI agent on your data', databerry: 'Included (+ any MCP)', competitor: 'Add-on / limited' },
  ],
  fitFor: [
    'You want the whole business — revenue, traffic, usage — at a glance.',
    'You’d rather connect accounts than add a tracking snippet.',
    'You’re a founder or small team without a data person.',
    'You want to ask your data questions in plain English.',
  ],
  notFor: [
    'Self-serve funnels, retention, and flows are the core job.',
    'You have the traffic and team to maintain an event schema.',
    'In-app behaviour is the metric you live in day to day.',
  ],
  verdict:
    'Need deep, self-serve product analytics and the team to maintain it? Mixpanel is a strong, popular choice. Want revenue, traffic, and usage on one screen in ten minutes, no instrumentation? That’s Databerry — many founders use both.',
}

/** Slug → comparison, for the page routes. */
export const COMPARISONS: Record<string, Comparison> = {
  amplitude: AMPLITUDE,
  mixpanel: MIXPANEL,
}

/** Drives the navbar "Compare" dropdown. Add a row and the link
 *  appears automatically. */
export const COMPARISON_LINKS: { slug: string; competitor: string }[] = [
  { slug: 'amplitude', competitor: 'Amplitude' },
  { slug: 'mixpanel', competitor: 'Mixpanel' },
]
