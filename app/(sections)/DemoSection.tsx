'use client'
import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, easeOut } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Play } from '@phosphor-icons/react'
import InteractableDemo from '@/app/(components)/InteractableDemo/InteractableDemo'

/** Scale the card settles at once docked — the demo runs slightly under
 *  true CSS size so the denser hub UI fits the landing card. */
const SETTLED_SCALE = 0.9
/** Scale at the top of the page, where the card reads as a preview peeking
 *  out from under the hero. Desktop starts smaller; the mobile teaser is
 *  gentler. */
const START_SCALE = { desktop: 0.783, mobile: 0.833 }
/** Closest the docked card may sit to the navbar on very short viewports. */
const MIN_DOCK_GAP = 16

const DemoSection = () => {
  const stickyRef = useRef<HTMLDivElement>(null)
  const layout = useDemoLayout(stickyRef)

  return (
    <section
      id="second-section"
      className="relative flex flex-col items-center text-center bg-white px-4 py-12 md:px-12 md:py-24 overflow-x-clip"
    >
      {/* This spacer sets the section's height — the track the sticky card
          rides in. Whatever is left of that track once the card has docked
          is how far the page scrolls with the demo held in place before
          carrying it away, so this is purely a "how long does it stay put"
          knob; the scale animation is independent of it (see
          `useDemoCardScale`). */}
      <div className="h-[550px] md:h-[600px] xl:h-[80vh] py-24" />

      <DemoCard stickyRef={stickyRef} layout={layout} />
    </section>
  )
}

export default DemoSection

interface DemoLayout {
  /** How far the card's track reaches up into the hero: the distance from
   *  the hero's demo anchor down to this section's top edge. */
  topOffset: number
  /** Viewport Y the card's top edge docks at while it is held in place. */
  stickyTop: number
  /** Page scroll positions the card grows between — from its top edge
   *  first showing on screen to that edge reaching `stickyTop`. */
  growFrom: number
  growTo: number
}

interface DemoCardProps {
  stickyRef: React.RefObject<HTMLDivElement | null>
  layout: DemoLayout
}

const DemoCard = ({ stickyRef, layout }: DemoCardProps) => {
  const scale = useDemoCardScale(layout.growFrom, layout.growTo)

  return (
    <div
      className="absolute inset-x-0 h-[calc(100%+var(--demo-offset,250px))]"
      style={{
        top: -layout.topOffset,
        ['--demo-offset' as string]: `${layout.topOffset}px`,
      }}
    >
      {/* Width tiers for the sticky card:
            - default `w-[85vw]`  (mobile / md / small desktop)
            - lg+   `w-[70vw]`
            - xl+   `w-[59vw]`   (wide-screen breathing room)
            - 3xl+  `w-[72rem]`  (caps growth on huge displays; ≈1152px)
          Custom `3xl` breakpoint lives in `globals.css`. */}
      <div
        ref={stickyRef}
        className="sticky z-[20] mx-auto w-[85vw] lg:w-[78vw] xl:w-[80vw] 3xl:w-[75rem] pb-24"
        style={{ top: layout.stickyTop }}
      >
        {/* ── Mobile (<md): screenshot teaser → `/demo`. Same window chrome
            as desktop (hover-fill + p-2 → bordered frame → traffic-light
            header); only the body differs. Same scroll-driven scale. */}
        <motion.div
          style={{ scale: scale.mobile }}
          className="md:hidden rounded-2xl shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-top"
        >
          <div className="rounded-2xl bg-hover-fill p-2 overflow-hidden">
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
          </div>
        </motion.div>

        {/* ── Desktop (md+): scroll-animated interactive demo.
            Layers: outer `bg-hover-fill p-2` → bordered frame → mac-like
            header + demo body. */}
        <motion.div
          style={{ scale: scale.desktop }}
          className="hidden md:block rounded-2xl shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] origin-top"
        >
          {/* Inner div carries the overflow clip, rounded to match the
              outer card so its corners crop the frame inside. */}
          <div className="rounded-2xl bg-hover-fill p-2 overflow-hidden">
            <div className="overflow-hidden rounded-lg border border-stroke bg-white">
              <DemoWindowHeader />

              {/* Discrete fixed heights keep the card shorter than vh —
                  scale settles at 0.9× so these heights are the layout
                  size before the final visual scale. */}
              <div className="dashboard h-[65vh] xl:h-[75vh] 2xl:h-[75vh] 3xl:h-[543px]">
                <InteractableDemo />
              </div>
            </div>
          </div>
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

/**
 * The card grows from its preview size to its settled size while it rises
 * out from under the hero, finishing exactly as it docks.
 *
 * It is driven by the page's scroll position over that rise, NOT by a
 * section-relative `scrollYProgress`: the rise is hundreds of pixels long on
 * every viewport, whereas "this section minus the viewport" is only a few
 * dozen — or zero, or negative — depending on window height, which squeezes
 * the whole growth into a visible snap.
 */
const useDemoCardScale = (growFrom: number, growTo: number) => {
  const { scrollY } = useScroll()
  const range = [growFrom, growTo]
  // `easeOut` tapers the growth off into the dock, so the card is already
  // near-still in size when it stops moving rather than halting abruptly.
  const options = { ease: easeOut }

  return {
    desktop: useTransform(scrollY, range, [START_SCALE.desktop, SETTLED_SCALE], options),
    mobile: useTransform(scrollY, range, [START_SCALE.mobile, SETTLED_SCALE], options),
  }
}

const INITIAL_LAYOUT: DemoLayout = { topOffset: 250, stickyTop: 200, growFrom: 0, growTo: 1 }

const useDemoLayout = (stickyRef: React.RefObject<HTMLDivElement | null>) => {
  const [layout, setLayout] = useState(INITIAL_LAYOUT)

  useEffect(() => {
    let disposed = false

    const calculate = () => {
      if (disposed) return

      const section = document.getElementById('second-section')
      // Mobile and desktop anchor the card under different hero diagrams
      // (`m-demo-anchor` vs `demo-anchor`).
      const isMobile = window.innerWidth < 768
      const anchor = document.getElementById(isMobile ? 'm-demo-anchor' : 'demo-anchor')
      // Whichever card variant CSS is showing at this breakpoint.
      const card = Array.from(stickyRef.current?.children ?? []).find(
        (el): el is HTMLElement => el instanceof HTMLElement && el.offsetHeight > 0,
      )
      if (!section || !anchor || !card) return

      const viewport = window.innerHeight
      const navBottom =
        document.querySelector('[data-notch-bar]')?.getBoundingClientRect().bottom ?? 0
      const anchorY = layoutTop(anchor) + anchor.offsetHeight
      // `offsetHeight` is the unscaled layout height, so this is how tall
      // the card ends up no matter what scale it is at right now.
      const settledHeight = card.offsetHeight * SETTLED_SCALE

      // Dock the settled card midway between the navbar and the bottom of
      // the viewport, so the space above and below it matches.
      const stickyTop =
        navBottom + Math.max(MIN_DOCK_GAP, (viewport - navBottom - settledHeight) / 2)
      // Grow from the moment the card's top edge is on screen (straight
      // away on desktop, where it peeks out under the hero)…
      const growFrom = Math.max(0, anchorY - viewport)
      // …until the page has carried that edge up to its docking line.
      const growTo = Math.max(growFrom + 1, anchorY - stickyTop)

      const next = { topOffset: layoutTop(section) - anchorY, stickyTop, growFrom, growTo }
      setLayout(prev => (isSameLayout(prev, next) ? prev : next))
    }

    calculate()
    window.addEventListener('resize', calculate)
    // The hero is a fixed height on desktop, so late changes to what's
    // inside it move the anchor without tripping the observer below.
    // Re-measure once its web fonts have swapped in and the page has loaded.
    window.addEventListener('load', calculate)
    void document.fonts.ready.then(calculate)

    const hero = document.querySelector<HTMLElement>('section')
    const ro = new ResizeObserver(calculate)
    if (hero) ro.observe(hero)

    return () => {
      disposed = true
      window.removeEventListener('resize', calculate)
      window.removeEventListener('load', calculate)
      ro.disconnect()
    }
  }, [stickyRef])

  return layout
}

const isSameLayout = (a: DemoLayout, b: DemoLayout) =>
  a.topOffset === b.topOffset &&
  a.stickyTop === b.stickyTop &&
  a.growFrom === b.growFrom &&
  a.growTo === b.growTo

/**
 * An element's top edge in document space, summed from layout offsets
 * rather than read off `getBoundingClientRect()` — so transforms that are
 * mid-flight (the hero's entrance slide moves the anchor 22px) can't skew
 * the measurement.
 */
const layoutTop = (el: HTMLElement) => {
  let top = 0
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop
  }
  return top
}
