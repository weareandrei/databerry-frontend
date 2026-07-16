'use client'

/**
 * Bottom sheet that slides up when you click a row in the project's
 * People table. Shows that person's event timeline — newest first —
 * with the detecting system (Stripe / PostHog / …) and the time each
 * event happened.
 */

import { useCallback, useEffect, useState } from 'react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { ALGORITHM, type PersonRow, type PersonEvent } from '@/lib/api'
import { PersonAvatar } from './PersonAvatar'
import { PersonEventsTimeline } from './person-events/PersonEventsTimeline'

export function PersonEventsSheet({
  person,
  onClose,
  eventsOverride,
  container,
}: {
  person: PersonRow | null
  onClose: () => void
  /** Demo escape hatch: synthetic events instead of `GET /people/:id/events`. */
  eventsOverride?: PersonEvent[]
  container?: HTMLElement | null
}) {
  const [shown, setShown] = useState<PersonRow | null>(null)
  useEffect(() => {
    if (person) setShown(person)
  }, [person])

  const who = person ?? shown

  const fetchEvents = useCallback(
    async (_ctx: { signal: AbortSignal }) => {
      if (eventsOverride) return eventsOverride
      if (!who?.id) return []
      return ALGORITHM.getPersonEvents(who.id, { limit: 200 })
    },
    [who?.id, eventsOverride],
  )

  return (
    <BottomDialog
      open={person !== null}
      onOpenChange={o => !o && onClose()}
      container={container}
    >
      <BottomDialog.Page
        pageKey={who?.id ?? 'person'}
        bodyVariant="card"
        headerLeft={
          <div className="flex min-w-0 items-center gap-3">
            {who?.id ? (
              <PersonAvatar
                seed={who.id}
                name={who.displayName ?? who.primaryEmail}
                size={36}
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface" />
            )}
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                {who?.displayName ?? 'Unknown person'}
              </p>
              <p className="truncate text-xs text-subtle">
                {who?.primaryEmail ?? 'No email'}
              </p>
            </div>
          </div>
        }
      >
        <PersonEventsTimeline
          enabled={person !== null}
          fetchKey={eventsOverride ?? who?.id}
          fetchEvents={fetchEvents}
        />
      </BottomDialog.Page>
    </BottomDialog>
  )
}
