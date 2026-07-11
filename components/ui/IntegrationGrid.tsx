'use client'

/**
 * IntegrationGrid — compact horizontal-card picker grid.
 *
 * Each card is a single row: a 36px brand logo on the left, name and a
 * one-line description stacked to its right. No wasted top rectangle —
 * the icon carries the visual weight directly. Disabled cards render
 * dimmed with an optional badge ("In development", "Added", …).
 *
 * Used by:
 *  - `CreateConnectionModal` for the integration picker.
 *  - `CreateViewModal`'s "+ New connection" CTA / fallback flows.
 *
 * Keep this dumb — caller maps its own data into `IntegrationCard` shape
 * and handles selection. We don't know what `id` means; we just hand it
 * back via `onSelect(id)`.
 *
 * Layout note: the grid still wraps responsively so a wide viewport gets
 * 4–6 cards per row; on phones it's 2-up. The shorter card height nearly
 * doubles the visual density vs. the old 5:3 widget layout, which is what
 * the bottom dialog wants.
 */

import * as React from 'react'

import { cn } from '@/lib/utils'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'

export interface IntegrationCard {
  /** Stable id passed back to `onSelect`. */
  id: string
  /** Display name. */
  name: string
  /** One-line description; truncates if too long. */
  description: string
  /** When true, card is unclickable and visually dimmed. */
  disabled?: boolean
  /** Optional small label (e.g. "In development") shown in the corner. */
  badge?: string
  /**
   * Optional override for the icon-key used by `ConnectionIcon`. Defaults
   * to `id`. Set this when `id` is something specific to the picker
   * (e.g. a view-option type like `stripe_gross`) but the icon should
   * be the integration's icon instead.
   */
  iconType?: string
}

interface IntegrationGridProps {
  items: IntegrationCard[]
  onSelect: (id: string) => void
  /** Highlight state — when set, the matching card gets a selected ring. */
  selectedId?: string | null
  /** Optional className appended to the grid wrapper. */
  className?: string
  /**
   * Vestigial — the icon is always shown in the new compact layout.
   * Kept on the prop list for back-compat with existing callers.
   */
  showIcon?: boolean
}

export function IntegrationGrid({
  items,
  onSelect,
  selectedId,
  className,
}: IntegrationGridProps) {
  return (
    <div
      className={cn(
        // Compact rows, so we can pack more per viewport without losing
        // legibility. Step up the column count for wider screens.
        'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map(card => (
        <IntegrationGridCard
          key={card.id}
          card={card}
          selected={selectedId === card.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function IntegrationGridCard({
  card,
  selected,
  onSelect,
}: {
  card: IntegrationCard
  selected: boolean
  onSelect: (id: string) => void
}) {
  const handleClick = () => {
    if (card.disabled) return
    onSelect(card.id)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={card.disabled}
      aria-pressed={selected || undefined}
      className={cn(
        // Single horizontal row. The hover-lift + soft outer ring carry
        // over from the old card so the picker still feels tactile —
        // there's just no longer a giant grey rectangle on top.
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-card px-3 py-2.5 text-left shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-all duration-150 ease-out',
        !card.disabled && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--foreground)_18%,transparent),0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]',
        selected && 'shadow-[0_0_0_2px_var(--foreground)]',
        card.disabled && 'cursor-not-allowed opacity-55 hover:translate-y-0',
      )}
    >
      {/* Logo column. Sized once here; ConnectionIcon picks PNG vs.
          Phosphor based on `iconType ?? id`. */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <ConnectionIcon
          type={card.iconType ?? card.id}
          size={22}
          className="text-muted-foreground/85"
        />
      </div>

      {/* Text column. min-w-0 lets the inner truncate work inside the flex row. */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight">{card.name}</p>
        <p className="truncate text-[11px] leading-snug text-muted-foreground">
          {card.description}
        </p>
      </div>

      {card.badge && (
        <span className="shrink-0 rounded-full bg-background/95 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 shadow-sm">
          {card.badge}
        </span>
      )}
    </button>
  )
}
