'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { CheckCircle, ArrowRight } from '@phosphor-icons/react'
import type { View } from '@/types/view'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'

// ─── fake data helpers ────────────────────────────────────────────────────────

function fakeView(
  id: string,
  name: string,
  connectionType: string,
  value: string,
  type = 'custom',
): View {
  return {
    id,
    name,
    projectId: 'id1',
    folderId: '',
    connectionId: 'preview',
    connectionType,
    type,
    config: {},
    value,
    isPinned: false,
    userId: 'preview',
    createdAt: '',
  }
}

const STRIPE_POINTS = [
  { label: 'Mon', value: 580000 },
  { label: 'Tue', value: 720000 },
  { label: 'Wed', value: 610000 },
  { label: 'Thu', value: 890000 },
  { label: 'Fri', value: 1040000 },
  { label: 'Sat', value: 480000 },
  { label: 'Sun', value: 500000 },
]

const UPTIME_PRODUCTS = [
  { name: 'Main App', status: 'operational', uptime: '99.98%', color: '#10b981' },
  { name: 'API Gateway', status: 'operational', uptime: '99.95%', color: '#10b981' },
  { name: 'Auth Service', status: 'degraded', uptime: '98.21%', color: '#f59e0b' },
  { name: 'Billing', status: 'operational', uptime: '100%', color: '#10b981' },
]

// ─── feature previews ─────────────────────────────────────────────────────────

function MarketingPreview() {
  return (
    <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: '110px' }}>
      <ViewCard view={fakeView('ph1', 'user_signed_up', 'posthog', '2841')} onUntrack={() => {}} />
      <ViewCard view={fakeView('ph2', 'trial_started', 'posthog', '619')} onUntrack={() => {}} />
      <ViewCard view={fakeView('ph3', 'conversion_rate', 'posthog', '22')} onUntrack={() => {}} />
      <ViewCard
        view={fakeView('ph4', 'churn_this_month', 'posthog', '14')}
        onUntrack={() => {}}
      />
    </div>
  )
}

function SalesPreview() {
  return (
    <div className="flex flex-col gap-3">
      <div style={{ height: '220px' }}>
        <ViewCardChart
          view={{
            ...fakeView('s1', 'This Week Gross Volume', 'stripe_manual', '4820000'),
            type: 'stripe_gross_week',
          }}
          onUntrack={() => {}}
          points={STRIPE_POINTS}
          total={4820000}
          loading={false}
          error={null}
        />
      </div>
      <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: '90px' }}>
        <ViewCard
          view={fakeView('s2', 'New Customers', 'stripe_manual', '38')}
          onUntrack={() => {}}
        />
        <ViewCard
          view={fakeView('s3', "Today's Revenue", 'stripe_manual', '284000', 'stripe_gross')}
          onUntrack={() => {}}
        />
      </div>
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="flex flex-col gap-2">
      {UPTIME_PRODUCTS.map(p => (
        <div
          key={p.name}
          className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-sm font-medium">{p.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: p.color + '18', color: p.color }}
            >
              {p.status}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{p.uptime}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoryPreview() {
  const days = ['Apr 3', 'Apr 4', 'Apr 5', 'Apr 6', 'Apr 7', 'Apr 8', 'Apr 9']
  const activeDay = 5

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {days.map((day, i) => (
          <button
            key={day}
            className={`flex-1 rounded-lg py-2 text-center transition-colors ${
              i === activeDay
                ? 'bg-foreground text-background'
                : i === days.length - 1
                  ? 'bg-card border text-muted-foreground'
                  : 'bg-card border hover:bg-accent/40'
            }`}
          >
            <span className="text-[10px] font-medium block">{day}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: '100px' }}>
        <ViewCard
          view={fakeView('h1', 'Gross Volume', 'stripe_manual', '1042000', 'stripe_gross')}
          onUntrack={() => {}}
        />
        <ViewCard
          view={fakeView('h2', 'New Customers', 'stripe_manual', '28')}
          onUntrack={() => {}}
        />
        <ViewCard
          view={fakeView('h3', 'user_signed_up', 'posthog', '194')}
          onUntrack={() => {}}
        />
        <ViewCard
          view={fakeView('h4', 'trial_started', 'posthog', '51')}
          onUntrack={() => {}}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">Viewing Apr 8 snapshot</p>
    </div>
  )
}

// ─── feature definitions ──────────────────────────────────────────────────────

interface Bullet { text: string }

const FEATURES: {
  badge: string
  tagline: string
  header: string
  sub: string
  bullets: Bullet[]
  cta: string
  Preview: React.FC
}[] = [
  {
    badge: 'Marketing',
    tagline: 'for marketing teams',
    header: 'Transform raw analytics data into decisions that move the needle',
    sub: 'Stop bouncing between PostHog, Mixpanel, and spreadsheets. Pull every metric that matters onto a single page — and act on it before the day ends.',
    bullets: [
      { text: 'Track only the metrics you care about — no dashboard bloat' },
      { text: 'See live event counts update as users interact with your product' },
      { text: 'Spot drop-offs and conversion trends without writing a single query' },
    ],
    cta: 'Start organising your data',
    Preview: MarketingPreview,
  },
  {
    badge: 'Sales',
    tagline: 'for sales and finance',
    header: 'Import your financial data to track revenue in real time',
    sub: 'Connect Stripe and get a live pulse on your business — daily charts, new customer counts, and running totals, always current.',
    bullets: [
      { text: 'Weekly and daily revenue charts, updated automatically' },
      { text: 'New customer counts so you know exactly how fast you\'re growing' },
      { text: 'MRR, balance, and gross volume — all in one view' },
    ],
    cta: 'Be aware of your finance',
    Preview: SalesPreview,
  },
  {
    badge: 'Product',
    tagline: 'for product teams',
    header: 'Monitor all your products and services from one screen',
    sub: 'Keep track of uptime, error rates, and performance across every service you run — without setting up a separate monitoring dashboard.',
    bullets: [
      { text: 'All products\' uptime and health status in a single view' },
      { text: 'Connect Sentry and GitHub to surface errors and open issues instantly' },
      { text: 'Get notified before your users do when something goes wrong' },
    ],
    cta: 'See everything in real time',
    Preview: ProductPreview,
  },
  {
    badge: 'Time Travel',
    tagline: 'for every team',
    header: 'Go back in time to any day since you started using Databerry',
    sub: 'Every metric you track is snapshotted daily. Navigate to any past date and see exactly what your numbers looked like — revenue, signups, events, all of it.',
    bullets: [
      { text: 'Daily snapshots stored automatically for every view you create' },
      { text: 'Navigate to any historical date with a single click' },
      { text: 'Compare periods and catch trends you would have otherwise missed' },
    ],
    cta: 'Become a time traveller',
    Preview: HistoryPreview,
  },
]

// ─── components ───────────────────────────────────────────────────────────────

interface FeatureItemProps {
  index: number
  badge: string
  header: string
  sub: string
  bullets: Bullet[]
  cta: string
  active: boolean
  innerRef: (el: HTMLDivElement | null) => void
  divider: boolean
  onScrollTo: () => void
  Preview: React.FC
}

function FeatureItem({
  badge,
  header,
  sub,
  bullets,
  cta,
  active,
  innerRef,
  divider,
  onScrollTo,
  Preview,
}: FeatureItemProps) {
  return (
    <div>
      <button onClick={onScrollTo} className="w-full text-left group">
        <div ref={innerRef} className="py-10">
          <span
            className={`inline-block text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full transition-colors duration-300 ${
              active
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-400 group-hover:bg-orange-500 group-hover:text-white'
            }`}
          >
            {badge}
          </span>
          <h3
            className={`mt-4 text-2xl font-semibold tracking-tight leading-[1.2] transition-colors duration-300 ${active ? 'text-gray-900' : 'text-gray-300 group-hover:text-gray-400'}`}
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            {header}
          </h3>
          <p
            className={`mt-3 text-base leading-relaxed transition-colors duration-300 ${active ? 'text-gray-500' : 'text-gray-300 group-hover:text-gray-400'}`}
          >
            {sub}
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {bullets.map((b, i) => (
              <li
                key={i}
                className={`flex items-start gap-2.5 text-sm transition-colors duration-300 ${active ? 'text-gray-600' : 'text-gray-300 group-hover:text-gray-400'}`}
              >
                <CheckCircle
                  size={16}
                  weight="fill"
                  className={`shrink-0 mt-0.5 transition-colors duration-300 ${active ? 'text-orange-500' : 'text-gray-200 group-hover:text-orange-300'}`}
                />
                {b.text}
              </li>
            ))}
          </ul>
        </div>
      </button>

      {/* Mobile inline preview */}
      <div className="dashboard md:hidden rounded-2xl border bg-card p-4 mb-6">
        <Preview />
      </div>

      <Link
        href="/signup"
        className="inline-flex items-center gap-1.5 mt-1 mb-8 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors group/cta"
        onClick={e => e.stopPropagation()}
      >
        {cta}
        <ArrowRight
          size={14}
          weight="bold"
          className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
        />
      </Link>
      {divider && <div className="h-px bg-gray-200" />}
    </div>
  )
}

const FeaturesSection = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const featureRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = featureRefs.current.indexOf(entry.target as HTMLDivElement)
            if (idx !== -1) setActiveIndex(idx)
          }
        })
      },
      { rootMargin: '-20% 0px -50% 0px' },
    )
    featureRefs.current.forEach(ref => {
      if (ref) observer.observe(ref)
    })
    return () => observer.disconnect()
  }, [])

  function scrollToFeature(i: number) {
    featureRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const ActivePreview = FEATURES[activeIndex].Preview

  return (
    <section id="features-section" className="relative px-[10vw] flex flex-col bg-white">
      {/*
        Inner wrapper acts as the sticky header's *containing block* —
        sticky releases when this wrapper's bottom edge reaches the
        viewport top. To make the header un-stick 200 px early
        (without shrinking the section as a whole), the feature-list
        below carries a `-mb-[200px]` negative margin: that shrinks
        the wrapper's flex-computed height by 200 px while keeping the
        feature-list's content visually the same. The 200 px tail
        sibling sits in the gap so the section's overall height —
        and the start of the next section — is unchanged.
      */}
      <div className="flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-white pt-24 md:pt-20 pb-8 overflow-visible">
          <RevealOnScroll delay={0} y={16}>
            <p className="text-xs font-medium text-orange-500 uppercase tracking-widest">Features</p>
            <h2
              className="mt-2 text-4xl font-semibold tracking-tight text-gray-900"
              style={{ fontFamily: 'var(--font-bricolage)' }}
            >
              All in one platform
            </h2>
          </RevealOnScroll>
          <AnimatePresence mode="wait">
            <motion.p
              key={activeIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5 text-base text-gray-400"
            >
              {FEATURES[activeIndex].tagline}
            </motion.p>
          </AnimatePresence>
          <div className="absolute bottom-0 left-0 right-0 h-[50px] translate-y-full bg-gradient-to-b from-white to-transparent pointer-events-none" />
        </div>

        {/*
          Feature list + sticky preview.
          `-mb-[200px]` is what actually makes the header un-stick early.
          In a flex column, a child's outer-size = content + margins
          (incl. negative margins). With this −200 mb, the wrapper above
          treats this child as 200 px shorter, so its flex-computed
          height — and thus its bottom edge in the document, which is
          the sticky's release point — comes up 200 px. The visible
          content below is unchanged; the 200 px tail sibling occupies
          the same Y range that gets reclaimed here, keeping the
          section's overall height (and the next section's start
          position) constant.
        */}
        <div className="flex flex-row pb-32 pt-6 gap-16 items-start -mb-[200px]">
          {/* Left: feature text */}
          <div className="flex flex-col w-full md:w-[45%]">
            {FEATURES.map((feature, i) => (
              <RevealOnScroll key={i} delay={0} y={20}>
                <FeatureItem
                  index={i}
                  badge={feature.badge}
                  header={feature.header}
                  sub={feature.sub}
                  bullets={feature.bullets}
                  cta={feature.cta}
                  active={activeIndex === i}
                  divider={i < FEATURES.length - 1}
                  innerRef={el => {
                    featureRefs.current[i] = el
                  }}
                  onScrollTo={() => scrollToFeature(i)}
                  Preview={feature.Preview}
                />
              </RevealOnScroll>
            ))}
          </div>

          {/* Right: sticky preview panel — desktop only */}
          <div className="hidden md:block flex-1 sticky top-[30vh]">
            <RevealOnScroll delay={0.1} y={20}>
            <div className="dashboard rounded-2xl border bg-card p-5 shadow-sm flex items-center justify-center h-[40vh]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <ActivePreview />
                </motion.div>
              </AnimatePresence>
            </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>

      {/*
        200 px tail. Lives outside the wrapper above so the sticky
        header's containing block doesn't include it — meaning the
        header releases when the wrapper ends and this region scrolls
        without it. `aria-hidden` because there's no semantic content
        here; it's purely a layout buffer.
      */}
      <div aria-hidden className="h-[200px]" />
    </section>
  )
}

export default FeaturesSection
