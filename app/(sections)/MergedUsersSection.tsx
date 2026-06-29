'use client'

/**
 * "Merged users across all analytics tools" landing section.
 *
 * Sibling of `<AgentModeSection>` — same calm static card (no
 * scroll-scale choreography), same glass wrapper + floating badge —
 * but the body hosts `<PeopleShowcase>`: an auto-playing People table
 * that opens a person's event-timeline bottom sheet, scrolls it, and
 * loops. The story: every tool's events (Stripe, PostHog, Google
 * Analytics) collapsed into ONE profile per person.
 */

import { PeopleShowcase } from '@/app/(components)/PeopleShowcase'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'

const MergedUsersSection = () => {
  return (
    <section
      id="merged-users"
      className="relative px-4 md:px-[10vw] py-32 bg-gradient-to-b from-white via-gray-50 to-white overflow-x-clip"
    >
      {/* Header cluster — H2 + subhead, centred. Mirrors the Agent
          mode section exactly (no eyebrow; the floating badge on the
          card signals "feature demo"). */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
        <RevealOnScroll delay={0} y={16}>
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900"
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            Merged users across all analytics tools
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={0.05} y={16}>
          <p
            className="mt-5 text-base leading-relaxed text-gray-500 max-w-xl"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            One person, one profile — no matter how many tools saw them. Databerry
            stitches Stripe customers, PostHog visitors, and Google Analytics
            sessions into a single identity, with every event they triggered on one
            timeline.
          </p>
        </RevealOnScroll>
      </div>

      {/* Showcase card — identical chrome to `<AgentModeSection>`. */}
      <RevealOnScroll delay={0.1} y={20}>
        <div className="mt-14 mx-auto max-w-4xl">
          <div className="border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] rounded-2xl">
            <div className="bg-white/35 rounded-2xl overflow-hidden">
              <div className="flex justify-center py-3">
                <MergedUsersBadge />
              </div>

              <div className="mx-3 mb-3 rounded-xl overflow-hidden bg-white border border-stroke shadow-card">
                <div className="h-[440px] md:h-[480px] xl:h-[520px]">
                  <PeopleShowcase />
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}

export default MergedUsersSection

const MergedUsersBadge = () => {
  // Same chip chrome as `<AgentModeBadge>` / `<DemoBadge>` so the
  // showcase cards read as one family.
  return (
    <span className="inline-flex items-center rounded-full bg-white/25 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)] p-1">
      <span className="rounded-full bg-white px-4 py-1 text-xs font-light text-black whitespace-nowrap">
        Merged profiles
      </span>
    </span>
  )
}

