'use client'

// ── Step 1: Welcome ─────────────────────────────────────────────────────────

import Image from 'next/image'
import { PrimaryCta, SkipLink } from './OnboardingControls'

export function WelcomeStep({
  onStart,
  onSkip,
  submitting,
}: {
  onStart: () => void
  onSkip: () => void
  submitting: boolean
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className="flex items-center gap-3 text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        Welcome to{' '}
        <Image
          src="/databerry_logo_v2.svg"
          alt=""
          width={44}
          height={44}
          className="rounded-lg inline-block"
        />{' '}
        Databerry
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        This onboarding takes under 5 minutes
      </p>

      <PrimaryCta label="Start" onClick={onStart} disabled={submitting} className="mt-10" />
      <SkipLink label="Skip onboarding" onClick={onSkip} disabled={submitting} />
    </div>
  )
}
