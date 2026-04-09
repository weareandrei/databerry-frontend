'use client'
import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import InteractableDemo from '@/app/(components)/InteractableDemo/InteractableDemo'

interface DemoCardProps {
  cardRef: React.RefObject<HTMLDivElement>
  containerRef: React.RefObject<HTMLDivElement>
  topOffset: number
  stickyTop: number
}

function DemoCard({ cardRef, containerRef, topOffset, stickyTop }: DemoCardProps) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  // Exponential: slow start, accelerates toward end
  // Doesn't work by the way
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.7, 1], [1, 1.1, 1.2, 1.25])

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 h-[calc(100%+var(--demo-offset,250px))]"
      style={{
        top: -topOffset,
        ['--demo-offset' as string]: `${topOffset}px`,
      }}
    >
      {/* pb-16 = 4rem — card unsticks 4rem before container bottom */}
      <div className="sticky z-[20] mx-auto w-[76vw] md:w-[55vw] pb-24" style={{ top: stickyTop }}>
        <motion.div
          ref={cardRef}
          style={{ scale }}
          className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-center"
        >
          <div className="rounded-2xl bg-white/35 overflow-hidden">
            <div className="flex justify-center py-3">
              <span className="inline-flex items-center rounded-full bg-white/25 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)] p-1">
                <span className="rounded-full bg-white px-4 py-1 text-xs font-light text-black">
                  Interractable demo
                </span>
              </span>
            </div>

            <div className="h-[440px] p-4 pt-0">
              <InteractableDemo />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function useDemoLayout(cardRef: React.RefObject<HTMLDivElement>) {
  const [topOffset, setTopOffset] = useState(250)
  const [stickyTop, setStickyTop] = useState(200)

  useLayoutEffect(() => {
    const anchor = document.getElementById('demo-anchor')
    const section = document.getElementById('second-section')
    if (!anchor || !section) return

    const scrollY = window.scrollY
    const vh = window.innerHeight
    const anchorBottom = anchor.getBoundingClientRect().bottom + scrollY
    const sectionTop = section.getBoundingClientRect().top + scrollY

    setTopOffset(sectionTop - anchorBottom)

    const cardHeight = cardRef.current?.getBoundingClientRect().height ?? 500
    setStickyTop((vh - cardHeight) / 1.1)
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
      <h1
        className="max-w-4xl text-6xl font-semibold leading-[1.05] tracking-[-0.06em] text-gray-900"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        Start using in one click
      </h1>

      <h4
        className="mt-5 max-w-xl text-lg font-normal leading-[1.4] tracking-[0.01em] text-gray-500"
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        It's unbelievably easy to set up.
      </h4>

      <div className="h-[600px] py-24" />

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
