'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ViewCard } from '@/components/dashboard/ViewCard'
import { ViewCardChart } from '@/components/dashboard/ViewCardChart'
import { ViewCardList } from '@/components/dashboard/ViewCardList'
import type { View } from '@/types/view'
import type { CalendlyMeeting } from '@/lib/api'

const LOGOS = [
  { src: '/landing/logos/stripe_logo.png', alt: 'Stripe', comingSoon: false },
  { src: '/landing/logos/posthog_logo.png', alt: 'PostHog', comingSoon: false },
  { src: '/landing/logos/calendly_logo.png', alt: 'Calendly', comingSoon: false },
  { src: '/landing/logos/ga4_logo.png', alt: 'Google Analytics', comingSoon: true },
  { src: '/landing/logos/gmail_logo.png', alt: 'Gmail', comingSoon: true },
  { src: '/landing/logos/mailchimp_logo.png', alt: 'Mailchimp', comingSoon: true },
  { src: '/landing/logos/notion_logo.png', alt: 'Notion', comingSoon: true },
]

function fakeView(id: string, name: string, connectionType: string, value: string | null): View {
  return {
    id,
    name,
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
    invitees: [{ name: 'Alice Johnson', email: 'alice@example.com' }],
  },
  {
    startTime: `${TODAY}T11:00:00Z`,
    endTime: `${TODAY}T11:45:00Z`,
    name: 'Product Demo',
    bookingUri: '#',
    invitees: [{ name: 'Bob Smith', email: 'bob@example.com' }],
  },
  {
    startTime: `${TODAY}T14:30:00Z`,
    endTime: `${TODAY}T15:00:00Z`,
    name: 'Strategy Review',
    bookingUri: '#',
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
    <SimpleStatsPreview
      connectionType="custom"
      stats={[
        { name: 'Subscribers', value: '8420' },
        { name: 'Open Rate', value: '31' },
        { name: 'Clicks', value: '740' },
        { name: 'Unsubscribes', value: '14' },
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

  return (
    <section className="relative z-30 flex flex-row items-center gap-16 px-[10vw] py-24 min-h-screen">
      {/* Left column */}
      <div className="flex flex-col w-[45%] gap-6">
        <h2
          className="text-6xl font-bold leading-[1.05] tracking-[-0.04em]"
          style={{ fontFamily: 'var(--font-bricolage)' }}
        >
          <span className="text-white">Connect your</span>
          <br />
          <span className="text-white">business systems</span>
        </h2>

        <p className="text-base text-white/70 leading-relaxed max-w-sm">
          Integrate business data from any platform you work with into a single page. See only data
          that matters.
        </p>

        <Link
          href="/hub/connections"
          className="w-fit rounded-xl bg-white px-6 py-3 text-sm font-medium text-gray-900 shadow-sm hover:bg-white/90 transition-colors"
        >
          View connections
        </Link>

        {/* Logo grid */}
        <div className="mt-4 grid grid-cols-4 gap-6 w-fit">
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
      </div>

      {/* Right — preview card */}
      <div className="flex-1 self-stretch flex items-center">
        <div className="w-full rounded-2xl border-2 border-white/50 bg-white/10 backdrop-blur-sm overflow-hidden p-4">
          <div className="w-full min-h-[420px] rounded-xl overflow-hidden p-3 flex items-center justify-center">
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
      </div>
    </section>
  )
}

export default ConnectSection
