'use client'

/**
 * `<TrialKickoff>` — starts the 7-day free trial the FIRST time the
 * user opens the dashboard after onboarding (finished or skipped),
 * then celebrates: a centered "your trial just started" popup plus a
 * confetti burst. Mounted once from the hub layout root.
 *
 * Trigger condition (all must hold, checked once per page load):
 *   - account fetch settled (`!loading`) — never act on unknowns
 *   - `onboardingComplete === true` — the trial clock deliberately
 *     does NOT start at signup or during onboarding; only the first
 *     real dashboard render starts it
 *   - `trialStartedAt === null` — never started before (the popup
 *     can only ever appear once per account, because the backend
 *     stamp is permanent)
 *   - `rawPlanId === 'free'` — paying users never need a trial
 *
 * When it fires we POST `/accounts/me/start-trial` (idempotent +
 * race-safe server-side), broadcast an account refresh so every
 * `useAccount` consumer immediately sees `planId = 'starter'`
 * (sidebar badge, plan limits), and only celebrate once the backend
 * confirms the stamp landed.
 *
 * The popup never auto-dismisses — the user closes it themselves
 * (X, the CTA button, or the backdrop). The confetti is a small
 * dependency-free canvas burst, skipped under
 * `prefers-reduced-motion`.
 */

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAccount, broadcastAccountRefresh } from '@/hooks/useAccount'
import { ALGORITHM } from '@/lib/api'
import { trackEvent, captureError, EVENT } from '@/lib/posthog'
import { Button } from '@/components/ui/button'
import {
  CenterDialog,
  CenterDialogContent,
  CenterDialogDescription,
  CenterDialogHeader,
  CenterDialogTitle,
} from '@/components/ui/Dialog/CenterDialog'

/**
 * Per-page-load dedup, keyed by user id. The layout keeps this
 * component mounted across hub navigations so a ref would usually
 * do, but a remount (fast-refresh, route group changes) must not
 * re-POST — module scope survives remounts; a full reload is fine
 * because the backend call is idempotent anyway.
 */
const attemptedFor = new Set<string>()

export function TrialKickoff() {
  const { user } = useAuth()
  const { onboardingComplete, trialStartedAt, rawPlanId, loading } = useAccount()
  const [open, setOpen] = useState(false)
  const [bursting, setBursting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const userId = user?.id
    if (!userId || loading) return
    if (onboardingComplete !== true) return
    if (trialStartedAt !== null) return
    if (rawPlanId !== 'free') return
    if (attemptedFor.has(userId)) return
    attemptedFor.add(userId)

    void ALGORITHM.startTrial()
      .then(account => {
        // Celebrate only when a trial is actually running now. The
        // response can come back unstamped for paid-plan edge cases;
        // a concurrent tab winning the race still stamps it, and the
        // same user double-celebrating across two tabs is harmless.
        if (account.trialStartedAt === null) return
        trackEvent(EVENT.TRIAL_STARTED, { trialEndsAt: account.trialEndsAt })
        // Flip every mounted useAccount to effectivePlanId='starter'
        // (sidebar badge, plan limits) without a page reload.
        broadcastAccountRefresh()
        setOpen(true)
        setBursting(true)
      })
      .catch((err: unknown) => {
        // Non-fatal: the next page load retries (module set is per
        // page load, backend is idempotent). But report it — a
        // silent failure here would mean users silently never get
        // trial access.
        captureError(EVENT.TRIAL_STARTED, err, { phase: 'start_failed' })
        console.error('[TrialKickoff] start-trial failed:', err)
      })
  }, [user?.id, loading, onboardingComplete, trialStartedAt, rawPlanId])

  // Confetti burst — runs while `bursting`, cleans itself up. Lives
  // OUTSIDE the dialog so closing the popup mid-burst doesn't cut
  // the animation (and the canvas never blocks clicks either way).
  useEffect(() => {
    if (!bursting) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBursting(false)
      return
    }
    const stop = fireConfetti(canvas, () => setBursting(false))
    return stop
  }, [bursting])

  return (
    <>
      {bursting && (
        // Above the dialog (z-50) on purpose — the pieces rain down
        // over the popup itself, which is the fun part. Pointer
        // events pass straight through to the dialog underneath.
        <canvas
          ref={canvasRef}
          className="fixed inset-0 z-[95] pointer-events-none"
          aria-hidden="true"
        />
      )}
      <CenterDialog open={open} onOpenChange={setOpen}>
        <CenterDialogContent>
          <CenterDialogHeader className="items-center text-center pt-4">
            {/* Same visual grammar as the signup "check your email"
                tile and the trial-ended gate's hourglass. */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
              <span className="text-2xl">🎉</span>
            </div>
            <CenterDialogTitle className="text-lg leading-snug">
              Your 7-day free trial just started!
            </CenterDialogTitle>
            <CenterDialogDescription className="max-w-[34ch] mx-auto">
              Enjoy! You&apos;ve got everything in <span className="font-semibold">Starter</span>{' '}
              for the next 7 days — no card needed.
            </CenterDialogDescription>
          </CenterDialogHeader>
          <Button
            onClick={() => setOpen(false)}
            className="w-full rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium py-5 cursor-pointer shadow-none"
          >
            Let&apos;s go
          </Button>
        </CenterDialogContent>
      </CenterDialog>
    </>
  )
}

// ─── Confetti ───────────────────────────────────────────────────────────────

/** Brand-adjacent celebration palette — warm first, accents after. */
const CONFETTI_COLORS = [
  '#FF5D78', // primary
  '#FFB347',
  '#FACC15',
  '#22C55E',
  '#3B82F6',
  '#A855F7',
  '#F43F5E',
]

interface ConfettiPiece {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  color: string
  angle: number
  spin: number
  /** Phase offset for the flutter (horizontal sway) sine. */
  flutter: number
}

/**
 * Two corner cannons firing toward the upper-center, then gravity.
 * Plain rAF loop on a full-viewport canvas; returns a stop function
 * (also called automatically when every piece has fallen offscreen
 * or the 4-second safety cap elapses).
 */
function fireConfetti(canvas: HTMLCanvasElement, onDone: () => void): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    onDone()
    return () => {}
  }

  const dpr = window.devicePixelRatio || 1
  const width = window.innerWidth
  const height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)

  const pieces: ConfettiPiece[] = []
  const spawn = (originX: number, originY: number, baseAngle: number) => {
    for (let i = 0; i < 90; i++) {
      // Spread ±30° around the cannon's aim, speed varied per piece.
      const angle = baseAngle + (Math.random() - 0.5) * (Math.PI / 3)
      const speed = 9 + Math.random() * 9
      pieces.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 5,
        h: 8 + Math.random() * 7,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        flutter: Math.random() * Math.PI * 2,
      })
    }
  }
  // Bottom corners, aimed up-and-inward (canvas y grows downward,
  // so "up" is negative — -75° and -105° from horizontal).
  spawn(0, height, -Math.PI * 0.42)
  spawn(width, height, -Math.PI * 0.58)

  const GRAVITY = 0.22
  const DRAG = 0.992
  const startedAt = performance.now()
  let raf = 0
  let stopped = false

  const tick = (now: number) => {
    if (stopped) return
    ctx.clearRect(0, 0, width, height)

    let alive = 0
    const elapsed = now - startedAt
    for (const p of pieces) {
      p.vx *= DRAG
      p.vy = p.vy * DRAG + GRAVITY
      p.x += p.vx + Math.sin(elapsed / 120 + p.flutter) * 0.6
      p.y += p.vy
      p.angle += p.spin
      if (p.y > height + 24) continue
      alive++
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle)
      // Cos-scaled width fakes a 3D tumble (card turning edge-on).
      ctx.fillStyle = p.color
      ctx.fillRect((-p.w / 2) * Math.cos(elapsed / 90 + p.flutter), -p.h / 2, p.w * Math.cos(elapsed / 90 + p.flutter), p.h)
      ctx.restore()
    }

    // Done when everything fell out, or after a 4 s safety cap so a
    // background-tab rAF stall can't leave the canvas mounted forever.
    if (alive === 0 || elapsed > 4000) {
      stop()
      return
    }
    raf = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(raf)
    ctx.clearRect(0, 0, width, height)
    onDone()
  }

  raf = requestAnimationFrame(tick)
  return stop
}
