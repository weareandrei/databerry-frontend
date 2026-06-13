'use client'

/**
 * The views grid — lane layout + per-view-type dispatch shared by:
 *
 *   - `[project]/overview` (via `<ProjectBody>`): `sortable` ON —
 *     the only surface with drag-to-reorder
 *   - `[project]/views/charts|funnels`, `[project]/tools/[id]`
 *     (via `<ProjectFilteredViews>`): `sortable` OFF — auto-positioned
 *
 * Lane structure: the composite project_overview pair (chart +
 * sources) is the immovable top anchor; every other view flows
 * through the uniform tile grid in saved order.
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
import { ViewCardOverviewChartConnected } from '@/app/hub/(components)/view/ViewCardOverviewChartConnected'
import { ViewCardOverviewSourcesConnected } from '@/app/hub/(components)/view/ViewCardOverviewSourcesConnected'
import { ViewCardProjectUsersConnected } from '@/app/hub/(components)/view/ViewCardProjectUsersConnected'
import {
  WidePosthogViewRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/view/renderers/WidePosthogViewRenderer'
import { ViewCardRenderer } from '@/app/hub/(components)/view/renderers/ViewCardRenderer'
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
  const chartView = views.find(v => v.type === 'project_overview')
  const sourcesView = views.find(v => v.type === 'project_overview_sources')
  // The project_overview chart and its sources sibling are
  // conceptually ONE view that the user thinks of as "Project
  // overview" — stored as two rows (different data hooks + renderers)
  // but they always travel together. When BOTH exist they render as
  // one full-row composite, always anchored at the top and excluded
  // from the sortable set. When only one half survives, it drops back
  // into the regular dispatch.
  const compositePair = chartView && sourcesView ? { chartView, sourcesView } : null

  // The SORTABLE subset — order preserved from `views` (backend sorts
  // by saved position), so the user's manual order is respected.
  const dispatchTiles: View[] = views.filter(v => {
    if (
      compositePair &&
      (v.id === compositePair.chartView.id || v.id === compositePair.sourcesView.id)
    ) {
      return false
    }
    return true
  })

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

  if (!compositePair && dispatchTiles.length === 0) {
    return <div className="flex flex-col gap-6" />
  }

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
    <div
      className={PROJECT_GRID_CONTAINER_CLASS}
      style={{ gridAutoRows: `${PROJECT_GRID_AUTO_ROW_HEIGHT_PX}px` }}
    >
      {compositePair && (
        <CompositeOverviewPair
          chartView={compositePair.chartView}
          sourcesView={compositePair.sourcesView}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          handleUntrack={handleUntrack}
          handlePin={handlePin}
        />
      )}
      {/* `DndContext` + `SortableContext` render as fragments — no DOM
          nodes, so the tiles stay direct grid children. The composite
          pair above is OUTSIDE the SortableContext: immovable by
          construction. */}
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
  )
}

// ── Composite project_overview pair ────────────────────────────────────────

interface CompositeOverviewPairProps {
  chartView: View
  sourcesView: View
  dateFrom: string
  dateTo: string
  mode: DateMode
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
}

/**
 * Full-row composite. Internal grid: chart (1fr) left, sources
 * (280–360 px) right from `lg:` up; stacked below that. `row-span-3`
 * gives the page's most-read element extra vertical room.
 *
 * Owns the cross-component hover bridge: the sources panel reports
 * its hovered row's source key, the chart lights up matching stacked
 * bar segments. State scope is just this pair, so hovering never
 * re-renders sibling tiles.
 */
function CompositeOverviewPair({
  chartView,
  sourcesView,
  dateFrom,
  dateTo,
  mode,
  handleUntrack,
  handlePin,
}: CompositeOverviewPairProps) {
  const [hoveredSourceKey, setHoveredSourceKey] = useState<string | null>(null)
  return (
    <div className="col-span-full row-span-3 grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-4">
      <ViewCardOverviewChartConnected
        view={chartView}
        dateFrom={dateFrom}
        dateTo={dateTo}
        mode={mode}
        onUntrack={handleUntrack}
        onPin={handlePin}
        externalHoveredSourceKey={hoveredSourceKey}
      />
      <ViewCardOverviewSourcesConnected
        view={sourcesView}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onUntrack={handleUntrack}
        onPin={handlePin}
        onSourceHover={setHoveredSourceKey}
      />
    </div>
  )
}
