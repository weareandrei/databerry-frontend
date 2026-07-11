'use client'

/**
 * The views tile grid + the standalone overview composite.
 *
 * `<ProjectBodyViews>` renders the uniform tile grid of "every other
 * view" — it ALWAYS excludes the project_overview composite pair
 * (chart + sources), which is rendered separately via the exported
 * `<OverviewComposite>`. Used by:
 *
 *   - `[project]/overview` — the composite lives in its own card
 *     (`<OverviewComposite>`), the rest in a third card
 *     (`<ProjectBodyViews>`, `sortable` ON — the only drag surface)
 */

import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { FilteredPointerSensor } from '@/app/hub/(components)/view/dnd/FilteredPointerSensor'
import { SortableTile } from '@/app/hub/(components)/view/dnd/SortableTile'
import { ViewCardOverviewChartConnected } from '@/app/hub/(components)/view/(components)/ViewCardOverviewChartConnected'
import { ViewCardOverviewSourcesConnected } from '@/app/hub/(components)/view/(components)/ViewCardOverviewSourcesConnected'
import { ViewCardProjectUsersConnected } from '@/app/hub/(components)/view/(components)/ViewCardProjectUsersConnected'
import {
  WidePosthogViewRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/view/renderers/WidePosthogViewRenderer'
import { ViewCardRenderer } from '@/app/hub/(components)/view/renderers/ViewCardRenderer'
import { PROJECT_OVERVIEW_PANE } from './projectViewUtils'
import {
  cellSpanClasses,
  getViewSizing,
  PROJECT_GRID_AUTO_ROW_HEIGHT_PX,
  PROJECT_GRID_CONTAINER_CLASS,
} from '@/constants/viewSizing'
import type { DateMode } from '@/types/dates'
import type { View } from '@/types/view'

export interface ProjectBodyViewsProps {
  views: View[]
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: DateMode
  /** Forwarded to `ViewCardRenderer` → per-view data hooks. Read once
   *  in `useProjectView` from `state.ui.globalTimeZone`. */
  tz: string | null
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
  handleConnectionAssigned: (updated: View) => void
  /** Persist a new sortable-subset order after a drag. The composite
   *  pair is the immovable anchor — `handleReorder` always pins it to
   *  the front of the container at the storage layer. */
  handleReorder: (newDispatchTilesIds: string[]) => void
  /**
   * Drag-to-reorder. TRUE only on the project Overview page — every
   * other surface auto-positions its tiles and must not offer drag
   * affordances. When false the Dnd wrappers and `SortableTile`s are
   * skipped entirely; `handleReorder` is never called.
   */
  sortable?: boolean
}

export function ProjectBodyViews({
  views,
  isRange,
  dateFrom,
  dateTo,
  mode,
  tz,
  handleUntrack,
  handlePin,
  handleConnectionAssigned,
  handleReorder,
  sortable = true,
}: ProjectBodyViewsProps) {
  // The project_overview chart + its sources sibling are conceptually
  // ONE view ("Project overview"), stored as two rows. When BOTH
  // exist they're excluded here — the overview page renders them in
  // their own card via `<OverviewComposite>`. A lone half (the other
  // was deleted, or a filtered page surfaces just the chart) drops
  // back into the grid below.
  const chartView = views.find(v => v.type === 'project_overview')
  const sourcesView = views.find(v => v.type === 'project_overview_sources')
  const compositeIds =
    chartView && sourcesView ? new Set([chartView.id, sourcesView.id]) : null

  // The SORTABLE subset — order preserved from `views` (backend sorts
  // by saved position), so the user's manual order is respected.
  const dispatchTiles: View[] = views.filter(v => !compositeIds?.has(v.id))

  // DnD sensors:
  //   - `FilteredPointerSensor` skips activation when pointer-down
  //     lands inside a `[data-no-dnd="true"]` zone (each card body),
  //     so dragging a chart INSIDE a tile scrolls it, not the tile.
  //     5 px activation distance keeps quick clicks on header buttons
  //     from accidentally starting a drag.
  //   - KeyboardSensor for accessible reordering (Space to pick up,
  //     arrows to move, Space to drop).
  const sensors = useSensors(
    useSensor(FilteredPointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = dispatchTiles.findIndex(v => v.id === active.id)
    const newIndex = dispatchTiles.findIndex(v => v.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(dispatchTiles, oldIndex, newIndex).map(v => v.id)
    handleReorder(newOrder)
  }

  // No tiles to show — the caller (overview card / filtered page)
  // owns the empty state.
  if (dispatchTiles.length === 0) return null

  const tileWrapperClass = (view: View): string => {
    const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
    return cellSpanClasses(getViewSizing(view.type, displayMode))
  }

  // Per-view-type renderer dispatch. The grid is uniform; only the
  // body inside each cell differs.
  const renderTileBody = (view: View): React.ReactNode => {
    if (view.type === 'project_overview' || view.type === 'custom_chart') {
      // Chrome (border + shadow) for `custom_chart` only — those are
      // standalone "Chart" tiles that should match every other tile.
      // `project_overview` reaches this dispatch only when its
      // sources sibling is missing; it stays borderless to match the
      // composite block it normally pairs with.
      return (
        <ViewCardOverviewChartConnected
          view={view}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          onUntrack={handleUntrack}
          onPin={handlePin}
          withChrome={view.type === 'custom_chart'}
        />
      )
    }
    if (view.type === 'project_overview_sources') {
      return (
        <ViewCardOverviewSourcesConnected
          view={view}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onUntrack={handleUntrack}
          onPin={handlePin}
        />
      )
    }
    if (view.type === 'project_users') {
      // Connection-less cross-platform users list. Date range doesn't
      // apply (it reads the whole people graph).
      return (
        <ViewCardProjectUsersConnected
          view={view}
          onUntrack={handleUntrack}
          onPin={handlePin}
        />
      )
    }
    if (isWidePosthogView(view)) {
      return (
        <WidePosthogViewRenderer
          view={view}
          historical={isRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onUntrack={handleUntrack}
          onPin={handlePin}
          onConnectionAssigned={handleConnectionAssigned}
        />
      )
    }
    return (
      <ViewCardRenderer
        view={view}
        isRange={isRange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        mode={mode}
        tz={tz}
        onUntrack={handleUntrack}
        onPin={handlePin}
        onConnectionAssigned={handleConnectionAssigned}
      />
    )
  }

  return (
    // `@container` makes the grid below size its columns against THIS
    // wrapper's width (the real space the body has) rather than the
    // viewport — so tiles pack as densely as the column actually
    // allows. See `PROJECT_GRID_CONTAINER_CLASS` for the breakpoints.
    <div className="@container">
      <div
        className={PROJECT_GRID_CONTAINER_CLASS}
        style={{ gridAutoRows: `${PROJECT_GRID_AUTO_ROW_HEIGHT_PX}px` }}
      >
        {/* `DndContext` + `SortableContext` render as fragments — no DOM
            nodes, so the tiles stay direct grid children. */}
        {sortable ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={dispatchTiles.map(v => v.id)}
              strategy={rectSortingStrategy}
            >
              {dispatchTiles.map(view => (
                <SortableTile key={view.id} id={view.id} className={tileWrapperClass(view)}>
                  {renderTileBody(view)}
                </SortableTile>
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          // Auto-positioned: same cells, no drag wrappers.
          dispatchTiles.map(view => (
            <div key={view.id} className={tileWrapperClass(view)}>
              {renderTileBody(view)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Overview composite (chart + sources) ────────────────────────────────────

export interface OverviewCompositeProps {
  chartView: View
  sourcesView: View
  dateFrom: string
  dateTo: string
  mode: DateMode
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
}

/**
 * The project's headline overview: chart and sources as two separate
 * white panes side-by-side (stacked on narrow widths), each with its
 * own border and ⋮ menu. The grey `bg-surface` tray wraps both at the
 * section level (`ProjectOverviewSection`).
 */
export function OverviewComposite({
  chartView,
  sourcesView,
  dateTo,
  dateFrom,
  mode,
  handleUntrack,
  handlePin,
}: OverviewCompositeProps) {
  const [hoveredSourceKey, setHoveredSourceKey] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(240px,320px)] gap-4">
      <div className={PROJECT_OVERVIEW_PANE}>
        <div className="flex min-h-0 flex-1 flex-col">
          <ViewCardOverviewChartConnected
            view={chartView}
            dateFrom={dateFrom}
            dateTo={dateTo}
            mode={mode}
            onUntrack={() => handleUntrack(chartView.id)}
            onPin={() => handlePin(chartView.id)}
            externalHoveredSourceKey={hoveredSourceKey}
          />
        </div>
      </div>
      <div className={PROJECT_OVERVIEW_PANE}>
        <div className="flex min-h-0 flex-1 flex-col">
          <ViewCardOverviewSourcesConnected
            view={sourcesView}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onUntrack={() => handleUntrack(sourcesView.id)}
            onPin={() => handlePin(sourcesView.id)}
            onSourceHover={setHoveredSourceKey}
          />
        </div>
      </div>
    </div>
  )
}
