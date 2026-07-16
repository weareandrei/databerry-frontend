'use client'

/**
 * Shared PostHog event-definition list. Renders the grid of event
 * cards (name + 30d volume + last seen + last URL) used by both:
 *
 *   1. The CreateViewModal "Track an event" sub-page — multi-select,
 *      each picked event spawns its own daily_counter view tile
 *   2. The cascade dropdown's PostHog event picker — single-select,
 *      the picked event becomes the eventName in a
 *      ConnectionMetricRef plotted as a chart overlay
 *
 * Pure presentational. Owns no fetch / no selection state. Caller
 * passes events, the current `selectedSet`, and the `onToggle`
 * handler. Lets the two surfaces have their own semantics (single
 * vs multi) without forking the visual.
 */

import { cn } from '@/lib/utils'
import type { PosthogEventDefinition } from '@/lib/api'

interface PosthogEventListProps {
  events: PosthogEventDefinition[] | null
  loading: boolean
  error: string | null
  selectedSet: Set<string>
  onToggle: (eventName: string) => void
  /** Optional empty-state message override. */
  emptyMessage?: string
}

export function PosthogEventList({
  events,
  loading,
  error,
  selectedSet,
  onToggle,
  emptyMessage = 'No events found.',
}: PosthogEventListProps) {
  if (loading) {
    return (
      <p className="text-sm text-subtle py-4 text-center">Loading events…</p>
    )
  }
  if (error) {
    return <p className="text-sm text-destructive py-4 text-center">{error}</p>
  }
  if (events && events.length === 0) {
    return <p className="text-sm text-subtle py-4 text-center">{emptyMessage}</p>
  }
  if (!events) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
      {events.map((def, i) => {
        const isSelected = selectedSet.has(def.name)
        const volume = def.volume_30_day ?? def.computed_volume
        const urlPath = def.last_url ?? null
        return (
          <div
            key={def.id ?? i}
            onClick={() => onToggle(def.name)}
            className={cn(
              'rounded-lg border p-3 flex flex-col gap-2 cursor-pointer transition-all select-none',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-stroke bg-white hover:bg-hover-fill',
            )}
          >
            <p className="text-sm font-semibold text-foreground truncate">{def.name}</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-subtle">30d events</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {volume.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-subtle">Last seen</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {def.last_seen_at
                    ? new Date(def.last_seen_at).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              {urlPath && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-subtle shrink-0">Last URL</span>
                  <span className="text-xs font-medium text-muted-foreground truncate text-right">
                    {urlPath}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
