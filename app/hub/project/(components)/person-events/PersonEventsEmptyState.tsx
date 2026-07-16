'use client'

import { ArrowsClockwise, Lightning } from '@phosphor-icons/react'

export function PersonEventsEmptyState() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface">
        <Lightning size={20} weight="bold" className="text-subtle" />
      </span>
      <p className="text-sm font-medium text-foreground">No events yet</p>
      <p className="mt-1 max-w-xs text-xs text-subtle">
        We haven&apos;t recorded any activity for this person. Run{' '}
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
          <ArrowsClockwise size={11} weight="bold" /> Refresh
        </span>{' '}
        to pull their latest events from Stripe / PostHog.
      </p>
    </div>
  )
}
