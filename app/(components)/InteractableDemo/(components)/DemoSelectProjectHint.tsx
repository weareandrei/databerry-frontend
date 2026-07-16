'use client'

/**
 * Desktop-only nudge pointing at the home "Select project" control.
 * Uses a fixed portal so the artwork can sit above the select without
 * being clipped by the demo card's overflow. Fades out on the first
 * pointer interaction anywhere in the demo.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useDemoContext } from './context/DemoContext'

const ARROW_SRC = '/demo/arrow_desktop.png'
const ARROW_NATURAL_W = 573
const ARROW_NATURAL_H = 221
/** Display width — keeps the handwritten cue readable without dominating the card. */
const ARROW_DISPLAY_W = 300
const ARROW_DISPLAY_H = Math.round((ARROW_DISPLAY_W * ARROW_NATURAL_H) / ARROW_NATURAL_W)
/** Tip sits this far above the Select project control. */
const TIP_GAP_PX = 10
const FADE_MS = 500

const ANCHOR_SELECTOR = '[data-demo-select-project]'

interface DemoSelectProjectHintProps {
  /** True after the first click/tap anywhere inside the demo shell. */
  hasInteracted: boolean
}

export function DemoSelectProjectHint({ hasInteracted }: DemoSelectProjectHintProps) {
  const { pageOpen, currentProjectId } = useDemoContext()
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [opaque, setOpaque] = useState(true)
  const [removed, setRemoved] = useState(false)

  const shouldShow =
    !removed &&
    pageOpen === 'home' &&
    currentProjectId == null &&
    isDesktop

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!shouldShow || hasInteracted) return

    let raf = 0
    let lastLeft = Number.NaN
    let lastTop = Number.NaN

    const update = () => {
      const anchor = document.querySelector(ANCHOR_SELECTOR)
      if (!(anchor instanceof HTMLElement)) {
        if (!Number.isNaN(lastLeft)) {
          lastLeft = Number.NaN
          lastTop = Number.NaN
          setPos(null)
        }
        return
      }
      const rect = anchor.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        if (!Number.isNaN(lastLeft)) {
          lastLeft = Number.NaN
          lastTop = Number.NaN
          setPos(null)
        }
        return
      }
      // Tip ≈ bottom-right of the PNG, aimed near the select's leading icon.
      const tipX = rect.left + Math.min(28, rect.width * 0.25)
      const tipY = rect.top - TIP_GAP_PX
      const nextLeft = tipX - ARROW_DISPLAY_W
      const nextTop = tipY - ARROW_DISPLAY_H
      if (Math.abs(nextLeft - lastLeft) < 0.5 && Math.abs(nextTop - lastTop) < 0.5) {
        return
      }
      lastLeft = nextLeft
      lastTop = nextTop
      setPos({ left: nextLeft, top: nextTop })
    }

    const tick = () => {
      update()
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [shouldShow, hasInteracted])

  useEffect(() => {
    if (!hasInteracted || !opaque) return
    setOpaque(false)
    const timer = window.setTimeout(() => setRemoved(true), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [hasInteracted, opaque])

  if (!mounted || !shouldShow || !pos) return null

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed z-[200]"
      style={{
        left: pos.left,
        top: pos.top,
        width: ARROW_DISPLAY_W,
        height: ARROW_DISPLAY_H,
        opacity: opaque ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <Image
        src={ARROW_SRC}
        alt=""
        width={ARROW_NATURAL_W}
        height={ARROW_NATURAL_H}
        className="h-full w-full object-contain"
        priority
      />
    </div>,
    document.body,
  )
}
