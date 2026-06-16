import type { Metadata } from 'next'
import { ComparisonPage } from '../(components)/ComparisonPage'
import { MIXPANEL } from '../comparisons'

const URL = 'https://databerry.app/compare/mixpanel'

export const metadata: Metadata = {
  title: MIXPANEL.metaTitle,
  description: MIXPANEL.metaDescription,
  robots: { index: true, follow: true },
  alternates: { canonical: URL },
  openGraph: {
    title: MIXPANEL.metaTitle,
    description: MIXPANEL.metaDescription,
    url: URL,
    type: 'website',
    images: [{ url: 'https://databerry.app/x_preview.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: MIXPANEL.metaTitle,
    description: MIXPANEL.metaDescription,
    images: ['https://databerry.app/x_preview.png'],
  },
}

export default function ComparePage() {
  return <ComparisonPage data={MIXPANEL} />
}
