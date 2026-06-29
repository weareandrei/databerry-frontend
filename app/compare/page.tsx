import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'
import Navbar from '@/app/(components)/navbar'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { Footer } from '@/app/(sections)/Footer'
import { COMPARISONS } from './comparisons'

const URL = 'https://databerry.app/compare'

export const metadata: Metadata = {
  title: 'Compare Databerry — how it stacks up against analytics tools',
  description:
    'See how Databerry, the all-in-one business dashboard for founders and small teams, compares to product-analytics platforms like Amplitude and Mixpanel.',
  robots: { index: true, follow: true },
  alternates: { canonical: URL },
  openGraph: {
    title: 'Compare Databerry — how it stacks up against analytics tools',
    description:
      'See how Databerry compares to product-analytics platforms like Amplitude and Mixpanel.',
    url: URL,
    type: 'website',
    images: [{ url: 'https://databerry.app/x_preview.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare Databerry — how it stacks up against analytics tools',
    description:
      'See how Databerry compares to product-analytics platforms like Amplitude and Mixpanel.',
    images: ['https://databerry.app/x_preview.png'],
  },
}

export default function CompareHub() {
  const items = Object.values(COMPARISONS)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Compare Databerry',
    url: URL,
    hasPart: items.map(c => ({
      '@type': 'TechArticle',
      headline: `Databerry vs ${c.competitor}`,
      url: `https://databerry.app/compare/${c.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <CanvasBackground />
      <PhoneBezel />
      <Navbar />

      <div className="relative z-10">
        <main>
          {/* Hero, on the orange canvas. */}
          <section className="px-6 pt-36 pb-12 md:pt-48 md:pb-16 text-center">
            <span className="inline-block mb-6 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              Comparisons
            </span>
            <h1
              className="mx-auto max-w-4xl text-4xl md:text-6xl font-semibold leading-[1.05] tracking-[-0.04em] text-white"
              style={{ fontFamily: 'var(--font-bricolage)' }}
            >
              Compare  Databerry
            </h1>
            <p
              className="mx-auto mt-7 max-w-2xl text-base md:text-lg leading-[1.5] text-black"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Databerry is the all-in-one business dashboard for founders — every
              number that matters in one place, no SDK required. Here&apos;s how
              it compares to the product-analytics tools you might know.
            </p>
          </section>

          {/* Comparison cards. */}
          <section className="px-6 pb-24">
            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
              {items.map(c => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="group flex flex-col rounded-3xl bg-white p-7 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-1"
                >
                  <h2
                    className="text-2xl font-semibold tracking-tight text-grey-darkest"
                    style={{ fontFamily: 'var(--font-bricolage)' }}
                  >
                    Databerry vs {c.competitor}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-grey-dark">
                    {c.tagline}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                    Read comparison
                    <ArrowRight
                      size={15}
                      weight="bold"
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
