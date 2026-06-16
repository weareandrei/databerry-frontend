import type { Metadata } from 'next'
import { ComparisonPage } from '../(components)/ComparisonPage'
import { AMPLITUDE } from '../comparisons'

const URL = 'https://databerry.app/compare/amplitude'

export const metadata: Metadata = {
  title: AMPLITUDE.metaTitle,
  description: AMPLITUDE.metaDescription,
  robots: { index: true, follow: true },
  alternates: { canonical: URL },
  openGraph: {
    title: AMPLITUDE.metaTitle,
    description: AMPLITUDE.metaDescription,
    url: URL,
    type: 'website',
    images: [{ url: 'https://databerry.app/x_preview.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: AMPLITUDE.metaTitle,
    description: AMPLITUDE.metaDescription,
    images: ['https://databerry.app/x_preview.png'],
  },
}

export default function ComparePage() {
  return <ComparisonPage data={AMPLITUDE} />
}
