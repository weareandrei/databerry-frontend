'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import { ViewCardFunnel } from '@/app/hub/(components)/view/ViewCardFunnel'
import { ViewCardSentryIssues } from '@/app/hub/(components)/view/ViewCardSentryIssues'
import {
  MOCK_POSTHOG_FUNNEL,
  MOCK_SENTRY_ISSUES_ACME,
} from '@/app/(components)/InteractableDemo/demoMocks'
import type { View } from '@/types/view'
import type { CalendlyMeeting } from '@/lib/api'

const LOGOS = [
  { src: '/landing/logos/stripe_logo.png', alt: 'Stripe', comingSoon: false },
  { src: '/landing/logos/posthog_logo.png', alt: 'PostHog', comingSoon: false },
  { src: '/landing/logos/calendly_logo.png', alt: 'Calendly', comingSoon: false },
  { src: '/landing/logos/ga4_logo.png', alt: 'Google Analytics', comingSoon: false },
  { src: '/landing/logos/gmail_logo.png', alt: 'Gmail', comingSoon: true },
  { src: '/landing/logos/sentry_logo.png', alt: 'Sentry', comingSoon: false },
  { src: '/landing/logos/notion_logo.png', alt: 'Notion', comingSoon: true },
  { src: '/connections/datafast_icon.png', alt: 'Datafast', comingSoon: true },
]

function fakeView(id: string, name: string, connectionType: string, value: string | null): View {
  return {
    id,
    name,
    projectId: 'id1',
    folderId: '',
    connectionId: 'preview',
    connectionType,
    type: 'custom',
    config: {},
    value,
    isPinned: false,
    userId: 'preview',
    createdAt: '',
  }
}

const TODAY = '2026-04-08'

const CALENDLY_MEETINGS: CalendlyMeeting[] = [
  {
    startTime: `${TODAY}T09:00:00Z`,
    endTime: `${TODAY}T09:30:00Z`,
    name: 'Onboarding Call',
    bookingUri: '#',
    description: null,
    invitees: [{ name: 'Alice Johnson', email: 'alice@example.com' }],
  },
  {
    startTime: `${TODAY}T11:00:00Z`,
    endTime: `${TODAY}T11:45:00Z`,
    name: 'Product Demo',
    bookingUri: '#',
    description: null,
    invitees: [{ name: 'Bob Smith', email: 'bob@example.com' }],
  },
  {
    startTime: `${TODAY}T14:30:00Z`,
    endTime: `${TODAY}T15:00:00Z`,
    name: 'Strategy Review',
    bookingUri: '#',
    description: null,
    invitees: [{ name: 'Carol White', email: 'carol@example.com' }],
  },
]

const STRIPE_CHART_POINTS = [
  { label: 'Mon', value: 580000 },
  { label: 'Tue', value: 720000 },
  { label: 'Wed', value: 610000 },
  { label: 'Thu', value: 890000 },
  { label: 'Fri', value: 1040000 },
  { label: 'Sat', value: 480000 },
  { label: 'Sun', value: 500000 },
]

// GA "Sessions this week" — a real analytics chart (amber GA bars) that
// sums to the 14,820 headline. `ga_sessions_week` isn't a money view-type,
// so the header + tooltip format as a plain count.
const GA_SESSION_POINTS = [
  { label: 'Mon', value: 1820 },
  { label: 'Tue', value: 2140 },
  { label: 'Wed', value: 2390 },
  { label: 'Thu', value: 2610 },
  { label: 'Fri', value: 2980 },
  { label: 'Sat', value: 1520 },
  { label: 'Sun', value: 1360 },
]

function StripePreview() {
  return (
    <div style={{ height: '300px' }}>
      <ViewCardChart
        view={{
          ...fakeView('s1', 'This Week Gross Volume', 'stripe_manual', '4820000'),
          type: 'stripe_gross_week',
        }}
        onUntrack={() => {}}
        points={STRIPE_CHART_POINTS}
        total={4820000}
        loading={false}
        error={null}
      />
    </div>
  )
}

function PostHogPreview() {
  // A real PostHog funnel — far more representative of what users actually
  // wire up than four flat event counters. The funnel's `<ViewWrapper>` is
  // `h-full`, so a fixed-height parent makes it STRETCH to fill the showcase
  // slot instead of sitting at its `dense` min-height floor with dead space
  // around it. Heights are kept under each breakpoint's slot so nothing
  // clips (mobile slot ≈ 316px content, desktop ≈ 396px).
  return (
    <div className="h-[300px] md:h-[390px]">
      <ViewCardFunnel
        view={{ ...fakeView('ph-funnel', 'Sign-up funnel', 'posthog', null), type: 'posthog_funnel' }}
        onUntrack={() => {}}
        onPin={() => {}}
        isPinned={false}
        steps={MOCK_POSTHOG_FUNNEL}
        loading={false}
        error={null}
        dense
      />
    </div>
  )
}

function CalendlyPreview() {
  return (
    <div style={{ height: '300px' }}>
      <ViewCardList
        view={{
          ...fakeView('c1', "Today's Calls", 'calendly', null),
          type: 'calendly_meetings_list',
        }}
        onUntrack={() => {}}
        meetings={CALENDLY_MEETINGS}
        loading={false}
        error={null}
      />
    </div>
  )
}

function GoogleAnalyticsPreview() {
  // Real GA sessions chart (amber bars) instead of flat stat tiles.
  return (
    <div style={{ height: '300px' }}>
      <ViewCardChart
        view={{
          ...fakeView('ga1', 'Sessions this week', 'google_analytics', '14820'),
          type: 'ga_sessions_week',
        }}
        onUntrack={() => {}}
        points={GA_SESSION_POINTS}
        total={14820}
        loading={false}
        error={null}
      />
    </div>
  )
}

function SentryPreview() {
  // Real Sentry issues list (reuses the interactive demo's mock issues)
  // instead of flat error counters — levels, event counts and "last seen"
  // exactly as the live view renders them.
  return (
    <div style={{ height: '340px' }}>
      <ViewCardSentryIssues
        view={{
          ...fakeView('se1', 'Errors', 'sentry', null),
          type: 'sentry_issues_list',
        }}
        onUntrack={() => {}}
        onPin={() => {}}
        isPinned={false}
        issues={MOCK_SENTRY_ISSUES_ACME}
        loading={false}
        error={null}
        period="7d"
        sort="frequent"
      />
    </div>
  )
}

function SimpleStatsPreview({
  connectionType,
  stats,
}: {
  connectionType: string
  stats: { name: string; value: string }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: '120px' }}>
      {stats.map(s => (
        <ViewCard
          key={s.name}
          view={fakeView(s.name, s.name, connectionType, s.value)}
          onUntrack={() => {}}
        />
      ))}
    </div>
  )
}

const PREVIEWS: React.FC[] = [
  StripePreview,
  PostHogPreview,
  CalendlyPreview,
  GoogleAnalyticsPreview,
  () => (
    <SimpleStatsPreview
      connectionType="gmail"
      stats={[
        { name: 'Received Today', value: '47' },
        { name: 'Unread', value: '12' },
      ]}
    />
  ),
  SentryPreview,
  () => (
    <SimpleStatsPreview
      connectionType="custom"
      stats={[
        { name: 'Pages', value: '312' },
        { name: 'Edits Today', value: '28' },
      ]}
    />
  ),
  () => (
    // Datafast — privacy-first web analytics (coming soon), so the
    // preview is the same flat stat-tile placeholder Gmail / Notion use.
    <SimpleStatsPreview
      connectionType="custom"
      stats={[
        { name: 'Visitors', value: '6210' },
        { name: 'Page views', value: '18430' },
      ]}
    />
  ),
]

const ConnectSection = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % LOGOS.length)
    }, 2000)
  }, [])

  // Pause the carousel while the visitor is hovering the preview slot, so
  // they can inspect / interact with the sample (e.g. hover funnel steps)
  // without the slide swapping under them. Resumes on mouse-leave.
  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    startInterval()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startInterval])

  function handleLogoClick(index: number) {
    setActiveIndex(index)
    startInterval()
  }

  const PreviewComponent = PREVIEWS[activeIndex]
  const isComingSoon = LOGOS[activeIndex].comingSoon

  const LogoGrid = (
    <div className="grid grid-cols-4 gap-4 md:gap-6 w-fit">
      {LOGOS.map((logo, index) => (
        <button
          key={logo.alt}
          onClick={() => handleLogoClick(index)}
          className={`rounded-[18px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-200 ${
            activeIndex === index ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
          }`}
        >
          <Image
            src={logo.src}
            alt={logo.alt}
            width={64}
            height={64}
            className="rounded-[14px]"
          />
        </button>
      ))}
    </div>
  )

  const PreviewCard = (
    <div
      className="dashboard w-full rounded-2xl border-2 border-white/50 bg-white/10 backdrop-blur-sm overflow-hidden p-4"
      onMouseEnter={stopInterval}
      onMouseLeave={startInterval}
    >
      {/* Mobile: FIXED height (`h-[340px]`) rather than `min-h`, so
          the auto-cycling carousel can't resize this box as slides of
          different heights swap in — without it the tallest slide
          (the "coming soon" badge + 4-tile grid ≈ 336px incl. padding)
          grew the container past the 300px floor every couple seconds,
          shoving everything below up and down. 340px clears the
          tallest slide so nothing clips. Desktop is unchanged:
          `md:h-auto` drops the fixed height and `md:min-h-[420px]`
          restores the original floor-only behaviour (it was already
          stable there). Content stays vertically centred via the
          flex utilities, so shorter slides sit nicely in the fixed
          box. */}
      <div className="w-full h-[340px] md:h-auto md:min-h-[420px] rounded-xl overflow-hidden p-3 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {isComingSoon && (
              <div className="flex flex-col items-center gap-1.5 mb-4">
                <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
                    Coming soon
                  </span>
                </div>
                <p className="text-xs text-white/40">
                  {LOGOS[activeIndex].alt} integration is on the way
                </p>
              </div>
            )}
            <PreviewComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )

  return (
    <section className="relative z-30 px-[10vw] py-24 min-h-screen flex items-center">

      {/* Desktop layout */}
      <div className="hidden md:flex flex-row items-center gap-16 w-full">
        <div className="flex flex-col w-[45%] gap-6">
          <RevealOnScroll delay={0}>
            <h2
              className="text-6xl font-bold leading-[1.05] tracking-[-0.04em]"
              style={{ fontFamily: 'var(--font-bricolage)' }}
            >
              <span className="text-white">Connect your</span>
              <br />
              <span className="text-white">business systems</span>
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay={0.12}>
            <p className="text-base text-white/70 leading-relaxed max-w-sm">
              Integrate business data from any platform you work with into a single page. See only data that matters.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={0.22}>
            {/*
              Translucent-white halo around the white button — same
              ring-in-ring pattern as the FAQ "Ask a question" CTA, just
              with the colours inverted for the dark backdrop. `bg-white/25`
              is the wrapper tint; the inner stays solid white so the
              button itself stays high-contrast against the section's
              dark background. `rounded-[18px]` = inner `rounded-xl`
              (12 px) + outer `p-1.5` (6 px); using `rounded-2xl` (16 px)
              would leave the corners slightly off-concentric.
              `w-fit` + `shadow-sm` move from the Link to this wrapper
              so the button + halo cluster reads as one element with one
              drop shadow.
            */}
            <span className="inline-flex w-fit rounded-[18px] bg-white/25 p-1.5 shadow-sm">
              <Link
                href="/hub/connections"
                className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-white/90 transition-colors"
              >
                View connections
              </Link>
            </span>
          </RevealOnScroll>
          <RevealOnScroll delay={0.32}>
            <div className="mt-4">{LogoGrid}</div>
          </RevealOnScroll>
        </div>
        <RevealOnScroll delay={0.18} className="flex-1 self-stretch flex items-center">
          {PreviewCard}
        </RevealOnScroll>
      </div>

      {/* Mobile layout: stacked */}
      <div className="md:hidden flex flex-col gap-8 w-full">
        <RevealOnScroll delay={0}>
          <h2
            className="text-4xl font-bold leading-[1.1] tracking-[-0.04em] text-white"
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            Connect your business systems
          </h2>
        </RevealOnScroll>
        <RevealOnScroll delay={0.1}>
          <p className="text-base text-white/70 leading-relaxed">
            Integrate business data from any platform you work with into a single page. See only data that matters.
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.18}>
          {/* Mobile mirror of the desktop halo wrapper above — see
              that block for the rationale on the radius math
              (`rounded-[18px]` outer + `rounded-xl` inner) and why
              `shadow-sm` lives on the wrapper. */}
          <span className="inline-flex w-fit rounded-[18px] bg-white/25 p-1.5 shadow-sm">
            <Link
              href="/hub/connections"
              className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-white/90 transition-colors"
            >
              View connections
            </Link>
          </span>
        </RevealOnScroll>
        <RevealOnScroll delay={0.26}>{LogoGrid}</RevealOnScroll>
        <RevealOnScroll delay={0.34}>{PreviewCard}</RevealOnScroll>
      </div>

    </section>
  )
}

export default ConnectSection
