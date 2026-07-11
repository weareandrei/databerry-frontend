/** Per-integration bar colors for simple chart views (Stripe, GA, PostHog, …). */
export const INTEGRATION_BAR_COLORS: Record<string, { base: string; hover: string }> = {
  stripe_manual: { base: '#635BFF', hover: '#4F46E5' },
  stripe: { base: '#635BFF', hover: '#4F46E5' },
  google_analytics: { base: '#F4B400', hover: '#E0A300' },
  posthog: { base: '#1D4AFF', hover: '#0F2CB5' },
  webhook: { base: '#10B981', hover: '#059669' },
  composite: { base: '#10B981', hover: '#059669' },
}

export const FALLBACK_INTEGRATION_BAR = { base: '#635BFF', hover: '#4F46E5' }
