'use client'

import { memo, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from '@phosphor-icons/react'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'
import { ChartWidget } from '@/app/hub/(components)/widgets/chart/ChartWidget'
import { SentryIssuesWidget } from '@/app/hub/(components)/widgets/sentry/SentryIssuesWidget'
import { MOCK_SENTRY_ISSUES_ACME } from '@/app/(components)/InteractableDemo/(components)/demoMocks'
import {
  DemoTile,
  demoWidget,
  GA_WEEK,
  GA_WEEK_TOTAL,
  SHOWCASE_WIDGETS,
  STRIPE_DAY,
  STRIPE_DAY_TOTAL,
  STRIPE_WEEK,
  STRIPE_WEEK_TOTAL,
  useNearViewport,
} from '@/app/(components)/landingWidgets'

/**
 * "All in one platform" — four things the dashboard does, one per row.
 *
 * Desktop: the rows scroll on the left while one dashboard preview stays
 * pinned on the right and swaps to match the row being read. Below `lg`
 * there is no room for two columns, so each row carries its own preview.
 */
const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const widgetsReady = useNearViewport(sectionRef)
  const { activeIndex, anchorRefs, scrollToFeature } = useActiveFeature()

  return (
    <section
      ref={sectionRef}
      id="features-section"
      className="relative bg-gradient-to-b from-white via-surface to-white px-4 py-24 md:px-[10vw] md:py-32"
    >
      {/* Header cluster — same centred H2 + subhead as the Merged users,
          Timeline and Agent mode sections. */}
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <RevealOnScroll delay={0} y={16}>
          <h2
            className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl"
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            All in one platform
          </h2>
        </RevealOnScroll>
        <RevealOnScroll delay={0.05} y={16}>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            For marketing, sales, finance and product teams — every metric that matters on a single
            page.
          </p>
        </RevealOnScroll>
      </div>

      <div className="mt-10 flex items-start gap-16 lg:mt-16">
        <div className="w-full min-w-0 lg:w-[42%]">
          {FEATURES.map((feature, index) => (
            <FeatureRow
              key={feature.title}
              feature={feature}
              active={index === activeIndex}
              anchorRef={el => {
                anchorRefs.current[index] = el
              }}
              onSelect={() => scrollToFeature(index)}
              // Until the viewport is known both layouts render and CSS
              // picks one; after that only the one in use stays mounted.
              showPreview={isDesktop !== true}
              widgetsReady={widgetsReady}
            />
          ))}
        </div>

        {isDesktop !== false && (
          <div className="sticky top-[max(6rem,calc(50vh-15rem))] hidden min-w-0 flex-1 lg:block">
            <RevealOnScroll delay={0.1} y={20}>
              <ShowcaseFrame>
                <div className="relative h-[420px]">
                  {FEATURES.map((feature, index) => {
                    const active = index === activeIndex

                    return (
                      <div
                        key={feature.title}
                        data-active={active}
                        inert={!active}
                        // All four previews stay mounted, stacked in one
                        // fixed box; a swap is a cross-fade. Out is quick
                        // (150ms), in takes a beat longer (300ms).
                        className="invisible absolute inset-0 translate-y-2 p-4 opacity-0 transition-[opacity,translate,visibility] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-[active=true]:visible data-[active=true]:translate-y-0 data-[active=true]:opacity-100 data-[active=true]:duration-300 motion-reduce:translate-y-0"
                      >
                        {widgetsReady && <feature.Preview />}
                      </div>
                    )
                  })}
                </div>
              </ShowcaseFrame>
            </RevealOnScroll>
          </div>
        )}
      </div>
    </section>
  )
}

export default FeaturesSection

interface FeatureRowProps {
  feature: Feature
  active: boolean
  anchorRef: (el: HTMLElement | null) => void
  onSelect: () => void
  showPreview: boolean
  /** Widgets mount once the section is nearly on screen — see `useNearViewport`. */
  widgetsReady: boolean
}

/**
 * One feature: who it is for (the heading), what it does for them (one
 * line), and three specifics. On desktop the row being read is at full
 * strength and the others step back — but stay readable.
 */
const FeatureRow = ({
  feature,
  active,
  anchorRef,
  onSelect,
  showPreview,
  widgetsReady,
}: FeatureRowProps) => {
  return (
    <div
      data-active={active}
      className="group/row border-t border-stroke py-10 first:border-t-0 first:pt-0 lg:py-14"
    >
      <h3
        ref={anchorRef}
        className="text-3xl font-semibold tracking-tight text-foreground transition-colors duration-300 lg:group-data-[active=false]/row:text-foreground/50"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        <button
          type="button"
          onClick={onSelect}
          className="rounded-sm text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          {feature.title}
        </button>
      </h3>

      <p className="mt-3 max-w-[36ch] text-pretty text-lg leading-snug text-foreground/80 transition-colors duration-300 lg:group-data-[active=false]/row:text-muted-foreground">
        {feature.pitch}
      </p>

      <ul className="mt-6 flex flex-col gap-2.5">
        {feature.facts.map(fact => (
          <li
            key={fact}
            className="flex items-start gap-2.5 text-sm leading-snug text-foreground/70 transition-colors duration-300 lg:group-data-[active=false]/row:text-muted-foreground"
          >
            <Check
              size={14}
              weight="bold"
              aria-hidden
              className="mt-[3px] shrink-0 text-secondary transition-colors duration-300 lg:group-data-[active=false]/row:text-subtle"
            />
            {fact}
          </li>
        ))}
      </ul>

      {showPreview && (
        <div className="mt-8 lg:hidden">
          <ShowcaseFrame>
            <div className="h-[420px] p-3">{widgetsReady && <feature.Preview />}</div>
          </ShowcaseFrame>
        </div>
      )}

      <Link
        href="/signup"
        className="group/cta mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-secondary transition-colors hover:text-secondary/80"
      >
        {feature.cta}
        <ArrowRight
          size={14}
          weight="bold"
          aria-hidden
          className="transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5"
        />
      </Link>
    </div>
  )
}

/**
 * The white-rimmed frame with a route chip that every showcase on the page
 * sits in (Merged users, Timeline, Agent mode). The screen inside uses the
 * dashboard's own grey surface, so the widgets read as cards on it.
 */
const ShowcaseFrame = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)]">
      <div className="overflow-hidden rounded-2xl bg-white/35">
        <div className="flex justify-center py-3">
          <span className="inline-flex items-center rounded-full bg-white/25 p-1 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
            <span className="whitespace-nowrap rounded-full bg-white px-4 py-1 text-xs font-light text-black">
              /dashboard
            </span>
          </span>
        </div>

        <div
          className={`${SHOWCASE_WIDGETS} mx-3 mb-3 overflow-hidden rounded-xl border border-stroke bg-surface text-left shadow-card`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Which row is being read: the one whose heading sits in a band across the
 * middle of the screen. Watching the headings (not the whole rows) means at
 * most one is in the band at a time, so the preview never flickers between
 * two candidates.
 */
const useActiveFeature = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const anchorRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = anchorRefs.current.indexOf(entry.target as HTMLElement)
          if (index !== -1) setActiveIndex(index)
        }
      },
      { rootMargin: '-25% 0px -50% 0px' },
    )
    anchorRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollToFeature = (index: number) => {
    anchorRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return { activeIndex, anchorRefs, scrollToFeature }
}

const DESKTOP_QUERY = '(min-width: 1024px)'

/** `undefined` on the server and during hydration, then the real answer. */
const useIsDesktop = () => {
  return useSyncExternalStore<boolean | undefined>(
    onChange => {
      const query = window.matchMedia(DESKTOP_QUERY)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => undefined,
  )
}

// ─── previews ─────────────────────────────────────────────────────────────────
//
// Each one fills the same fixed screen: something tall on top, a 104px row
// underneath. Memoised — they take no props, so switching the active row
// never re-renders a chart.

const TILE_ROW = 'grid h-[104px] shrink-0 grid-cols-2 gap-3'

const MarketingPreview = memo(function MarketingPreview() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-0 flex-1">
        <ChartWidget
          view={demoWidget('Sessions this week', 'google_analytics', 'ga_sessions_week')}
          points={GA_WEEK}
          total={GA_WEEK_TOTAL}
          loading={false}
          error={null}
          dense
        />
      </div>
      <div className={TILE_ROW}>
        <DemoTile view={demoWidget('Signed up', 'posthog', 'daily_counter', '2841')} />
        <DemoTile view={demoWidget('Trials', 'posthog', 'daily_counter', '619')} />
      </div>
    </div>
  )
})

const SalesPreview = memo(function SalesPreview() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-0 flex-1">
        <ChartWidget
          view={demoWidget('This Week Gross Volume', 'stripe_manual', 'stripe_gross_week')}
          points={STRIPE_WEEK}
          total={STRIPE_WEEK_TOTAL}
          loading={false}
          error={null}
          dense
        />
      </div>
      <div className={TILE_ROW}>
        <DemoTile view={demoWidget('Active subs', 'stripe_manual', 'stripe_active_subs', '214')} />
        <DemoTile view={demoWidget('Churn Rate', 'stripe_manual', 'stripe_churn_rate', '2.4')} />
      </div>
    </div>
  )
})

const SERVICES = [
  { name: 'Main App', uptime: '99.98%', degraded: false },
  { name: 'API Gateway', uptime: '99.95%', degraded: false },
  { name: 'Auth Service', uptime: '98.21%', degraded: true },
  { name: 'Billing', uptime: '100%', degraded: false },
]

const ProductPreview = memo(function ProductPreview() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-0 flex-1">
        <SentryIssuesWidget
          view={demoWidget('Errors', 'sentry', 'sentry_issues_list')}
          onUntrack={() => {}}
          onPin={() => {}}
          isPinned={false}
          issues={MOCK_SENTRY_ISSUES_ACME.slice(0, 3)}
          loading={false}
          error={null}
          period="7d"
          sort="frequent"
        />
      </div>

      <ul className="grid h-[104px] shrink-0 grid-cols-1 content-center gap-x-6 gap-y-1 rounded-xl border border-stroke bg-white px-4 shadow-card sm:grid-cols-2 sm:gap-y-3">
        {SERVICES.map(service => (
          <li key={service.name} className="flex min-w-0 items-center gap-2 text-sm">
            <span
              className={`size-2 shrink-0 rounded-full ${service.degraded ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
            <span className="min-w-0 truncate font-medium text-foreground">{service.name}</span>
            <span className="sr-only">{service.degraded ? 'degraded' : 'operational'}</span>
            <span
              className={`ml-auto shrink-0 text-xs tabular-nums ${service.degraded ? 'font-medium text-amber-600' : 'text-muted-foreground'}`}
            >
              {service.uptime}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
})

const SNAPSHOT_DAYS = ['Apr 3', 'Apr 4', 'Apr 5', 'Apr 6', 'Apr 7', 'Apr 8', 'Apr 9']
const SNAPSHOT_DAY = 'Apr 8'

const TimeTravelPreview = memo(function TimeTravelPreview() {
  return (
    <div className="flex h-full flex-col gap-3">
      {/* A picture of the date control, not a control: nothing here is
          clickable, so nothing is a button. */}
      <ol aria-label={`Viewing the ${SNAPSHOT_DAY} snapshot`} className="flex shrink-0 gap-1.5">
        {SNAPSHOT_DAYS.map((day, index) => {
          const selected = day === SNAPSHOT_DAY
          const upcoming = index > SNAPSHOT_DAYS.indexOf(SNAPSHOT_DAY)

          return (
            <li
              key={day}
              aria-current={selected ? 'date' : undefined}
              className={`flex-1 rounded-lg border py-2 text-center text-[11px] font-medium leading-none ${
                selected
                  ? 'border-foreground bg-foreground text-background'
                  : upcoming
                    ? 'border-stroke bg-white text-subtle'
                    : 'border-stroke bg-white text-foreground/70'
              }`}
            >
              {day}
            </li>
          )
        })}
      </ol>

      <div className="min-h-0 flex-1">
        <ChartWidget
          view={demoWidget('Gross Volume', 'stripe_manual', 'stripe_gross')}
          points={STRIPE_DAY}
          total={STRIPE_DAY_TOTAL}
          loading={false}
          error={null}
          dense
        />
      </div>
      <div className={TILE_ROW}>
        <DemoTile view={demoWidget('Active subs', 'stripe_manual', 'stripe_active_subs', '208')} />
        <DemoTile view={demoWidget('Signed up', 'posthog', 'daily_counter', '194')} />
      </div>
    </div>
  )
})

// ─── content ──────────────────────────────────────────────────────────────────

interface Feature {
  /** Who the row is for — the row's heading. */
  title: string
  /** What the dashboard does for them, in one line. */
  pitch: string
  facts: string[]
  cta: string
  Preview: React.FC
}

const FEATURES: Feature[] = [
  {
    title: 'Marketing',
    pitch: 'Transform raw analytics data into decisions that move the needle.',
    facts: [
      'Track only the metrics you care about — no dashboard bloat',
      'See live event counts update as users interact with your product',
      'Spot drop-offs and conversion trends without writing a single query',
    ],
    cta: 'Start organising your data',
    Preview: MarketingPreview,
  },
  {
    title: 'Sales',
    pitch: 'Import your financial data to track revenue in real time.',
    facts: [
      'Weekly and daily revenue charts, updated automatically',
      "New customer counts so you know exactly how fast you're growing",
      'MRR, balance, and gross volume — all in one view',
    ],
    cta: 'Be aware of your finance',
    Preview: SalesPreview,
  },
  {
    title: 'Product',
    pitch: 'Monitor all your products and services from one screen.',
    facts: [
      "All products' uptime and health status in a single view",
      'Connect Sentry and GitHub to surface errors and open issues instantly',
      'Get notified before your users do when something goes wrong',
    ],
    cta: 'See everything in real time',
    Preview: ProductPreview,
  },
  {
    title: 'Time travel',
    pitch: 'Go back in time to any day since you started using Databerry.',
    facts: [
      'Daily snapshots stored automatically for every view you create',
      'Navigate to any historical date with a single click',
      'Compare periods and catch trends you would have otherwise missed',
    ],
    cta: 'Become a time traveller',
    Preview: TimeTravelPreview,
  },
]
