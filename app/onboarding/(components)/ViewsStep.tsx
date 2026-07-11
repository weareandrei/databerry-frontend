'use client'

// ── Step 3: Create data views ───────────────────────────────────────────────

import { ArrowsClockwise } from '@phosphor-icons/react'
import { SelectableRow, PrimaryCta, SkipLink } from './OnboardingControls'
import type { ViewSection } from '../constants'

export function ViewsStep({
  loading,
  sections,
  selectedViews,
  pickedEventName,
  onToggleView,
  submitting,
  onFinish,
  onSkip,
}: {
  /** TRUE while the views-step connection check is in flight
   *  (server truth not resolved yet). */
  loading: boolean
  /** Sections to offer — already gated on connected tools. */
  sections: ViewSection[]
  selectedViews: Set<string>
  pickedEventName: string | null
  onToggleView: (optId: string) => void
  submitting: boolean
  onFinish: () => void
  onSkip: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center w-full">
      <h1
        className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        Add data views
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md">
        Make it simple to view your data. You can always delete
        and edit this later. Your project already includes a
        Project Overview by default.
      </p>

      {/* Checking which tools ACTUALLY connected — gate
          the sections on server truth, not selections. */}
      {loading && (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowsClockwise
            size={14}
            weight="bold"
            className="animate-spin"
          />
          <span>Checking your connections…</span>
        </div>
      )}

      {/* No tools connected → no per-tool views to offer.
          The Overview still gets created with the project,
          so Finish isn't a dead end. */}
      {!loading && sections.length === 0 && (
        <p className="mt-8 max-w-sm rounded-xl border border-dashed border-stroke bg-white px-4 py-6 text-xs text-subtle">
          Nothing extra to add — these options unlock when you
          connect tools. Your dashboard starts with the Project
          Overview.
        </p>
      )}

      {!loading && sections.length > 0 && (
      <div className="mt-8 w-full max-w-xl rounded-2xl border border-stroke bg-white shadow-card p-3">
        {sections.map(section => (
          <div key={section.section} className="text-left">
            <p className="px-1 pt-2 pb-1.5 text-xs font-medium text-subtle">
              {section.section}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {section.options.map(opt => (
                <SelectableRow
                  key={opt.id}
                  iconType={opt.iconType}
                  label={opt.label}
                  // Once an event is picked, the row says
                  // WHICH event it'll track — clearer than
                  // the generic blurb, and doubles as
                  // confirmation of the dialog pick.
                  desc={
                    opt.id === 'daily_counter' &&
                    selectedViews.has(opt.id) &&
                    pickedEventName
                      ? `Tracking "${pickedEventName}"`
                      : opt.desc
                  }
                  selected={selectedViews.has(opt.id)}
                  onToggle={() => onToggleView(opt.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      <PrimaryCta
        label={submitting ? 'Finishing…' : 'Finish'}
        onClick={onFinish}
        disabled={submitting}
        className="mt-10"
      />
      <SkipLink
        label="Skip"
        onClick={onSkip}
        disabled={submitting}
      />
    </div>
  )
}
