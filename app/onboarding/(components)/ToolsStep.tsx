'use client'

// ── Step 2: Connect your tools ──────────────────────────────────────────────

import { TOOLS } from '../constants'
import { PrimaryCta, SkipLink, SelectableRow } from './OnboardingControls'

export function ToolsStep({
  selectedTools,
  onToggleTool,
  busy,
  submitting,
  onContinue,
  onSkip,
}: {
  selectedTools: Set<string>
  onToggleTool: (type: string) => void
  busy: boolean
  submitting: boolean
  onContinue: () => void
  onSkip: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center w-full">
      <h1
        className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        Connect the tools you already use
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md">
        Select the tools you track your projects with. We&apos;ll
        wire them into Databerry so everything lives in one
        dashboard.
      </p>

      <div className="mt-8 w-full max-w-xl rounded-2xl border border-stroke bg-white shadow-card p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TOOLS.map(tool => (
          <SelectableRow
            key={tool.type}
            iconType={tool.type}
            label={tool.label}
            selected={selectedTools.has(tool.type)}
            onToggle={() => onToggleTool(tool.type)}
          />
        ))}
      </div>

      <PrimaryCta
        label={busy ? 'Setting up…' : 'Continue'}
        onClick={onContinue}
        disabled={submitting || busy}
        className="mt-10"
      />
      <SkipLink
        label="Skip onboarding"
        onClick={onSkip}
        disabled={submitting}
      />
    </div>
  )
}
