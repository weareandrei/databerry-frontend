import type { NextConfig } from "next";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: `${POSTHOG_HOST}/static/:path*`,
      },
      {
        source: '/ingest/:path*',
        destination: `${POSTHOG_HOST}/:path*`,
      },
    ]
  },
  skipTrailingSlashRedirect: true, // Required for PostHog proxy to work correctly
  // Hide the floating Next.js dev indicator (the little logo in the
  // corner that lets you inspect route render mode). Build/runtime
  // errors still surface in the terminal and the error overlay —
  // only the persistent floating chip is suppressed.
  // (Next.js 16: previous `devIndicators.buildActivity` / etc. were
  // removed; the whole block now accepts `false`.)
  devIndicators: false,
}

export default nextConfig;
