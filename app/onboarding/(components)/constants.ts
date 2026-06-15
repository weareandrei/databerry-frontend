/**
 * Static configuration shared across the onboarding step components,
 * the persistence hook, and the orchestrator page. Pure data — no
 * React, no side effects — so it imports cleanly from anywhere in the
 * onboarding tree without risking a cycle.
 */

export type Step = 'welcome' | 'tools' | 'connecting' | 'views'

export const STEPS: { id: 'welcome' | 'tools' | 'views'; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'tools', label: 'Connect your tools' },
  { id: 'views', label: 'Create data views' },
]

/** Which top-bar dot is lit for each flow step. The connecting
 *  sequence is part of "Connect your tools". */
export function activeStepIndex(step: Step): number {
  if (step === 'welcome') return 0
  if (step === 'views') return 2
  return 1
}

/** Tools offered on step 2, in queue order. `oauth` tools redirect
 *  to a consent screen instead of rendering a credential form. */
export const TOOLS: { type: string; label: string; oauth: boolean }[] = [
  { type: 'posthog', label: 'PostHog', oauth: false },
  { type: 'stripe', label: 'Stripe', oauth: false },
  { type: 'sentry', label: 'Sentry', oauth: true },
  { type: 'google_analytics', label: 'Google Analytics', oauth: true },
]

export const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  TOOLS.map(t => [t.type, t.label]),
)

export type ViewSection = {
  section: string
  requiresTool: string | null
  options: { id: string; iconType: string; label: string; desc: string }[]
}

/** Starter views offered on step 3 — each section only shows when
 *  its tool was selected on step 2.
 *
 *  NO "General" section on purpose: the backend's `createProject`
 *  already auto-creates the Project Overview pair (chart + sources)
 *  with every new project, so offering it here would create
 *  duplicates. Only connection-backed extras are offered. */
export const VIEW_SECTIONS: ViewSection[] = [
  {
    section: 'PostHog',
    requiresTool: 'posthog',
    options: [
      {
        id: 'daily_counter',
        iconType: 'posthog',
        label: 'Track event',
        desc: 'Daily chart of an event you pick',
      },
      // NOT offering Funnel here on purpose: a funnel needs 2–5
      // user-picked event steps and there's no sensible default —
      // auto-creating one would render a broken tile. "Recent
      // users" is zero-config and works the moment PostHog is
      // connected.
      {
        id: 'posthog_users',
        iconType: 'posthog',
        label: 'Recent users',
        desc: 'Latest users with sessions & location',
      },
    ],
  },
  {
    section: 'Stripe',
    requiresTool: 'stripe',
    options: [
      {
        id: 'stripe_gross',
        iconType: 'stripe',
        label: 'Gross Volume',
        desc: 'Succeeded charges, charted over time',
      },
      {
        id: 'stripe_mrr',
        iconType: 'stripe',
        label: 'MRR',
        desc: 'Monthly recurring revenue',
      },
    ],
  },
  {
    section: 'Google Analytics',
    requiresTool: 'google_analytics',
    options: [
      {
        id: 'ga_users_today',
        iconType: 'google_analytics',
        label: 'Users',
        desc: 'Unique users, daily chart',
      },
      {
        id: 'ga_pageviews_today',
        iconType: 'google_analytics',
        label: 'Pageviews',
        desc: "Today's page views",
      },
    ],
  },
  {
    section: 'Sentry',
    requiresTool: 'sentry',
    options: [
      {
        id: 'sentry_issues_list',
        iconType: 'sentry',
        label: 'Errors',
        desc: 'Unresolved issues, sorted by recency',
      },
    ],
  },
]
