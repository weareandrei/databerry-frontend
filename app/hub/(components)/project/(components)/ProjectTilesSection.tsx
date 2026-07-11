'use client'

import { ProjectBodyViews } from './ProjectBodyViews'
import {
  deriveOverviewComposite,
  PROJECT_VIEW_CARD,
  PROJECT_VIEW_SURFACE_WRAP,
} from './projectViewUtils'
import type { DateMode } from '@/types/dates'
import type { View } from '@/types/view'

interface ProjectTilesSectionProps {
  views: View[]
  loading?: boolean
  /** Shown when there are no tile views. Omit to hide the section when empty. */
  emptyMessage?: string
  dateFrom: string
  dateTo: string
  mode: DateMode
  tz: string | null
  sortable?: boolean
  isRange?: boolean
  onUntrack: (viewId: string) => void
  onPin: (viewId: string) => void
  onConnectionAssigned: (updated: View) => void
  onReorder: (newDispatchTilesIds: string[]) => void
}

export function ProjectTilesSection({
  views,
  loading = false,
  emptyMessage,
  dateFrom,
  dateTo,
  mode,
  tz,
  sortable = true,
  isRange = false,
  onUntrack,
  onPin,
  onConnectionAssigned,
  onReorder,
}: ProjectTilesSectionProps) {
  const { tileCount } = deriveOverviewComposite(views)
  const showEmpty = !loading && tileCount === 0

  if (showEmpty && !emptyMessage) return null

  return (
    <div className={PROJECT_VIEW_SURFACE_WRAP}>
      <section className={`${PROJECT_VIEW_CARD} p-5`}>
        {loading ? (
          <div className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[140px] rounded-xl bg-black/[0.05]" />
            ))}
          </div>
        ) : tileCount > 0 ? (
          <ProjectBodyViews
            views={views}
            isRange={isRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            mode={mode}
            tz={tz}
            handleUntrack={onUntrack}
            handlePin={onPin}
            handleConnectionAssigned={onConnectionAssigned}
            handleReorder={onReorder}
            sortable={sortable}
          />
        ) : (
          <p className="py-6 text-xs text-muted-foreground">{emptyMessage}</p>
        )}
      </section>
    </div>
  )
}
