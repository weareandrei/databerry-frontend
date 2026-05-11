'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'
import { ViewCard } from '@/app/hub/(components)/view/ViewCard'
import { ViewCardChart } from '@/app/hub/(components)/view/ViewCardChart'
import { ViewCardList } from '@/app/hub/(components)/view/ViewCardList'
import type { View } from '@/types/view'
import type { CalendlyMeeting } from '@/lib/api'

const LOGOS = [
  { src: '/landing/logos/stripe_logo.png', alt: 'Stripe', comingSoon: false },
  { src: '/landing/logos/posthog_logo.png', alt: 'PostHog', comingSoon: false },
  { src: '/landing/logos/calendly_logo.png', alt: 'Calendly', comingSoon: false },
  { src: '/landing/logos/ga4_logo.png', alt: 'Google Analytics', comingSoon: true },
  { src: '/landing/logos/gmail_logo.png', alt: 'Gmail', comingSoon: true },
  { src: '/landing/logos/sentry_logo.png', alt: 'Sentry', comingSoon: false },
  { src: '/landing/logos/notion_logo.png', alt: 'Notion', comingSoon: true },
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
  return (
    <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: '120px' }}>
      <ViewCard view={fakeView('ph1', 'user_signed_up', 'posthog', '2841')} onUntrack={() => {}} />
      <ViewCard view={fakeView('ph2', 'project_created', 'posthog', '834')} onUntrack={() => {}} />
      <ViewCard view={fakeView('ph3', 'api_call', 'posthog', '48203')} onUntrack={() => {}} />
      <ViewCard
        view={fakeView('ph4', 'payment_completed', 'posthog', '1293')}
        onUntrack={() => {}}
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
  () => (
    <SimpleStatsPreview
      connectionType="custom"
      stats={[
        { name: 'Sessions', value: '14820' },
        { name: 'Users', value: '9301' },
        { name: 'Bounce Rate', value: '42' },
        { name: 'Avg. Duration', value: '184' },
      ]}
    />
  ),
  () => (
    <SimpleStatsPreview
      connectionType="gmail"
      stats={[
        { name: 'Received Today', value: '47' },
        { name: 'Unread', value: '12' },
      ]}
    />
  ),
  () => (
    // Sentry preview — error / issue counters that read like the
    // metrics a Databerry user would actually wire up once they
    // connect Sentry. Numbers small enough to feel plausible for a
    // mid-sized SaaS; high enough to be visible.
    <SimpleStatsPreview
      connectionType="sentry"
      stats={[
        { name: 'Errors today', value: '142' },
        { name: 'Unresolved', value: '38' },
        { name: 'New issues', value: '6' },
        { name: 'Crash-free rate', value: '99' },
      ]}
    />
  ),
  () => (
    <SimpleStatsPreview
      connectionType="custom"
      stats={[
        { name: 'Pages', value: '312' },
        { name: 'Edits Today', value: '28' },
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
    <div className="dashboard w-full rounded-2xl border-2 border-white/50 bg-white/10 backdrop-blur-sm overflow-hidden p-4">
      <div className="w-full min-h-[300px] md:min-h-[420px] rounded-xl overflow-hidden p-3 flex items-center justify-center">
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
