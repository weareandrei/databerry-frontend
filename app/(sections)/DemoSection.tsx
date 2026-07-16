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
  const { scale, borderRadius } = useDemoCardAnimation(containerRef)

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
      <div className="sticky z-[20] mx-auto w-[85vw] lg:w-[78vw] xl:w-[80vw] 3xl:w-[75rem] pb-24" style={{ top: stickyTop }}>
        {/* ── Mobile (<md): screenshot teaser → `/demo`. Same window chrome
            as desktop (hover-fill + p-2 → bordered frame → traffic-light
            header); only the body differs. Same scroll-driven scale. */}
        <motion.div
          style={{ scale, borderRadius }}
          className="md:hidden shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-top"
        >
          <motion.div
            style={{ borderRadius }}
            className="bg-hover-fill p-2 overflow-hidden"
          >
            <div className="overflow-hidden rounded-lg border border-stroke bg-white">
              <DemoWindowHeader />
              <div className="relative aspect-[424/580] w-full overflow-hidden">
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

        {/* ── Desktop (md+): scroll-animated interactive demo.
            Layers: outer `bg-hover-fill p-2` → bordered frame → mac-like
            header + demo body. */}
        <motion.div
          ref={cardRef}
          style={{ scale, borderRadius }}
          className="hidden md:block shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-top"
        >
          {/* Inner motion div carries the overflow clip so rounded
              corners stay in sync with the animated outer radius. */}
          <motion.div
            style={{ borderRadius }}
            className="bg-hover-fill p-2 overflow-hidden"
          >
            <div className="overflow-hidden rounded-lg border border-stroke bg-white">
              <DemoWindowHeader />

              {/* Discrete fixed heights keep the card shorter than vh —
                  scale settles at 0.9× so these heights are the layout
                  size before the final visual scale. */}
              <div className="dashboard h-[65vh] xl:h-[75vh] 2xl:h-[75vh] 3xl:h-[543px]">
                <InteractableDemo />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

/** Mac-like traffic lights on the left, centered "Interactable demo" title. */
const DemoWindowHeader = () => {
  return (
    <header className="relative flex h-10 shrink-0 items-center border-b border-stroke px-3">
      <div className="flex items-center gap-[6px]" aria-hidden>
        <span className="size-[10px] rounded-full bg-[#FF5F57]" />
        <span className="size-[10px] rounded-full bg-[#FEBC2E]" />
        <span className="size-[10px] rounded-full bg-[#28C840]" />
      </div>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
        Interactable demo
      </span>
    </header>
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

  // Scales UP into the settled demo size on scroll. Starts undersized at
  // the top so the card reads as a preview under the hero, then settles
  // at 0.9× by ~55% — the demo runs slightly under true CSS size so denser
  // hub UI fits the landing card. Desktop starts ~0.78×; mobile is gentler.
  const scaleOutput = isMobile ? [0.833, 0.867, 0.892, 0.9] : [0.783, 0.837, 0.892, 0.9]
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.55], scaleOutput)
  // Corners stay rounded at every scroll position. 18px = `rounded-2xl`.
  const borderRadius = useTransform(scrollYProgress, [0, 1], [18, 18])

  return { scale, borderRadius }
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
