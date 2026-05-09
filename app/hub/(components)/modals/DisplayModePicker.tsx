'use client'

/**
 * DisplayModePicker — sub-page rendered inside the Create-View modal
 * after the user clicks a multi-mode `ViewPickerBar`. The user picks
 * one mode (chart / value / list) and we commit it as the new view's
 * `config.displayMode`.
 *
 * Single-mode entries skip this page entirely — the modal goes
 * straight to whatever next step the chosen view-type needs (events
 * picker, webhook field, or just creating the view).
 *
 * The visual style mirrors `ViewPickerBar`'s mode-chips, just enlarged
 * to a tappable card. Same colors → same mental model.
 */

import * as React from 'react'

import { cn } from '@/lib/utils'
import type { ViewKind } from '@/constants/viewOptions'
import { MODE_CHIP_STYLES, ModeChip } from './ViewPickerBar'

interface DisplayModePickerProps {
  /** Display name of the view-type the user just picked — shown in
   *  the heading so they know what they're choosing a mode for. */
  viewName: string
  /** Modes the chosen view-type supports. The picker renders one card
   *  per entry, in the order given. */
  modes: ViewKind[]
  /** Optional one-line per-mode descriptions. If omitted we fall back
   *  to a generic phrase for each mode. */
  descriptions?: Partial<Record<ViewKind, string>>
  onSelect: (mode: ViewKind) => void
}

const DEFAULT_DESCRIPTIONS: Record<ViewKind, string> = {
  chart: 'Show as a time-series chart over the selected period',
  value: "Show today's number as a single value tile",
  list: 'Show a list of recent entries',
}

export function DisplayModePicker({
  viewName,
  modes,
  descriptions,
  onSelect,
}: DisplayModePickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13px] font-medium">{viewName}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          How should this view be displayed?
        </p>
      </div>

      <div className="grid gap-2">
        {modes.map(mode => (
          <DisplayModeCard
            key={mode}
            mode={mode}
            description={
              descriptions?.[mode] ?? DEFAULT_DESCRIPTIONS[mode]
            }
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function DisplayModeCard({
  mode,
  description,
  onSelect,
}: {
  mode: ViewKind
  description: string
  onSelect: (mode: ViewKind) => void
}) {
  const style = MODE_CHIP_STYLES[mode]

  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={cn(
        // Same outer chrome as ViewPickerBar — keeps the picker family
        // visually consistent. The colored chip on the left signals
        // which mode this card is for.
        'group flex w-full items-center gap-3 overflow-hidden rounded-xl bg-card px-3 py-3 text-left shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-all duration-150 ease-out',
        'hover:-translate-y-0.5 hover:shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--foreground)_18%,transparent),0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]',
      )}
    >
      <ModeChip mode={mode} size="md" />

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-tight capitalize">
          {style.label}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  )
}
