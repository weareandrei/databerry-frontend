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

import { useState, useCallback } from 'react'
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
import { FilteredPointerSensor } from '@/app/hub/(components)/widgets/(components)/dnd/FilteredPointerSensor'
import { SortableTile } from '@/app/hub/(components)/widgets/(components)/dnd/SortableTile'
import { OverviewChartWidgetConnected } from '@/app/hub/(components)/widgets/overview/OverviewChartWidgetConnected'
import { OverviewSourcesWidgetConnected } from '@/app/hub/(components)/widgets/overview/OverviewSourcesWidgetConnected'
import { ProjectUsersWidget } from '@/app/hub/(components)/widgets/users/ProjectUsersWidget'
import {
  WidePosthogWidgetRenderer,
  isWidePosthogView,
} from '@/app/hub/(components)/widgets/renderers/WidePosthogWidgetRenderer'
import { WidgetRenderer } from '@/app/hub/(components)/widgets/renderers/WidgetRenderer'
import {
  PROJECT_OVERVIEW_CHART_PANE,
  PROJECT_OVERVIEW_LAYOUT_GRID,
  PROJECT_OVERVIEW_SOURCES_PANE,
  deriveOverviewComposite,
} from '@/app/hub/project/(components)/projectViewUtils'
import { ViewWrapper } from './ViewWrapper'
import {
  cellSpanClasses,
  getViewSizing,
  PROJECT_GRID_AUTO_ROW_HEIGHT_PX,
  PROJECT_GRID_CONTAINER_CLASS,
} from '@/constants/viewSizing'
import type { DateMode } from '@/types/dates'
import type { Widget } from '@/types/widget'

export interface WidgetsGridProps {
  widgets: Widget[]
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: DateMode
  /** Forwarded to `WidgetRenderer` → per-view data hooks. Read once
   *  in `useProjectView` from `state.ui.globalTimeZone`. */
  tz: string | null
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
  handleConnectionAssigned: (updated: Widget) => void
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

export function WidgetsGrid({
  widgets,
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
}: WidgetsGridProps) {
  const chartWidget = widgets.find(w => w.type === 'project_overview')
  const sourcesWidget = widgets.find(w => w.type === 'project_overview_sources')
  const compositeIds =
    chartWidget && sourcesWidget ? new Set([chartWidget.id, sourcesWidget.id]) : null

  const dispatchTiles: Widget[] = widgets.filter(w => !compositeIds?.has(w.id))

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

  const tileWrapperClass = (view: Widget): string => {
    const displayMode = (view.config as { displayMode?: string } | null)?.displayMode
    return cellSpanClasses(getViewSizing(view.type, displayMode))
  }

  // Per-view-type renderer dispatch. The grid is uniform; only the
  // body inside each cell differs.
  const renderTileBody = (view: Widget): React.ReactNode => {
    if (view.type === 'project_overview' || view.type === 'custom_chart') {
      // Chrome (border + shadow) for `custom_chart` only — those are
      // standalone "Chart" tiles that should match every other tile.
      // `project_overview` reaches this dispatch only when its
      // sources sibling is missing; it stays borderless to match the
      // composite block it normally pairs with.
      return (
        <OverviewChartWidgetConnected
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
        <OverviewSourcesWidgetConnected
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
        <ProjectUsersWidget
          view={view}
          onUntrack={handleUntrack}
          onPin={handlePin}
        />
      )
    }
    if (isWidePosthogView(view)) {
      return (
        <WidePosthogWidgetRenderer
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
      <WidgetRenderer
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
  chartView: Widget
  sourcesView: Widget
  dateFrom: string
  dateTo: string
  mode: DateMode
  handleUntrack: (viewId: string) => void
}

/**
 * The project's headline overview: chart and sources as two separate
 * white panes side-by-side from 1200px up (stacked below that), each with its
 * own border and ⋮ menu. The grey `bg-surface` tray wraps both at the
 * section level (`ProjectOverviewWidget`).
 */
export function OverviewComposite({
  chartView,
  sourcesView,
  dateTo,
  dateFrom,
  mode,
  handleUntrack,
}: OverviewCompositeProps) {
  const [hoveredSourceKey, setHoveredSourceKey] = useState<string | null>(null)
  const [hiddenSourceKeys, setHiddenSourceKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const handleSourceToggle = useCallback((key: string) => {
    setHiddenSourceKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  return (
    <div className={PROJECT_OVERVIEW_LAYOUT_GRID}>
      <div className={PROJECT_OVERVIEW_CHART_PANE}>
        <div className="flex min-h-0 flex-1 flex-col">
          <OverviewChartWidgetConnected
            view={chartView}
            dateFrom={dateFrom}
            dateTo={dateTo}
            mode={mode}
            onUntrack={() => handleUntrack(chartView.id)}
            externalHoveredSourceKey={hoveredSourceKey}
            hiddenSourceKeys={hiddenSourceKeys}
          />
        </div>
      </div>
      <div className={PROJECT_OVERVIEW_SOURCES_PANE}>
        <div className="flex min-h-0 flex-1 flex-col">
          <OverviewSourcesWidgetConnected
            view={sourcesView}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onUntrack={() => handleUntrack(sourcesView.id)}
            onSourceHover={setHoveredSourceKey}
            hiddenSourceKeys={hiddenSourceKeys}
            onSourceToggle={handleSourceToggle}
          />
        </div>
      </div>
    </div>
  )
}

const WIDGET_GRID_CARD = 'bg-white rounded-2xl border border-stroke shadow-card'

interface WidgetsViewProps {
  widgets: Widget[]
  loading?: boolean
  emptyMessage?: string
  dateFrom: string
  dateTo: string
  mode: DateMode
  tz: string | null
  sortable?: boolean
  isRange?: boolean
  onUntrack: (widgetId: string) => void
  onPin: (widgetId: string) => void
  onConnectionAssigned: (updated: Widget) => void
  onReorder: (newDispatchTilesIds: string[]) => void
}

/** Draggable widget grid inside the grey project view tray. */
export function WidgetsView({
  widgets,
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
}: WidgetsViewProps) {
  const { tileCount } = deriveOverviewComposite(widgets)
  const showEmpty = !loading && tileCount === 0

  if (showEmpty && !emptyMessage) return null

  return (
    <ViewWrapper>
      <section className={`${WIDGET_GRID_CARD} p-5`}>
        {loading ? (
          <div className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[140px] rounded-xl bg-black/[0.05]" />
            ))}
          </div>
        ) : tileCount > 0 ? (
          <WidgetsGrid
            widgets={widgets}
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
    </ViewWrapper>
  )
}
