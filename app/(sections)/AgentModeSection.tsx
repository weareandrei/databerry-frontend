'use client'

/**
 * "Agent mode" landing section.
 *
 * Layout (top to bottom):
 *   1. Eyebrow + H2 + subhead — same typography as the other
 *      landing sections (Bricolage Grotesque heading, orange-500
 *      eyebrow, gray-500 body copy). Centred.
 *   2. Card wrapper — visually consistent with `<DemoSection>`'s
 *      sticky card, but STATIC (no scroll-driven scale animation):
 *        - Outer: `border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)]`
 *          + `rounded-2xl`.
 *        - Inner: `bg-white/35` translucent layer that picks up
 *          whatever the section background is showing (matches the
 *          interactive demo's "glass" feel).
 *        - Badge: "Agent mode" pill floating at the top of the
 *          inner card.
 *        - Body: a fixed-height white surface hosting
 *          `<AgentModeShowcase>` (the auto-playing chat).
 *
 * Why a static card and not the DemoSection-style sticky/scroll-scale
 * setup: the interactive demo earns its scroll choreography because
 * it IS the page's main attraction (visitors interact with it). This
 * section is a feature showcase — a calmer card that just plays a
 * short story is the right register.
 */

import { AgentModeShowcase } from '@/app/(components)/AgentModeShowcase'
import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'

function AgentModeBadge() {
  // Same chip chrome the `<DemoBadge>` in `DemoSection.tsx` uses
  // (rounded-full white-on-white-25 with a soft glow) so the two
  // cards read as the same family.
  return (
    <span className="inline-flex items-center rounded-full bg-white/25 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)] p-1">
      <span className="rounded-full bg-white px-4 py-1 text-xs font-light text-black whitespace-nowrap">
        Agent mode
      </span>
    </span>
  )
}

export default function AgentModeSection() {
  return (
    // `px-[10vw] py-32` matches FAQ + Features (the calm
    // mid-page sections). `overflow-x-clip` guards against any
    // wide content inside accidentally widening the page.
    //
    // Section background is a soft gradient (white → very light
    // gray → white) so the `bg-white/35` translucent wrapper inside
    // has SOMETHING to be translucent OVER. On a flat white section
    // the glass effect is invisible.
    <section
      id="agent-mode"
      className="relative px-4 md:px-[10vw] py-32 bg-gradient-to-b from-white via-surface to-white overflow-x-clip"
    >
      {/* Header cluster — H2 + subhead, centred. The orange "Demo"
          eyebrow was removed at the user's request; the floating
          "Agent mode" badge on the showcase card below already
          signals that this is a feature demo, so the eyebrow was
          redundant. Reveal delays on the heading/subhead start at
          0 / 0.05 now so the cluster lands without an empty beat
          where the eyebrow used to enter. */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
        <RevealOnScroll delay={0} y={16}>
          <h2
            className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-bricolage)' }}
          >
            Agent mode
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={0.05} y={16}>
          <p
            className="mt-5 text-base leading-relaxed text-muted-foreground max-w-xl"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Ask anything about your business in plain English. Agent mode
            routes to the right tool — Stripe, Google Analytics, PostHog,
            or any MCP server you connect — and answers with real data, not
            paragraphs.
          </p>
        </RevealOnScroll>
      </div>

      {/* Showcase card. Centred, capped at `max-w-4xl` so the chat
          surface stays at a comfortable reading width on wide
          monitors. Margin-top separates it from the header copy. */}
      <RevealOnScroll delay={0.1} y={20}>
        <div className="mt-14 mx-auto max-w-4xl">
          <div className="border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] rounded-2xl">
            <div className="bg-white/35 rounded-2xl overflow-hidden">
              {/* Badge sits in its own row at the top of the inner
                  translucent layer — same placement as the
                  interactive demo so the family resemblance is
                  immediate. */}
              <div className="flex justify-center py-3">
                <AgentModeBadge />
              </div>

              {/* Body — solid white surface that hosts the chat. The
                  fixed height keeps the section a predictable size on
                  every viewport so the surrounding page layout stays
                  calm. `xl`/`2xl` step up modestly so the chat has
                  more breathing room on big monitors without the
                  section becoming a wall. */}
              <div className="mx-3 mb-3 rounded-xl overflow-hidden bg-white border border-stroke shadow-card">
                <div className="h-[440px] md:h-[480px] xl:h-[520px]">
                  <AgentModeShowcase />
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}
