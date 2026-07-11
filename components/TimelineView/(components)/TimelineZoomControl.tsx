'use client'

import { cn } from '@/lib/utils'
import type { TimelineZoom } from '../types'

const OPTIONS: TimelineZoom[] = ['day', 'week', 'month']

export function TimelineZoomControl({
  zoom,
  onChange,
}: {
  zoom: TimelineZoom
  onChange: (z: TimelineZoom) => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-stroke bg-white p-0.5 shadow-sm">
      {OPTIONS.map(z => (
        <button
          key={z}
          type="button"
          onClick={() => onChange(z)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors cursor-pointer',
            zoom === z
              ? 'bg-surface text-foreground'
              : 'text-subtle hover:text-muted-foreground',
          )}
        >
          {z}
        </button>
      ))}
    </div>
  )
}
