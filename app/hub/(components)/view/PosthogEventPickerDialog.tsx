'use client'

/**
 * Centered-dialog flavour of the PostHog event picker. Opens when
 * the user picks "PostHog → Event count" from the chart's cascade
 * dropdown — gives them a list to pick exactly ONE event from,
 * which then becomes the `eventName` in a `ConnectionMetricRef`.
 *
 * Distinct from the multi-select BottomDialog page in
 * `CreateViewModal`:
 *   - This dialog is single-select (the chart overlays one event
 *     count, not multiple stacked tiles)
 *   - It's center-positioned (per user's explicit ask — chart UI
 *     lives inside the dashboard's main content area, a bottom
 *     sheet would feel disconnected from where the user just
 *     clicked)
 *   - It's sized to ~860 px so it doesn't fill the screen — wider
 *     than a confirmation dialog, narrower than the BottomDialog
 *     page's full-bleed layout
 *
 * The event-card body itself is `<PosthogEventList>`, shared
 * between this dialog and the CreateViewModal sub-page — so the
 * visual stays consistent and any future tweaks (sort order, new
 * fields, etc.) land in both places.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ALGORITHM, type PosthogEventDefinition } from '@/lib/api'
import { PosthogEventList } from './PosthogEventList'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Connection to fetch events from. Required when `open`. */
  connectionId: string | null
  /** Pre-selected event name (e.g. when the user is changing their
   *  pick on a chart that already has one). `null` for a fresh
   *  pick. */
  initialEventName?: string | null
  /** Fires with the picked event name when the user confirms. */
  onConfirm: (eventName: string) => void
}

export function PosthogEventPickerDialog({
  open,
  onOpenChange,
  connectionId,
  initialEventName,
  onConfirm,
}: Props) {
  const [events, setEvents] = useState<PosthogEventDefinition[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Single-select: we hold the selection as a 1-element Set so the
  // shared `PosthogEventList` (which expects a Set) doesn't need a
  // second contract for single-vs-multi. Toggling an already-selected
  // event UNSELECTS it (matches multi-select intuition).
  const [selected, setSelected] = useState<string | null>(initialEventName ?? null)
  const [search, setSearch] = useState('')

  // Re-fetch events when the dialog opens for a different connection.
  // Closing + re-opening the same dialog reuses the cached list.
  useEffect(() => {
    if (!open || !connectionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setEvents(null)
    ALGORITHM.getPosthogEventDefinitions(connectionId)
      .then(list => {
        if (!cancelled) setEvents(list)
      })
      .catch(err => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load events')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, connectionId])

  // Reset selection on open so reopening with a different
  // `initialEventName` correctly pre-selects it.
  useEffect(() => {
    if (open) setSelected(initialEventName ?? null)
  }, [open, initialEventName])

  const handleToggle = (eventName: string) => {
    setSelected(prev => (prev === eventName ? null : eventName))
  }

  const handleConfirm = () => {
    if (!selected) {
      toast.error('Pick an event first')
      return
    }
    onConfirm(selected)
    onOpenChange(false)
  }

  // Client-side filter — PostHog projects can have 200+ event types
  // and the list gets unwieldy fast. Substring match on event name.
  const filteredEvents = events
    ? search.trim()
      ? events.filter(e => e.name.toLowerCase().includes(search.toLowerCase().trim()))
      : events
    : null

  const selectedSet = selected ? new Set([selected]) : new Set<string>()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `max-w-[860px]` keeps the dialog noticeably smaller than the
          bottom-sheet variant (which goes ~full screen-width) while
          still wide enough for the 3-column card grid at typical
          desktop sizes. `max-h-[80vh]` + the body's internal scroll
          (`overflow-y-auto`) keeps the dialog inside the viewport
          even for projects with 100+ events — the user can scroll
          the card grid without the dialog growing past the screen. */}
      <DialogContent className="sm:max-w-[860px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Pick a PostHog event</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          The picked event&apos;s count per bucket becomes the metric plotted on
          the chart.
        </p>

        <Input
          placeholder="Filter events…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm"
        />

        {/* Scrollable body — the card grid lives in here so the footer
            stays pinned at the dialog bottom regardless of list size. */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <PosthogEventList
            events={filteredEvents}
            loading={loading}
            error={error}
            selectedSet={selectedSet}
            onToggle={handleToggle}
            emptyMessage={
              search.trim()
                ? `No events matching "${search}".`
                : 'No events found in this PostHog project.'
            }
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!selected}
          >
            {selected ? `Use "${selected}"` : 'Pick an event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
