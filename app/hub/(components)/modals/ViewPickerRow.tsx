'use client'

/**
 * One horizontal row of `ViewTypeCard`s, scoped to a single source.
 *
 * A "source" is either a real user connection (e.g. their Stripe account)
 * or the synthetic "Project" group used by Project Overview. The row
 * header labels what's underneath; the body is a responsive grid of
 * cards (2-up on mobile, scaling up on wider viewports).
 *
 * The component itself is layout-only — it doesn't know how to create a
 * view. The parent (`CreateViewModal`) passes pre-bound `onSelect`
 * callbacks per card so this stays decoupled from the create-flow
 * branching (Stripe Connect creates inline, PostHog pushes a sub-page,
 * Webhook pushes a sub-page, etc.).
 */

import type { ReactNode } from 'react'
import { ViewTypeCard, type ViewTypeCardProps } from './ViewTypeCard'

interface ViewPickerRowProps {
  /** Row label, e.g. "Stripe — Main account" or "Project". */
  title: string
  /** Optional subtitle, rendered muted next to the title. */
  subtitle?: string
  /** The cards to render. */
  cards: ViewTypeCardProps[]
  /** Optional trailing content (e.g. an action button) rendered to the
   *  right of the title row. Currently unused; reserved for future
   *  per-row actions like "Manage connection". */
  rightSlot?: ReactNode
}

export function ViewPickerRow({ title, subtitle, cards, rightSlot }: ViewPickerRowProps) {
  if (cards.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          {subtitle && (
            <span className="ml-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground/70">
              · {subtitle}
            </span>
          )}
        </h3>
        {rightSlot}
      </div>
      {/* Two-up on phones, scaling up on wider viewports. Column count
          grows aggressively past `md` so cards stay compact on a desktop
          dialog (which is wide) — bigger gap (`gap-4`) lets each card
          breathe instead of stacking shoulder-to-shoulder. The row never
          becomes a horizontal scroller; vertical scroll on the dialog
          body handles overflow. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map(card => (
          <ViewTypeCard key={card.type} {...card} />
        ))}
      </div>
    </section>
  )
}
