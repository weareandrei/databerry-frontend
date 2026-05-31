export const CONNECTION_DISPLAY_NAMES: Record<string, string> = {
  posthog: 'PostHog',
  stripe: 'Stripe (Connect)',
  stripe_manual: 'Stripe',
  calendly: 'Calendly',
  google_analytics: 'Google Analytics',
  vercel: 'Vercel',
  webhook: 'Webhook',
  sentry: 'Sentry',
  github: 'GitHub',
  x: 'X (Twitter)',
  reddit: 'Reddit',
  gmail: 'Gmail',
  custom: 'Custom',
  mcp: 'MCP',
  // The `composite` connection type is the category bucket in the
  // CreateViewModal picker — under it sit "Project overview"
  // (chart + sources composite) and the standalone "Chart" view.
  // Display label is "General" so the section reads as "no specific
  // integration needed" rather than tying it to one view type.
  composite: 'General',
}
