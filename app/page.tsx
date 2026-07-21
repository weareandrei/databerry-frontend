import { Hero } from './(sections)/Hero'
import Navbar from '@/app/(components)/navbar'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import FeaturesSection from '@/app/(sections)/Features'
import DemoSection from '@/app/(sections)/DemoSection'
import ConnectSection from '@/app/(sections)/ConnectSection'
import VideoSection from '@/app/(sections)/VideoSection'
import AgentModeSection from '@/app/(sections)/AgentModeSection'
import MergedUsersSection from '@/app/(sections)/MergedUsersSection'
import TimelineSection from '@/app/(sections)/TimelineSection'
import Pricing from '@/app/(sections)/Pricing'
import FAQ from '@/app/(sections)/FAQ'
import Contact from '@/app/(sections)/Contact'
import { Footer } from './(sections)/Footer'
import { LoadingScreen } from '@/app/(components)/LoadingScreen'
import { DATABERRY_LOGO_URL } from '@/constants/brand'
import {
  SITE_ORIGIN,
  SOFTWARE_APP_DESCRIPTION,
  SOFTWARE_APP_FEATURES,
} from '@/constants/seo'

/**
 * Schema.org JSON-LD for the landing page.
 *
 *   1. `SoftwareApplication` — what Databerry is (mirrors hero + feature sections).
 *   2. `Organization` — company / Knowledge Panel basics.
 *   3. `WebSite` — site name + URL for sitelinks / brand queries.
 *
 * `FAQPage` JSON-LD lives in `<FAQ>` next to the Q&A source of truth.
 */
const SITE_JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Databerry',
    alternateName: 'Databerry — unlock the data hidden in your tools',
    description: SOFTWARE_APP_DESCRIPTION,
    url: SITE_ORIGIN,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    audience: {
      '@type': 'Audience',
      name: 'Founders who use too many tools',
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
    image: `${SITE_ORIGIN}/x_preview.png`,
    screenshot: `${SITE_ORIGIN}/x_preview.png`,
    featureList: [...SOFTWARE_APP_FEATURES],
    publisher: {
      '@type': 'Organization',
      name: 'Databerry',
      url: SITE_ORIGIN,
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Databerry',
    url: SITE_ORIGIN,
    logo: DATABERRY_LOGO_URL,
    description: SOFTWARE_APP_DESCRIPTION,
    sameAs: ['https://twitter.com/xdrewmiko', 'https://x.com/xdrewmiko'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Databerry',
    url: SITE_ORIGIN,
    description: SOFTWARE_APP_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: 'Databerry',
      url: SITE_ORIGIN,
    },
  },
]

const LandingPage = () => {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSONLD) }}
      />
      {renderDecorations()}
      <Navbar />
      <Hero />
      <DemoSection />
      <ConnectSection />
      <VideoSection />
      <MergedUsersSection />
      <TimelineSection />
      <FeaturesSection />
      <AgentModeSection />
      <Pricing />
      <FAQ />
      <Contact />
      <Footer />
    </main>
  )
}

export default LandingPage

const renderDecorations = () => {
  return (
    <>
      <LoadingScreen />
      <PhoneBezel />
    </>
  )
}
