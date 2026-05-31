'use client'

/**
 * Drag-and-drop wrapper for one view tile + the plumbing that lets the
 * tile's own header become the drag handle.
 *
 * Why a wrapper + context (not props passed through every card):
 *   `useSortable` returns listeners that have to be attached to an
 *   actual DOM element to be picked up. The "natural" element is each
 *   view card's header — but the header lives several components deep
 *   (`ViewCard → ViewHeader`, or `ViewCardOverviewChart`'s bespoke
 *   selector row). Threading `dragListeners` as a prop through every
 *   intermediate card just to land in the header would touch ~10 files
 *   and add boilerplate to every renderer.
 *
 *   Instead the wrapper exposes `listeners`/`attributes`/`isDragging`
 *   via `DragHandleContext`. Any header (or in-header grip) consumes
 *   the context with `useDragHandle()` and attaches the listeners
 *   itself. Cards that don't read the context render normally — no
 *   prop drilling, no breakage for tiles outside a sortable surface
 *   (mobile body, pinned views, demo cards).
 *
 * The composite project_overview pair is rendered OUTSIDE the parent
 * `<SortableContext>`, so it never instantiates one of these wrappers
 * — it's the immovable anchor by construction.
 */

import { createContext, useContext, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Context shape ─────────────────────────────────────────────────────────
//
// Listeners/attributes are spread onto whatever DOM node should act as
// the drag handle (header text cluster, in-header grip, etc.). Typed
// off `useSortable`'s return so callers can spread them directly with
// no `any` casts.
type SortableReturn = ReturnType<typeof useSortable>
type Listeners = SortableReturn['listeners']
type Attributes = SortableReturn['attributes']

interface DragHandleContextValue {
  /** When undefined, the tile isn't inside a sortable context — header
   *  renders normally (no grip, no grab cursor). When defined, spread
   *  onto the handle element along with `attributes`. */
  listeners: Listeners | undefined
  attributes: Attributes | undefined
  isDragging: boolean
}

const DragHandleContext = createContext<DragHandleContextValue>({
  listeners: undefined,
  attributes: undefined,
  isDragging: false,
})

/**
 * Consume the drag-handle plumbing from the nearest `<SortableTile>`.
 * Returns `{ listeners: undefined }` outside any sortable context, so
 * headers / grips can branch cleanly on `if (drag.listeners) …`.
 */
export function useDragHandle(): DragHandleContextValue {
  return useContext(DragHandleContext)
}

// ── Wrapper ───────────────────────────────────────────────────────────────

interface SortableTileProps {
  /** The view id — must match the id in the parent `<SortableContext>`'s
   *  items array. */
  id: string
  /** Grid-cell classes (`col-span-*` / `row-span-*`) for this tile. */
  className?: string
  children: React.ReactNode
}

export function SortableTile({ id, className, children }: SortableTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  // `CSS.Translate.toString(transform)` produces the GPU-friendly
  // `translate3d(...)` string dnd-kit's docs recommend. `transition`
  // is the spring config dnd-kit derives for smooth settle-into-place
  // animations on neighbours after a drop.
  //
  // Lift while dragging:
  //   - `opacity: 0.6` softens the source tile so the user sees the
  //     drop target underneath through it (without going invisible —
  //     they need to still see what they're holding).
  //   - `zIndex: 10` brings it above neighbours during the drag so any
  //     shadow / glow isn't clipped by adjacent tiles. The composite
  //     pair has `z-30` from its section wrapper and stays above.
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  // Drag listeners now live on the OUTER wrapper, not on a grip
  // button — so the whole tile area (header, padding, anywhere except
  // the body) starts a drag. The body opts out per-card via
  // `data-no-dnd="true"`, which `FilteredPointerSensor` checks before
  // activating. Header buttons stay clickable because the underlying
  // 5 px activation distance means a no-movement click never crosses
  // into drag territory.
  //
  // The Provider stays mounted but exposes `listeners: undefined` so
  // any lingering `<DragGrip>` in a header renders null (it's gated
  // on `if (!drag.listeners) return null`). This keeps the visual
  // grip gone without ripping the context plumbing out of every
  // shared header — easy to revert if we ever want a dedicated grip
  // back. `isDragging` IS still exposed (e.g. for cursor or opacity
  // tweaks in headers).
  const dragHandleValue = useMemo(
    () => ({ listeners: undefined, attributes: undefined, isDragging }),
    [isDragging],
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      {...listeners}
      {...attributes}
    >
      <DragHandleContext.Provider value={dragHandleValue}>
        {children}
      </DragHandleContext.Provider>
    </div>
  )
}
