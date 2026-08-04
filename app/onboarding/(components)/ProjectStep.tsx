'use client'

// ── Step 2: Name your project ───────────────────────────────────────────────

import { Input } from '@/components/ui/input'
import { PrimaryCta, SkipLink } from './OnboardingControls'

export function ProjectStep({
  name,
  websiteUrl,
  onNameChange,
  onWebsiteUrlChange,
  busy,
  submitting,
  onContinue,
  onSkip,
}: {
  name: string
  websiteUrl: string
  onNameChange: (v: string) => void
  onWebsiteUrlChange: (v: string) => void
  busy: boolean
  submitting: boolean
  onContinue: () => void
  onSkip: () => void
}) {
  const canContinue = name.trim().length > 0

  return (
    <div className="flex flex-col items-center text-center w-full">
      <h1
        className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        Name your project
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md">
        This is the workspace you&apos;ll connect tools and views to.
        You can rename it anytime.
      </p>

      <div className="mt-8 w-full max-w-sm space-y-4 text-left">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Project name
          </label>
          <Input
            placeholder="My SaaS"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            disabled={busy || submitting}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && canContinue && !busy && !submitting) {
                e.preventDefault()
                onContinue()
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Website URL{' '}
            <span className="text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <Input
            placeholder="databerry.app"
            value={websiteUrl}
            onChange={e => onWebsiteUrlChange(e.target.value)}
            disabled={busy || submitting}
            onKeyDown={e => {
              if (e.key === 'Enter' && canContinue && !busy && !submitting) {
                e.preventDefault()
                onContinue()
              }
            }}
          />
        </div>
      </div>

      <PrimaryCta
        label={busy ? 'Setting up…' : 'Continue'}
        onClick={onContinue}
        disabled={!canContinue || submitting || busy}
        className="mt-10"
      />
      <SkipLink
        label="Skip onboarding"
        onClick={onSkip}
        disabled={submitting || busy}
      />
    </div>
  )
}
