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

  // Desktop grows the card on scroll (1 → 1.18×). The growth FINISHES by
  // ~55% of the scroll and holds, so the side-padding melt (below) runs
  // AFTER it rather than at the same time — the two were fighting
  // (transform vs. layout) and read as a lag when overlapped. Mobile does
  // NOT grow — it stays pinned at a fixed wide 1.25× the whole way down
  // (that value just sizes the mobile card; it isn't the scroll zoom).
  const scale = useTransform(
    scrollYProgress,
    [0, 0.2, 0.4, 0.55],
    isMobile ? [1.25, 1.25, 1.25, 1.25] : [1, 1.07, 1.14, 1.15],
  )
  const badgeOpacity = useTransform(scrollYProgress, [0.5, 0.9], [1, 0])
  const badgeY = useTransform(scrollYProgress, [0.5, 0.9], [0, -16])
  const spacerHeight = useTransform(scrollYProgress, [0.5, 0.9], [48, 0])
  // Corners stay rounded at every scroll position. (Previously the mobile
  // card flattened to square as it scaled out to a flush 100vw edge; the
  // demo was since shrunk ~12.5%, so it no longer reaches the viewport
  // edges and a rounded inset card reads cleaner than a square one with a
  // side gap.) 18px = this project's `rounded-2xl`.
  const borderRadius = useTransform(scrollYProgress, [0, 1], [18, 18])
  // Desktop: the dashboard's left/right inset melts from 16px → 0, but only
  // AFTER the resize above has finished (it runs over [0.55, 0.9], picking
  // up where `scale` stops). Sequencing it this way — grow first, then
  // expand to fill — avoids running a layout animation (padding) at the
  // same time as the transform animation (scale), which felt laggy. Mobile
  // is left untouched (the card doesn't resize there, so the inset stays).
  const sidePadding = useTransform(
    scrollYProgress,
    [0.55, 0.9],
    isMobile ? [16, 16] : [16, 0],
  )

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 h-[calc(100%+var(--demo-offset,250px))]"
      style={{
        top: -topOffset,
        ['--demo-offset' as string]: `${topOffset}px`,
      }}
    >
      {/* Width tiers. Mobile/base sits ~12.5% under the original
          calibration; the desktop tiers (md+) are pulled in a further ~12%
          so the card reads a touch narrower on wide screens (heights
          unchanged). The scroll-driven `scale` still grows the DESKTOP card
          1→1.25×; mobile is pinned at 1.25× (see `scale` above), so its
          layout box stays `w-[70vw]` while rendering ~88vw wide.
            - default `w-[70vw]`  (mobile / small)
            - md+   `w-[62vw]`
            - xl+   `w-[59vw]`   (wide-screen breathing room)
            - 3xl+  `w-[72rem]`  (caps growth on huge displays; ≈1152px)
          Custom `3xl` breakpoint lives in `globals.css`. */}
      <div className="sticky z-[20] mx-auto w-[70vw] md:w-[62vw] xl:w-[59vw] 3xl:w-[72rem] pb-24" style={{ top: stickyTop }}>
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
            {/* Heights ~12.5% smaller than before, in step with the width
                reduction above, so the card keeps its ~2:1–2.3:1 aspect at
                every tier while reading a notch smaller overall. */}
            {/* `pt-0 pb-4` keep the top/bottom insets; the left/right inset
                is the scroll-driven `sidePadding` (16px → 0 on desktop). */}
            <motion.div
              className="dashboard h-[443px] xl:h-[438px] 2xl:h-[490px] 3xl:h-[543px] pt-0 pb-4"
              style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}
            >
              <InteractableDemo />
            </motion.div>
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
