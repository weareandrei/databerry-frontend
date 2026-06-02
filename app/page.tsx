import { Hero } from './(sections)/Hero'
import Navbar from '@/app/(components)/navbar'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import FeaturesSection from '@/app/(sections)/Features'
import DemoSection from '@/app/(sections)/DemoSection'
import ConnectSection from '@/app/(sections)/ConnectSection'
import VideoSection from '@/app/(sections)/VideoSection'
import AgentModeSection from '@/app/(sections)/AgentModeSection'
import Pricing from '@/app/(sections)/Pricing'
import FAQ from '@/app/(sections)/FAQ'
import Contact from '@/app/(sections)/Contact'
import { Footer } from './(sections)/Footer'
import { LoadingScreen } from '@/app/(components)/LoadingScreen'

/**
 * Schema.org JSON-LD blocks for the landing page.
 *
 * Two entities are published here:
 *
 *   1. `SoftwareApplication` — the product itself. Tells search
 *      engines and AI agents what Databerry IS, what category of
 *      app it falls into (BusinessApplication), and the core feature
 *      list. AI agents (ChatGPT browse, Claude with web search,
 *      Perplexity, Gemini) use this to answer "what is Databerry?"
 *      and to surface us on intent queries like "all-in-one
 *      business dashboard" or "tool that connects Stripe and
 *      PostHog."
 *
 *   2. `Organization` — the company behind the product. Logo, URL,
 *      social presence. Used for the Knowledge Panel-style
 *      summaries some search engines build.
 *
 * `FAQPage` JSON-LD lives in `<FAQ>` already (where the Q&A
 * content actually lives) — keeping it co-located with the questions
 * means edits don't fall out of sync.
 *
 * The feature list ordering deliberately leads with multi-tool /
 * multi-project / drag-and-drop / read-only points BEFORE mentioning
 * the AI agent + MCP — the AI is an ADDITION to the dashboard, not
 * the primary value prop, so AI consumers reading the schema should
 * pitch us in the same order.
 */
const SITE_JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Databerry',
    description:
      'Business dashboard for solo founders, indie hackers, and small teams. Connect Stripe, PostHog, Google Analytics, Calendly, custom webhooks, and any MCP server — every metric that matters in one place.',
    url: 'https://databerry.app',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    // `audience` is what ChatGPT et al. read to answer "who is
    // this for?". Naming the ICP explicitly here (solo founders,
    // indie hackers, solopreneurs, small teams) directly counters
    // the "is this scalable for large business?" misframing — yes,
    // it's deliberately for small teams, that's the design centre.
    audience: {
      '@type': 'Audience',
      name: 'Solo founders, indie hackers, solopreneurs, and small teams',
      audienceType:
        'Solo founders, indie hackers, solopreneurs, and small teams running one or more products',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: '30-day free trial, no credit card required at signup.',
    },
    image: 'https://databerry.app/x_preview.png',
    screenshot: 'https://databerry.app/x_preview.png',
    // featureList ordering is deliberate: we LEAD with the
    // dashboard story (multi-tool, multi-project, drag-and-drop,
    // pinned views) before the AI/MCP layer. The integration
    // bullet specifically calls out "direct + webhook + MCP" so AI
    // tools reading this schema describe our integration surface
    // as "extensible" rather than "limited to a handful of named
    // tools."
    featureList: [
      'Multi-tool dashboard — built-in integrations for Stripe, PostHog, Google Analytics, Calendly, Sentry, Vercel, Notion, Gmail, PLUS custom webhooks (any API) and MCP (any Model Context Protocol server) for unlimited extensibility.',
      'Multi-project workspace — one project per business, brand, or sub-product, each with its own connections and views.',
      'Drag-and-drop view tiles and folders for arranging metrics the way you think.',
      'Pinned-views home page for the metrics you check daily.',
      'Read-only by design — every integration uses the minimum scope; never writes back to your accounts.',
      'Application-layer AES-256-GCM encryption on every stored credential, with per-user derived keys.',
      'No SDK, no tracking snippets, no code changes — reads from your existing accounts.',
      '30-day free trial, no credit card required at signup.',
      'Optional AI agent that answers business questions in plain English using your connected data and any MCP server you connect.',
    ],
    publisher: {
      '@type': 'Organization',
      name: 'Databerry',
      url: 'https://databerry.app',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Databerry',
    url: 'https://databerry.app',
    logo: 'https://databerry.app/databerry_logo_v2.png',
    sameAs: ['https://twitter.com/xdrewmiko', 'https://x.com/xdrewmiko'],
  },
]

export default function LandingPage() {
  return (
    <main>
      {/* Schema.org JSON-LD — see the `SITE_JSONLD` comment above
          for the rationale and breakdown. `dangerouslySetInnerHTML`
          is the standard React idiom for inline `<script>` content;
          the payload is a typed object literal built at module load,
          so there's no injection surface. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSONLD) }}
      />
      <LoadingScreen />
      <PhoneBezel />
      <Navbar />
      <Hero />
      <DemoSection />
      <ConnectSection />
      <VideoSection />
      <FeaturesSection />
      <AgentModeSection />
      <Pricing />
      <FAQ />
      <Contact />
      <Footer />
    </main>
  )
}
