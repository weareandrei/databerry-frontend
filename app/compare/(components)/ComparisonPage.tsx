/**
 * Shared template for every `/compare/<competitor>` page.
 *
 * Server component on purpose: the comparison copy is rendered into the
 * HTML for SEO + AI answer engines, while the decorative/interactive
 * bits (`CanvasBackground`, `Navbar`, `Footer`) come in as client
 * islands. The page reuses the landing-page frame — the orange shader
 * canvas, the notch navbar, the white bezel and the footer — so it
 * reads as part of the same site.
 *
 * Layout: the "Databerry vs X" header sits on the orange canvas at the
 * top; the comparison itself — stat strip, one-line key points, a
 * table, and a green/red "who it's for" split — lives on a full-width
 * white panel; the footer sits back on the canvas below.
 */

import Link from 'next/link'
import { ArrowRight, Check, X } from '@phosphor-icons/react/dist/ssr'
import Navbar from '@/app/(components)/navbar'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { Breadcrumbs } from '@/app/(components)/Breadcrumbs'
import { Footer } from '@/app/(sections)/Footer'
import { COMPARISON_LINKS, type Comparison } from '../comparisons'

const SITE = 'https://databerry.app'

export const ComparisonPage = ({ data }: { data: Comparison }) => {
  const { slug, competitor, metaDescription, tagline, lead, stats, keyPoints, atAGlance, fitFor, notFor, verdict } =
    data

  // Structured data so AI answer engines + search can read the page as a
  // comparison article with a clear breadcrumb trail.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: `Databerry vs ${competitor}`,
      description: metaDescription,
      about: ['Databerry', competitor],
      url: `${SITE}/compare/${slug}`,
      author: { '@type': 'Organization', name: 'Databerry', url: SITE },
      publisher: {
        '@type': 'Organization',
        name: 'Databerry',
        url: SITE,
        logo: `${SITE}/databerry_logo_v2.png`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE}/compare` },
        {
          '@type': 'ListItem',
          position: 3,
          name: `Databerry vs ${competitor}`,
          item: `${SITE}/compare/${slug}`,
        },
      ],
    },
  ]

  const otherComparisons = COMPARISON_LINKS.filter(c => c.slug !== slug)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Landing-page frame — orange shader canvas behind everything,
          white bezel decoration, notch navbar. */}
      <CanvasBackground />
      <PhoneBezel />
      <Navbar />

      {/* `relative z-10` lifts the page above the fixed `z-0` canvas. */}
      <div className="relative z-10">
        <main>
          {/* ── Hero header, on the orange canvas ───────────────────── */}
          <section className="px-6 pt-36 pb-12 md:pt-48 md:pb-16 text-center">
            <Breadcrumbs
              className="mb-6"
              items={[
                { label: 'Home', href: '/' },
                { label: 'Compare', href: '/compare' },
                { label: `Databerry vs ${competitor}` },
              ]}
            />
            <h1
              className="mx-auto max-w-4xl text-4xl md:text-6xl font-semibold leading-[1.05] tracking-[-0.04em]"
              style={{ fontFamily: 'var(--font-bricolage)' }}
            >
              <span className="text-white">Databerry</span>
              <span className="text-black">{' '}vs {competitor}</span>
            </h1>
            <p
              className="mx-auto mt-7 max-w-2xl text-base md:text-lg leading-[1.5] text-black"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              {tagline}
            </p>
          </section>

          {/* Blend the orange hero down into the white panel. */}
          <div className="h-16" />

          {/* ── Comparison content, on a full-width white panel ─────
              The panel spans edge-to-edge (so the orange canvas only
              shows in the hero + footer, not flanking the text); the
              copy stays at a readable `max-w-3xl` centered inside it. */}
          <section className="bg-white">
            <article className="mx-auto max-w-3xl px-6 py-14 md:py-20">
              {/* Lead — the core difference, no filler. */}
              <p className="text-lg md:text-xl leading-relaxed text-foreground">{lead}</p>

              {/* Stat strip — the headline numbers. */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map(s => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-stroke bg-surface/40 p-4 text-center"
                  >
                    <div
                      className="text-2xl md:text-3xl font-bold text-primary"
                      style={{ fontFamily: 'var(--font-bricolage)' }}
                    >
                      {s.value}
                    </div>
                    <div className="mt-1 text-xs leading-snug text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* What actually matters — three one-liners. */}
              <div className="mt-10 space-y-3">
                {keyPoints.map(kp => (
                  <div key={kp.heading} className="rounded-2xl border border-stroke p-5">
                    <h3 className="text-base font-semibold text-foreground">{kp.heading}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{kp.body}</p>
                  </div>
                ))}
              </div>

              {/* At a glance — Databerry column tinted so it pops. */}
              <h2 className="mt-12 mb-4 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                At a glance
              </h2>
              <div className="overflow-x-auto rounded-xl border border-stroke">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stroke bg-surface/60">
                      <th className="py-2.5 px-4 text-left font-medium text-subtle" />
                      <th className="py-2.5 px-4 text-left font-semibold text-primary whitespace-nowrap bg-primary/5">
                        Databerry
                      </th>
                      <th className="py-2.5 px-4 text-left font-semibold text-foreground whitespace-nowrap">
                        {competitor}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {atAGlance.map(row => (
                      <tr key={row.label} className="border-b border-stroke/60 last:border-0 align-top">
                        <td className="py-3 px-4 font-medium text-muted-foreground">{row.label}</td>
                        <td className="py-3 px-4 font-medium text-foreground bg-primary/5">
                          {row.databerry}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{row.competitor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Who it's for — green/red split. */}
              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <h3 className="text-sm font-semibold text-green-800">
                    Databerry is the right call when
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {fitFor.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-snug text-green-900">
                        <Check size={15} weight="bold" className="mt-0.5 shrink-0 text-green-600" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <h3 className="text-sm font-semibold text-rose-800">
                    Reach for {competitor} instead when
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {notFor.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-snug text-rose-900">
                        <X size={15} weight="bold" className="mt-0.5 shrink-0 text-rose-500" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Verdict */}
              <h2 className="mt-12 mb-3 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                The bottom line
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">{verdict}</p>

              {/* CTA */}
              <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    See your whole business on one screen
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Connect your stack in minutes. 30-day free trial, no card required.
                  </p>
                </div>
                <Link
                  href="/signup"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Get started
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </div>

              {/* Internal links — other comparisons + home. */}
              {otherComparisons.length > 0 && (
                <div className="mt-10 border-t border-stroke pt-6">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">
                    More comparisons
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {otherComparisons.map(c => (
                      <Link
                        key={c.slug}
                        href={`/compare/${c.slug}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Databerry vs {c.competitor}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </section>
        </main>

        {/* Blend the white panel down into the orange footer. */}
        <div className="h-16 bg-gradient-to-b from-white to-transparent" />

        <Footer />
      </div>
    </>
  )
}
