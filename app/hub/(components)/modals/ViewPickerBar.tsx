'use client'

/**
 * ViewPickerBar — a single bar in the new Create-View modal.
 *
 * Visually mirrors `IntegrationGrid`'s `IntegrationGridCard`: a 36 px
 * brand icon on the left, name + one-line description stacked to its
 * right. The differentiator is the **mode chips** in the top-right
 * corner — small colored rounded rectangles, one per display mode the
 * view-type supports (chart / value / list).
 *
 * Caller responsibilities:
 *   - Map each `ViewOption` from `viewOptions.ts` plus the corresponding
 *     integration logo type into the props.
 *   - Decide what happens on click — typically: figure out which
 *     connection to use (skip-or-prompt), then push the
 *     `DisplayModePicker` if `modes.length > 1`, else commit directly.
 *
 * Disabled state: caller passes `disabled` when no connection of the
 * matching integration is available under the current scope filter.
 * The bar then shows a tooltip via `disabledReason`.
 */

import * as React from 'react'
import { ChartLine, Hash, ListBullets } from '@phosphor-icons/react'

import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ViewKind } from '@/constants/viewOptions'

/**
 * Per-mode hover tooltip copy. Read once when the user hovers a chip
 * — answers "what does this little icon mean?" without making them
 * click and find out. Phrased identically across modes so the only
 * thing changing is the noun, which makes the user's mental model
 * "this view-type can be displayed as a ___".
 */
const MODE_TOOLTIP: Record<ViewKind, string> = {
  chart: 'Data can be presented as a chart',
  value: 'Data can be presented as a value',
  list: 'Data can be presented as a list',
}

export interface ViewPickerBarProps {
  /** Stable id passed back to `onSelect`. Typically `<integration>:<viewType>`
   *  so it stays unique across integrations even when type names collide. */
  id: string
  /** Connection-icon type — selects the brand logo. e.g. 'stripe_manual',
   *  'google_analytics', 'posthog', 'calendly', 'webhook'. */
  iconType: string
  /** Display name (e.g. "Gross Volume", "Track an event"). */
  name: string
  /** One-line description; truncates if it overflows. */
  description: string
  /** Modes the view-type supports — one chip rendered per entry. */
  modes: ViewKind[]
  /** When true the bar is unclickable + visually dimmed. */
  disabled?: boolean
  /** Optional tooltip on the disabled bar — explains *why* it's off. */
  disabledReason?: string
  /** Optional small badge in the bottom-right ("Already added", etc.). */
  badge?: string
  onSelect: (id: string) => void
}

/**
 * Per-mode style tuple. Saturated background (≈15 % opacity) + matching
 * foreground colour reads as "available, this mode is real" without
 * fighting the bar's own colour. Single source of truth so the chip
 * styles and the matching DisplayModePicker tile styles stay aligned —
 * see `DisplayModePicker.tsx`.
 */
export const MODE_CHIP_STYLES: Record<
  ViewKind,
  { bg: string; fg: string; label: string }
> = {
  chart: {
    bg: 'bg-blue-500/15',
    fg: 'text-blue-600',
    label: 'Chart',
  },
  value: {
    bg: 'bg-emerald-500/15',
    fg: 'text-emerald-600',
    label: 'Value',
  },
  list: {
    bg: 'bg-violet-500/15',
    fg: 'text-violet-600',
    label: 'List',
  },
}

function ModeIcon({ mode, size }: { mode: ViewKind; size: number }) {
  switch (mode) {
    case 'chart':
      return <ChartLine size={size} weight="bold" />
    case 'value':
      // `Hash` reads as "a number / single value" without committing to
      // any specific data type (vs. a currency symbol or # prefix).
      return <Hash size={size} weight="bold" />
    case 'list':
      return <ListBullets size={size} weight="bold" />
  }
}

/**
 * Stand-alone chip used both inside `ViewPickerBar` and (in larger
 * form) in `DisplayModePicker`. Exported so callers can reuse the
 * exact same visual treatment.
 */
export function ModeChip({
  mode,
  size = 'sm',
  className,
}: {
  mode: ViewKind
  size?: 'sm' | 'md'
  className?: string
}) {
  const style = MODE_CHIP_STYLES[mode]
  const dims =
    size === 'sm'
      ? 'h-[18px] gap-1 px-1.5 text-[10px]'
      : 'h-7 gap-1.5 px-2.5 text-xs'
  const iconSize = size === 'sm' ? 11 : 14

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        dims,
        style.bg,
        style.fg,
        className,
      )}
      title={style.label}
    >
      <ModeIcon mode={mode} size={iconSize} />
      {size === 'md' && <span>{style.label}</span>}
    </span>
  )
}

export function ViewPickerBar({
  id,
  iconType,
  name,
  description,
  modes,
  disabled,
  disabledReason,
  badge,
  onSelect,
}: ViewPickerBarProps) {
  const handleClick = () => {
    if (disabled) return
    onSelect(id)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={cn(
        // Same visual baseline as IntegrationGridCard so the two pickers
        // (Create Connection / Create View) feel like a matched pair.
        // pr-14 reserves room for the absolute-positioned mode-chip row.
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-card pl-3 pr-14 py-2.5 text-left shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-all duration-150 ease-out',
        !disabled &&
          'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--foreground)_18%,transparent),0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]',
        disabled && 'cursor-not-allowed opacity-55 hover:translate-y-0',
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <ConnectionIcon
          type={iconType}
          size={22}
          className="text-muted-foreground/85"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight">{name}</p>
        <p className="truncate text-[11px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Mode chips — top-right, absolutely positioned so they don't push
          the text column. Reserved space via pr-14 on the button.

          Each chip is wrapped in a `<Tooltip>` so hovering reveals
          plain-language copy ("Data can be presented as a chart") —
          the chip alone reads as "some little icon" until you know
          the convention. The trigger is rendered as a `<span>` (via
          base-ui's `render` prop) instead of the default `<button>`
          element, because this whole bar IS already a `<button>`
          and HTML disallows nesting a button inside a button.
          Click events on the chip still bubble to the parent bar's
          `onClick`, so tapping a chip behaves the same as tapping
          anywhere else on the bar. One `<TooltipProvider>` wraps the
          whole row to share its hover-delay state across all chips
          (instead of one provider per chip). */}
      <TooltipProvider delay={150}>
        <span className="absolute right-2 top-2 flex items-center gap-1">
          {modes.map(mode => (
            <Tooltip key={mode}>
              <TooltipTrigger render={<span />}>
                <ModeChip mode={mode} size="sm" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64">
                <p className="text-xs leading-snug">{MODE_TOOLTIP[mode]}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </span>
      </TooltipProvider>

      {badge && (
        <span className="absolute bottom-2 right-2 rounded-full bg-background/95 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 shadow-sm">
          {badge}
        </span>
      )}
    </button>
  )
}
