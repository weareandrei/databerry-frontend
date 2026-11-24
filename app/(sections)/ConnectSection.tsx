'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Clock } from '@phosphor-icons/react'
import { useReducedMotion } from 'framer-motion'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'
import { CtaButton } from '@/components/ui/CtaButton'
import { ChartWidget } from '@/app/hub/(components)/widgets/chart/ChartWidget'
import { ListWidget } from '@/app/hub/(components)/widgets/list/ListWidget'
import { FunnelWidget } from '@/app/hub/(components)/widgets/funnel/FunnelWidget'
import { SentryIssuesWidget } from '@/app/hub/(components)/widgets/sentry/SentryIssuesWidget'
import {
  MOCK_POSTHOG_FUNNEL,
  MOCK_SENTRY_ISSUES_ACME,
} from '@/app/(components)/InteractableDemo/(components)/demoMocks'
import {
  DemoTile,
  demoWidget,
  GA_WEEK,
  GA_WEEK_TOTAL,
  SHOWCASE_WIDGETS,
  STRIPE_WEEK,
  STRIPE_WEEK_TOTAL,
  useNearViewport,
} from '@/app/(components)/landingWidgets'
import type { CalendlyMeeting } from '@/lib/api'

/** How long each integration stays on stage before the next one takes over. */
const ADVANCE_MS = 4500

const ConnectSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const { activeIndex, select, setHovering } = useShowcaseRotation(sectionRef)
  const widgetsReady = useNearViewport(sectionRef)

  return (
    <section
      ref={sectionRef}
      data-canvas-window
      className="relative z-30 flex min-h-screen items-center px-6 py-24 md:px-[10vw]"
    >
      <div className="flex w-full flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex flex-col gap-6 lg:w-[45%]">
          {/* Same ink-and-white pairing as the hero: black sets the line
              up, white lands it. */}
          <RevealOnScroll delay={0}>
            <h2
              className="text-balance text-4xl font-bold leading-[1.1] tracking-[-0.04em] text-black md:text-5xl md:leading-[1.05] xl:text-6xl"
              style={{ fontFamily: 'var(--font-bricolage)' }}
            >
              Connect your <br className="hidden md:block" />
              <span className="text-white">business systems</span>
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={0.1}>
            <p className="max-w-md text-base leading-[1.45] text-black md:text-lg">
              Integrate business data from any platform you work with into a single page. See only
              data that matters.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.18}>
            <CtaButton href="/hub/connections">View connections</CtaButton>
          </RevealOnScroll>

          <RevealOnScroll delay={0.26}>
            <IntegrationPicker activeIndex={activeIndex} onSelect={select} />
          </RevealOnScroll>
        </div>

        <RevealOnScroll delay={0.18} className="min-w-0 lg:flex-1">
          <IntegrationStage
            activeIndex={activeIndex}
            onHoverChange={setHovering}
            ready={widgetsReady}
          />
        </RevealOnScroll>
      </div>
    </section>
  )
}

export default ConnectSection

interface IntegrationPickerProps {
  activeIndex: number
  onSelect: (index: number) => void
}

const IntegrationPicker = ({ activeIndex, onSelect }: IntegrationPickerProps) => {
  return (
    <div className="mt-2 grid w-fit grid-cols-4 gap-4 md:gap-6">
      {INTEGRATIONS.map((integration, index) => {
        const active = index === activeIndex
        const planned = integration.planned != null

        return (
          <button
            key={integration.name}
            type="button"
            onClick={() => onSelect(index)}
            aria-pressed={active}
            aria-label={planned ? `${integration.name} (coming soon)` : integration.name}
            // The selected logo is simply bigger and at full strength; the
            // rest sit back at 70% until hovered.
            className={`relative rounded-[18px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] outline-offset-[3px] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white ${
              active ? 'scale-110' : 'opacity-70 hover:scale-105 hover:opacity-100'
            }`}
          >
            <Image
              src={integration.logo}
              alt=""
              width={64}
              height={64}
              className="rounded-[14px]"
            />
            {planned && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-black text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]">
                <Clock size={12} weight="bold" aria-hidden />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface IntegrationStageProps {
  activeIndex: number
  onHoverChange: (hovering: boolean) => void
  /** Widgets mount once the section is nearly on screen — see `useNearViewport`. */
  ready: boolean
}

/**
 * Every integration's widgets stay mounted and stacked in the same box; only
 * the active one is shown. Swapping is then a cross-fade of things that
 * already exist — no charts are torn down and rebuilt on each turn, and the
 * box never changes size under the page (it holds its height while empty,
 * too, before the widgets mount).
 */
const IntegrationStage = ({ activeIndex, onHoverChange, ready }: IntegrationStageProps) => {
  return (
    <div
      className={`${SHOWCASE_WIDGETS} relative mx-auto h-[392px] w-full max-w-[600px] lg:h-[496px] xl:h-[452px]`}
      onPointerEnter={e => {
        // Touch has no "leave", so only a mouse can hold the rotation.
        if (e.pointerType === 'mouse') onHoverChange(true)
      }}
      onPointerLeave={() => onHoverChange(false)}
    >
      {ready &&
        INTEGRATIONS.map((integration, index) => {
          const active = index === activeIndex

          return (
            <div
              key={integration.name}
              data-active={active}
              inert={!active}
              className="group/slide invisible absolute inset-0 opacity-0 transition-[opacity,visibility] duration-150 ease-out data-[active=true]:visible data-[active=true]:opacity-100"
            >
              {integration.planned ? (
                <PlannedIntegration integration={integration} />
              ) : (
                integration.widgets
              )}
            </div>
          )
        })}
    </div>
  )
}

/**
 * Shared by every piece on the stage: resting state is slightly low, small
 * and transparent; when its slide becomes active it rises into place. Leaving
 * is quick (150ms), arriving takes its time (500ms) — and each piece adds
 * its own delay so a cluster lands as a sequence, not a block.
 */
const PIECE =
  'opacity-0 translate-y-3 scale-[0.97] transition-[opacity,translate,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ' +
  'group-data-[active=true]/slide:opacity-100 group-data-[active=true]/slide:translate-y-0 group-data-[active=true]/slide:scale-100 group-data-[active=true]/slide:duration-500 ' +
  'motion-reduce:translate-y-0 motion-reduce:scale-100'

interface WidgetClusterProps {
  main: React.ReactNode
  /** Small tiles that overlap the main card's corners. Omit for a card that
   *  stands alone. */
  corners?: [React.ReactNode, React.ReactNode]
}

/**
 * One main widget with two tilted tiles hanging off opposite corners — the
 * same loose stack of cards the product video opens on. On narrow screens the
 * tiles sit side by side along the bottom edge instead.
 *
 * How far the top tile bites into the main card depends on the room: on a
 * small laptop (`lg`) the stage is narrow enough that a deep overlap would
 * cover the card's title, so the tile only clips its top edge; from `xl` it
 * sits well into the corner.
 */
const WidgetCluster = ({ main, corners }: WidgetClusterProps) => {
  if (!corners) {
    return (
      <div
        className={`${PIECE} h-[368px] group-data-[active=true]/slide:delay-[40ms] lg:absolute lg:inset-x-[3%] lg:inset-y-0 lg:my-auto lg:h-[380px]`}
      >
        {main}
      </div>
    )
  }

  const [topRight, bottomLeft] = corners

  return (
    <>
      <div
        className={`${PIECE} h-[284px] group-data-[active=true]/slide:delay-[40ms] lg:absolute lg:inset-x-[7%] lg:top-[96px] lg:h-[312px] xl:top-[52px]`}
      >
        {main}
      </div>

      <div className="relative z-10 -mt-3 grid grid-cols-2 gap-3 px-2 lg:contents">
        <div
          className={`${PIECE} z-10 h-[104px] rotate-[-2deg] group-data-[active=true]/slide:delay-[110ms] lg:absolute lg:right-0 lg:top-0 lg:w-[38%] lg:min-w-[184px] lg:rotate-[3deg]`}
        >
          {topRight}
        </div>
        <div
          className={`${PIECE} z-10 h-[104px] rotate-[2deg] group-data-[active=true]/slide:delay-[170ms] lg:absolute lg:bottom-0 lg:left-0 lg:w-[38%] lg:min-w-[184px] lg:rotate-[-2.5deg]`}
        >
          {bottomLeft}
        </div>
      </div>
    </>
  )
}

/**
 * An integration that isn't built yet. Dashed outline instead of a solid
 * card, and the widgets it will bring listed by name with no numbers — a
 * plan, not a preview of data that doesn't exist.
 */
const PlannedIntegration = ({ integration }: { integration: Integration }) => {
  return (
    <div className="flex h-full items-start justify-center pt-6 lg:items-center lg:pt-0">
      <div
        className={`${PIECE} relative w-full max-w-[440px] rounded-2xl border-2 border-dashed border-white/80 bg-white/10 p-7 group-data-[active=true]/slide:delay-[40ms]`}
      >
        <span
          className={`${PIECE} absolute -top-4 right-5 rotate-[-6deg] whitespace-nowrap rounded-xl bg-white px-4 py-2 text-sm font-bold text-secondary shadow-[0_8px_20px_rgba(0,0,0,0.2)] group-data-[active=true]/slide:delay-[160ms]`}
        >
          Coming soon
        </span>

        <div className="flex items-center gap-4">
          <span className="shrink-0 rounded-[16px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
            <Image
              src={integration.logo}
              alt=""
              width={56}
              height={56}
              className="rounded-[12px]"
            />
          </span>
          <div>
            <h3
              className="text-2xl font-semibold leading-tight tracking-tight text-white"
              style={{ fontFamily: 'var(--font-bricolage)' }}
            >
              {integration.name}
            </h3>
            <p className="mt-0.5 text-sm text-black">Integration is on the way</p>
          </div>
        </div>

        <ul className="mt-6 border-t border-dashed border-white/60">
          {integration.planned?.map(name => (
            <li
              key={name}
              className="flex items-center justify-between border-b border-dashed border-white/60 py-3 text-sm font-medium text-black"
            >
              {name}
              {/* Where the number will be. */}
              <span aria-hidden className="h-0.5 w-6 rounded-full bg-black/60" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Turns the stage to the next integration every few seconds. The turn waits
 * while the section is off screen, while a mouse is over the stage (so a
 * funnel step or a chart bar can be inspected), and for visitors who ask for
 * reduced motion — they switch by clicking a logo instead.
 */
const useShowcaseRotation = (sectionRef: React.RefObject<HTMLElement | null>) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [inView, setInView] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.25,
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [sectionRef])

  const paused = !inView || hovering || reducedMotion

  // `activeIndex` is a dependency on purpose: picking a logo by hand
  // restarts the wait, so the choice gets its full time on stage.
  useEffect(() => {
    if (paused) return

    const timer = window.setTimeout(
      () => setActiveIndex(index => (index + 1) % INTEGRATIONS.length),
      ADVANCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [paused, activeIndex])

  return { activeIndex, select: setActiveIndex, setHovering }
}

// ─── demo data ────────────────────────────────────────────────────────────────

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

interface Integration {
  name: string
  logo: string
  /** Live integrations: the widgets shown on stage. */
  widgets?: React.ReactNode
  /** Integrations still being built: the widgets they will bring. */
  planned?: string[]
}

// Every widget below is a view type the product really offers for that
// integration (see `constants/viewOptions.ts`). Sentry has one — the issues
// list — so it takes the stage alone.
const INTEGRATIONS: Integration[] = [
  {
    name: 'Stripe',
    logo: '/landing/logos/stripe_logo.png',
    widgets: (
      <WidgetCluster
        main={
          <ChartWidget
            view={demoWidget('This Week Gross Volume', 'stripe_manual', 'stripe_gross_week')}
            points={STRIPE_WEEK}
            total={STRIPE_WEEK_TOTAL}
            loading={false}
            error={null}
          />
        }
        corners={[
          <DemoTile
            key="subs"
            view={demoWidget('Active subs', 'stripe_manual', 'stripe_active_subs', '214')}
          />,
          <DemoTile
            key="churn"
            view={demoWidget('Churn Rate', 'stripe_manual', 'stripe_churn_rate', '2.4')}
          />,
        ]}
      />
    ),
  },
  {
    name: 'PostHog',
    logo: '/landing/logos/posthog_logo.png',
    widgets: (
      <WidgetCluster
        main={
          <FunnelWidget
            view={demoWidget('Sign-up funnel', 'posthog', 'posthog_funnel')}
            onUntrack={() => {}}
            onPin={() => {}}
            isPinned={false}
            steps={MOCK_POSTHOG_FUNNEL}
            loading={false}
            error={null}
            dense
          />
        }
        corners={[
          <DemoTile
            key="signed-up"
            view={demoWidget('Signed up', 'posthog', 'daily_counter', '128')}
          />,
          <DemoTile key="trials" view={demoWidget('Trials', 'posthog', 'daily_counter', '31')} />,
        ]}
      />
    ),
  },
  {
    name: 'Calendly',
    logo: '/landing/logos/calendly_logo.png',
    widgets: (
      <WidgetCluster
        main={
          <ListWidget
            view={demoWidget("Today's Calls", 'calendly', 'calendly_meetings_list')}
            meetings={CALENDLY_MEETINGS}
            loading={false}
            error={null}
          />
        }
        corners={[
          <DemoTile
            key="today"
            view={demoWidget('Meetings', 'calendly', 'calendly_meetings_today', '3')}
          />,
          <DemoTile
            key="week"
            view={demoWidget('This week', 'calendly', 'calendly_meetings_today', '14')}
          />,
        ]}
      />
    ),
  },
  {
    name: 'Google Analytics',
    logo: '/landing/logos/ga4_logo.png',
    widgets: (
      <WidgetCluster
        main={
          <ChartWidget
            view={demoWidget('Sessions this week', 'google_analytics', 'ga_sessions_week')}
            points={GA_WEEK}
            total={GA_WEEK_TOTAL}
            loading={false}
            error={null}
          />
        }
        corners={[
          <DemoTile
            key="active"
            view={demoWidget('Active now', 'google_analytics', 'ga_active_users', '42')}
          />,
          <DemoTile
            key="pageviews"
            view={demoWidget('Pageviews', 'google_analytics', 'ga_pageviews_today', '18430')}
          />,
        ]}
      />
    ),
  },
  {
    name: 'Gmail',
    logo: '/landing/logos/gmail_logo.png',
    planned: ['Received today', 'Unread'],
  },
  {
    name: 'Sentry',
    logo: '/landing/logos/sentry_logo.png',
    widgets: (
      <WidgetCluster
        main={
          <SentryIssuesWidget
            view={demoWidget('Errors', 'sentry', 'sentry_issues_list')}
            onUntrack={() => {}}
            onPin={() => {}}
            isPinned={false}
            issues={MOCK_SENTRY_ISSUES_ACME}
            loading={false}
            error={null}
            period="7d"
            sort="frequent"
          />
        }
      />
    ),
  },
  {
    name: 'Notion',
    logo: '/landing/logos/notion_logo.png',
    planned: ['Pages', 'Edits today'],
  },
  {
    name: 'Datafast',
    logo: '/connections/datafast_icon.png',
    planned: ['Visitors', 'Page views'],
  },
]
