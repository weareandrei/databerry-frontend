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

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 h-[calc(100%+var(--demo-offset,250px))]"
      style={{
        top: -topOffset,
        ['--demo-offset' as string]: `${topOffset}px`,
      }}
    >
      {/* Width tiers: 76vw on mobile keeps the card inset from the
          screen edges (matches the old design); md+ pins to a 56rem
          (`w-4xl`) container; xl+ scales with the viewport (`55vw`)
          so the demo stays proportional on ultrawide displays.
          Without the mobile floor, `w-4xl` overflows phones (896px on
          a 375px viewport). */}
      <div className="sticky z-[20] mx-auto w-[76vw] md:w-4xl xl:w-[55vw] pb-24" style={{ top: stickyTop }}>
        <motion.div
          ref={cardRef}
          style={{ scale }}
          className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-center"
        >
          <div className="rounded-2xl bg-white/35 overflow-hidden">
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

            <div className="dashboard h-[440px] xl:h-[500px] 3xl:h-[620px] p-4 pt-0">
              <InteractableDemo />
            </div>
          </div>
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

      <div className="h-[550px] md:h-[600px] py-24" />

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
