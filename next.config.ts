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
}

export default nextConfig;
