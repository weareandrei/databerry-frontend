'use client'

/**
 * A single view-type card in the new flat view picker.
 *
 * Layout:
 *   ┌────────────────────────┐
 *   │   [illustration]       │   ← ~5:2, kind-specific (chart/value/list)
 *   │────────────────────────│
 *   │  [logo]  Name          │   ← logo on the LEFT of name + description
 *   │          One-line desc │
 *   └────────────────────────┘
 *
 * The illustration carries the visual weight of the card; the connection
 * logo is demoted to a small chip beside the title so the user can still
 * see "this is a Calendly view" without that being the dominant element.
 *
 * Click → `onSelect()` fires; the parent in `CreateViewModal` decides
 * whether to create immediately, or push a sub-page (PostHog, Webhook).
 */

import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { cn } from '@/lib/utils'
import type { ViewKind } from '@/constants/viewOptions'
import { ViewIllustration } from './ViewIllustration'

export interface ViewTypeCardProps {
  /** View-type id. Just for `key`; not rendered. */
  type: string
  name: string
  description: string
  kind: ViewKind
  /** Connection-type key, mapped to a brand logo via ConnectionIcon. */
  iconType: string
  /** Optional small label in the corner — e.g. "Added" / "In development". */
  badge?: string
  disabled?: boolean
  onSelect: () => void
}

export function ViewTypeCard({
  name,
  description,
  kind,
  iconType,
  badge,
  disabled,
  onSelect,
}: ViewTypeCardProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return
        onSelect()
      }}
      disabled={disabled}
      className={cn(
        // Keeps the same tactile language as the compact connection card
        // (soft outer ring, hover-lift) so the picker feels cohesive even
        // though the card body is taller than the connection cards.
        'group relative flex w-full flex-col overflow-hidden rounded-xl bg-card text-left shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-all duration-150 ease-out',
        !disabled && 'hover:-translate-y-0.5 hover:shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--foreground)_18%,transparent),0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]',
        disabled && 'cursor-not-allowed opacity-55 hover:translate-y-0',
      )}
    >
      {/* Illustration frame (~5:1.6 — flatter than the original 5:2 so the
          card stays compact when there are many cards in a row).
          Background lives on the wrapper here (not on the inner SVG) so
          the badge can sit on top with crisp edges. */}
      <div className="relative aspect-[5/1.6] w-full">
        <ViewIllustration kind={kind} />
        {badge && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-background/95 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 shadow-sm">
            {badge}
          </span>
        )}
      </div>

      {/* Title row: logo-left, name + desc stacked right. Padding is
          deliberately light (`px-2 py-1.5`) so the card body stays small
          relative to the illustration; the picker shows a lot of cards at
          once and trim padding helps the eye scan. */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60">
          <ConnectionIcon
            type={iconType}
            size={14}
            className="text-muted-foreground/85"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium leading-tight">{name}</p>
          <p className="truncate text-[10.5px] leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}
