'use client'
import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import InteractableDemo from '@/app/(components)/InteractableDemo/InteractableDemo'
import { useMobileBreakpoint } from '@/hooks/useMobileBreakpoint'

function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-white/25 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)] p-1">
      <span className="rounded-full bg-white px-4 py-1 text-xs font-light text-black whitespace-nowrap">
        Interactable demo
      </span>
    </span>
  )
}

interface DemoCardProps {
  cardRef: React.RefObject<HTMLDivElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  topOffset: number
  stickyTop: number
}

function DemoCard({ cardRef, containerRef, topOffset, stickyTop }: DemoCardProps) {
  const isMobile = useMobileBreakpoint()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const scale = useTransform(scrollYProgress, [0, 0.4, 0.7, 1], [1, 1.1, 1.2, 1.25])
  const badgeOpacity = useTransform(scrollYProgress, [0.5, 0.9], [1, 0])
  const badgeY = useTransform(scrollYProgress, [0.5, 0.9], [0, -16])
  const spacerHeight = useTransform(scrollYProgress, [0.5, 0.9], [48, 0])
  // Mobile-only: flatten the corners as the card scales out to meet the
  // viewport edges (`w-[80vw]` × scale 1.25 = 100vw at max scroll). Rounded
  // corners would read as a clipping artefact against a flush edge.
  // 18px = the `rounded-2xl` value in this project's theme
  // (var(--radius-2xl) = 0.625rem × 1.8 = 1.125rem).
  const borderRadius = useTransform(scrollYProgress, [0, 1], isMobile ? [18, 0] : [18, 18])

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 h-[calc(100%+var(--demo-offset,250px))]"
      style={{
        top: -topOffset,
        ['--demo-offset' as string]: `${topOffset}px`,
      }}
    >
      {/* Width tiers:
            - default `w-[80vw]`: calibrated against the 1.25× scale max so the card reaches exactly 100vw (edge-to-edge, zero side gap) at full scroll. If you change either side, keep `mobile-width × scale-max = 100vw`.
            - md+: pinned to `w-2xl` design width
            - xl+: scales with viewport at `72vw` for wide-screen breathing room
            - 3xl+ (≥112rem viewport): caps at `w-8xl` (88rem = 1408px) so the card stops growing on huge displays
          Custom `3xl` breakpoint and `8xl` container live in `globals.css`. */}
      <div className="sticky z-[20] mx-auto w-[80vw] md:w-2xl xl:w-[72vw] 3xl:w-8xl pb-24" style={{ top: stickyTop }}>
        <motion.div
          ref={cardRef}
          style={{ scale, borderRadius }}
          className="border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-center"
        >
          {/* Inner div needs to be a motion component too: it carries the
              `overflow-hidden` clip that crops the dashboard's square edges
              against the card's rounded corners. If only the outer corners
              animate, the inner clip stays rounded and the demo content
              keeps cropped corners after the card has gone square. */}
          <motion.div style={{ borderRadius }} className="bg-white/35 overflow-hidden">
            {isMobile ? (
              <div className="relative">
                <motion.div style={{ height: spacerHeight }} />
                <motion.div
                  className="absolute inset-x-0 top-0 flex justify-center py-3 pointer-events-none"
                  style={{ opacity: badgeOpacity, y: badgeY }}
                >
                  <DemoBadge />
                </motion.div>
              </div>
            ) : (
              <div className="flex justify-center py-3">
                <DemoBadge />
              </div>
            )}

            {/* Height steps up with each width breakpoint so the card stays
                roughly 2:1–2.3:1 aspect at every tier — paired widths shown for context:
                  default w-full / md w-4xl (896px) → 440px         (≈2:1)
                  xl      w-[84vw] (~1075–1505px) → 500px           (~2.15–3:1, drifts a bit)
                  2xl     w-[84vw] (~1290–1505px) → 560px           (~2.3:1)
                  3xl     w-8xl    (1408px fixed) → 620px           (≈2.27:1)
                Kept as discrete fixed heights (not an aspect-ratio rule) so the
                card stays comfortably shorter than vh at every breakpoint — the
                scroll-driven `scale` animation grows the card to 1.25× and we
                need room above/below for that without overflowing the viewport. */}
            {/* Mobile base height bumped from 440px → 506px (+15%) so
                the phone preview reads as a substantial surface; xl+
                tiers untouched since they were already sized off the
                wider viewport. */}
            <div className="dashboard h-[506px] xl:h-[500px] 2xl:h-[560px] 3xl:h-[620px] p-4 pt-0">
              <InteractableDemo />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

function useDemoLayout(cardRef: React.RefObject<HTMLDivElement | null>) {
  const [topOffset, setTopOffset] = useState(250)
  const [stickyTop, setStickyTop] = useState(200)

  useEffect(() => {
    function calculate() {
      const vh = window.innerHeight
      const cardHeight = cardRef.current?.getBoundingClientRect().height ?? 500
      const isMobile = window.innerWidth < 768

      const anchorId = isMobile ? 'm-demo-anchor' : 'demo-anchor'
      const anchor = document.getElementById(anchorId)
      const section = document.getElementById('second-section')
      if (!anchor || !section) return

      const scrollY = window.scrollY
      const anchorBottom = anchor.getBoundingClientRect().bottom + scrollY
      const sectionTop = section.getBoundingClientRect().top + scrollY

      setTopOffset(sectionTop - anchorBottom)
      setStickyTop(isMobile ? vh * 0.35 : (150 + (vh - cardHeight) * 0.3))
    }

    calculate()
    window.addEventListener('resize', calculate)
    // Re-measure after hero entrance animation finishes
    // (heroFade delay 1.5s + duration 0.7s = 2.2s)
    const animationTimer = setTimeout(calculate, 2300)

    const hero = document.querySelector<HTMLElement>('section')
    const ro = new ResizeObserver(calculate)
    if (hero) ro.observe(hero)

    return () => {
      clearTimeout(animationTimer)
      window.removeEventListener('resize', calculate)
      ro.disconnect()
    }
  }, [cardRef])

  return { topOffset, stickyTop }
}

const DemoSection = () => {
  const cardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { topOffset, stickyTop } = useDemoLayout(cardRef)

  return (
    <section
      id="second-section"
      className="relative px-12 flex flex-col items-center text-center bg-white py-24 overflow-x-clip"
    >
      {/*<h1*/}
      {/*  className="max-w-4xl text-6xl font-semibold leading-[1.05] tracking-[-0.06em] text-gray-900"*/}
      {/*  style={{ fontFamily: 'var(--font-bricolage)' }}*/}
      {/*>*/}
      {/*  Start using in one click*/}
      {/*</h1>*/}

      {/*<h4*/}
      {/*  className="mt-5 max-w-xl text-lg font-normal leading-[1.4] tracking-[0.01em] text-gray-500"*/}
      {/*  style={{ fontFamily: 'var(--font-inter)' }}*/}
      {/*>*/}
      {/*  It's unbelievably easy to set up.*/}
      {/*</h4>*/}

      {/* This spacer sets the section's height, which feeds `containerRef`'s
          height (section + 250px). Framer Motion's useScroll with
          `offset: ['start start', 'end end']` only progresses 0→1 in the
          scroll direction when the target is TALLER than the viewport — if
          it's shorter, the two boundary events fire in reverse order and
          scrollYProgress runs 1→0, making the demo card visibly shrink as
          the user scrolls down. On 1080px-tall screens the old md:h-[600px]
          gave a 1042px container (< 1080), so the animation reversed.
          `xl:h-[80vh]` keeps the section taller than the viewport on every
          common large screen (1080/1440/2160 tall). */}
      <div className="h-[550px] md:h-[600px] xl:h-[80vh] py-24" />

      <DemoCard
        cardRef={cardRef}
        containerRef={containerRef}
        topOffset={topOffset}
        stickyTop={stickyTop}
      />
    </section>
  )
}

export default DemoSection
