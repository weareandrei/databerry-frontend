'use client'
import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Play } from '@phosphor-icons/react'
import InteractableDemo from '@/app/(components)/InteractableDemo/InteractableDemo'

const DemoSection = () => {
  const cardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { topOffset, stickyTop } = useDemoLayout(cardRef)

  return (
    <section
      id="second-section"
      className="relative flex flex-col items-center text-center bg-white px-4 py-12 md:px-12 md:py-24 overflow-x-clip"
    >
      {/* This spacer sets the section's height, which feeds `containerRef`'s
          height (section + 250px). Framer Motion's useScroll with
          `offset: ['start start', 'end end']` only progresses 0→1 in the
          scroll direction when the target is TALLER than the viewport — if
          it's shorter, the two boundary events fire in reverse order and
          scrollYProgress runs 1→0, making the demo card visibly shrink as
          the user scrolls down. `xl:h-[80vh]` keeps the section taller than
          the viewport on every common large screen (1080/1440/2160 tall). */}
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

interface DemoCardProps {
  cardRef: React.RefObject<HTMLDivElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  topOffset: number
  stickyTop: number
}

const DemoCard = ({ cardRef, containerRef, topOffset, stickyTop }: DemoCardProps) => {
  const { scale, borderRadius, sidePadding } = useDemoCardAnimation(containerRef)

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 h-[calc(100%+var(--demo-offset,250px))]"
      style={{
        top: -topOffset,
        ['--demo-offset' as string]: `${topOffset}px`,
      }}
    >
      {/* Width tiers for the sticky card:
            - default `w-[85vw]`  (mobile / md / small desktop)
            - lg+   `w-[70vw]`
            - xl+   `w-[59vw]`   (wide-screen breathing room)
            - 3xl+  `w-[72rem]`  (caps growth on huge displays; ≈1152px)
          Custom `3xl` breakpoint lives in `globals.css`. */}
      <div className="sticky z-[20] mx-auto w-[80vw] lg:w-[70vw] xl:w-[59vw] 3xl:w-[72rem] pb-24" style={{ top: stickyTop }}>
        {/* ── Mobile (<md): a blurred dashboard screenshot teaser with a
            centered "See demo" button that opens the full-screen `/demo`
            page. Wrapped in the SAME white-bordered, translucent card chrome
            (+ "Interactable demo" badge) as the desktop card — only the
            content differs (static image + CTA vs the live demo). Same
            scroll-driven `scale` grow. */}
        <motion.div
          style={{ scale, borderRadius }}
          className="md:hidden border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-center"
        >
          <motion.div style={{ borderRadius }} className="bg-white/35 overflow-hidden">
            <div className="flex justify-center py-3">
              <DemoBadge />
            </div>

            <div className="px-3 pb-3">
              <div className="relative aspect-[424/580] w-full overflow-hidden rounded-xl">
                <Image
                  src="/mobile_demo_preview_2.png"
                  alt="Databerry dashboard preview"
                  fill
                  sizes="85vw"
                  priority
                  // `scale-105` overscans so the `blur` doesn't reveal
                  // translucent edges where the filter samples past bounds.
                  className="object-cover scale-105 blur-[3px]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                  {/* Same "double pill" treatment as the rest of the landing
                      page's CTAs — solid inner pill inside a translucent halo. */}
                  <span className="inline-flex items-center rounded-full bg-white/25 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                    <Link
                      href="/demo"
                      className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      <Play size={16} weight="fill" />
                      See demo
                    </Link>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Desktop (md+): the scroll-animated interactive demo. */}
        <motion.div
          ref={cardRef}
          style={{ scale, borderRadius }}
          className="hidden md:block border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-center"
        >
          {/* Inner div needs to be a motion component too: it carries the
              `overflow-hidden` clip that crops the dashboard's square edges
              against the card's rounded corners. If only the outer corners
              animate, the inner clip stays rounded and the demo content
              keeps cropped corners after the card has gone square. */}
          <motion.div style={{ borderRadius }} className="bg-white/35 overflow-hidden">
            <div className="flex justify-center py-3">
              <DemoBadge />
            </div>

            {/* Discrete fixed heights (not an aspect-ratio rule) keep the
                card comfortably shorter than vh at every breakpoint — the
                scroll-driven `scale` grows it to 1.15× and we need room
                above/below without overflowing the viewport. `pt-0 pb-4`
                keep the top/bottom insets; the left/right inset is the
                scroll-driven `sidePadding` (16px → 0). */}
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

const DemoBadge = () => {
  return (
    <span className="inline-flex items-center rounded-full bg-white/25 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)] p-1">
      <span className="rounded-full bg-white px-4 py-1 text-xs font-light text-black whitespace-nowrap">
        Interactable demo
      </span>
    </span>
  )
}

const useDemoCardAnimation = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Grows the card on scroll. The growth FINISHES by ~55% of the scroll and
  // holds, so the side-padding melt (below) runs AFTER it rather than at the
  // same time — the two were fighting (transform vs. layout) and read as a
  // lag when overlapped. Desktop peaks at 1.15×; mobile uses a gentler curve
  // (1.08×) so the screenshot card doesn't crowd the viewport on small screens.
  const scaleOutput = isMobile ? [1, 1.04, 1.07, 1.08] : [1, 1.07, 1.14, 1.15]
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.55], scaleOutput)
  // Corners stay rounded at every scroll position. 18px = `rounded-2xl`.
  const borderRadius = useTransform(scrollYProgress, [0, 1], [18, 18])
  // The dashboard's left/right inset melts from 16px → 0, but only AFTER the
  // resize above has finished (it runs over [0.55, 0.9], picking up where
  // `scale` stops). Sequencing it this way — grow first, then expand to fill
  // — avoids running a layout animation (padding) at the same time as the
  // transform animation (scale), which felt laggy. Desktop only.
  const sidePadding = useTransform(scrollYProgress, [0.55, 0.9], [16, 0])

  return { scale, borderRadius, sidePadding }
}

const useDemoLayout = (cardRef: React.RefObject<HTMLDivElement | null>) => {
  const [topOffset, setTopOffset] = useState(250)
  const [stickyTop, setStickyTop] = useState(200)

  useEffect(() => {
    const calculate = () => {
      const vh = window.innerHeight
      const cardHeight = cardRef.current?.getBoundingClientRect().height ?? 500

      // Mobile and desktop anchor the card under different hero diagrams
      // (`m-demo-anchor` vs `demo-anchor`) and rest at different offsets.
      const isMobile = window.innerWidth < 768
      const anchorId = isMobile ? 'm-demo-anchor' : 'demo-anchor'
      const anchor = document.getElementById(anchorId)
      const section = document.getElementById('second-section')
      if (!anchor || !section) return

      const scrollY = window.scrollY
      const anchorBottom = anchor.getBoundingClientRect().bottom + scrollY
      const sectionTop = section.getBoundingClientRect().top + scrollY

      setTopOffset(sectionTop - anchorBottom)
      // Mobile uses a fixed fraction of the viewport (the card is a short
      // screenshot); desktop centers the taller demo card via its measured
      // height.
      setStickyTop(isMobile ? vh * 0.35 : 150 + (vh - cardHeight) * 0.3)
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
