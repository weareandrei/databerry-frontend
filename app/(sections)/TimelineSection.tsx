'use client'

/**
 * "It knows everything that happens" landing section.
 *
 * Sibling of `<MergedUsersSection>` — same calm static card (no
 * scroll-scale choreography), same glass wrapper + floating badge —
 * but the body hosts `<TimelineShowcase>`: an auto-playing project
 * Timeline that scrolls mixed event cards (visit → login → purchase,
 * signup journeys, Stripe connects), packs concurrent activity into
 * horizontal columns, expands one, and loops. The story: every
 * visitor's events across your tools on one time axis.
 */

import { TimelineShowcase } from '@/app/(components)/TimelineShowcase'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'

const TimelineSection = () => {
  return (
    <section
      id="timeline"
      className="relative px-4 md:px-[10vw] py-32 bg-gradient-to-b from-white via-surface to-white overflow-x-clip"
    >
      {/* Header cluster — H2 + subhead, centred. Mirrors the Merged
          users section exactly (no eyebrow; the floating badge on the
          card signals "feature demo"). */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
        <RevealOnScroll delay={0} y={16}>
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            It knows everything that happens
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={0.05} y={16}>
          <p
            className="mt-5 text-base leading-relaxed text-muted-foreground max-w-xl"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            See who visited, signed up, and purchased — every event across
            your tools on one timeline, packed by time so concurrent activity
            sits side by side.
          </p>
        </RevealOnScroll>
      </div>

      {/* Showcase card — identical chrome to `<MergedUsersSection>`. */}
      <RevealOnScroll delay={0.1} y={20}>
        <div className="mt-14 mx-auto max-w-4xl">
          <div className="border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] rounded-2xl">
            <div className="bg-white/35 rounded-2xl overflow-hidden">
              <div className="flex justify-center py-3">
                <TimelineBadge />
              </div>

              <div className="mx-3 mb-3 rounded-xl overflow-hidden bg-white border border-stroke shadow-card">
                <div className="h-[440px] md:h-[480px] xl:h-[520px]">
                  <TimelineShowcase />
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}

export default TimelineSection

const TimelineBadge = () => {
  // Same chip chrome as `<MergedUsersBadge>` / `<AgentModeBadge>` so the
  // showcase cards read as one family.
  return (
    <span className="inline-flex items-center rounded-full bg-white/25 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)] p-1">
      <span className="rounded-full bg-white px-4 py-1 text-xs font-light text-black whitespace-nowrap">
        /timeline
      </span>
    </span>
  )
}
