'use client'

/**
 * Six-dot grip used as the drag affordance on view-card headers.
 *
 * Renders ONLY when the surrounding `<SortableTile>` provided drag
 * listeners — i.e. only on sortable surfaces. Outside any sortable
 * context the component is a no-op, so headers can drop this in
 * unconditionally without breaking demo / mobile / pinned layouts.
 *
 * The grip itself is the handle: listeners + `attributes` are attached
 * to the icon's button, so a pointerdown anywhere on the six dots
 * starts the drag — the rest of the header stays clickable
 * (dropdowns, menus, the metric pills) without fighting the drag.
 * `touch-none` disables the browser's default touch-pan inside the
 * grip so mobile drag-to-reorder doesn't conflict with vertical
 * scroll.
 */

import { DotsSixVertical } from '@phosphor-icons/react'
import { useDragHandle } from './SortableTile'

interface DragGripProps {
  /** Optional extra classes (margin / size tweaks per header). */
  className?: string
}

export function DragGrip({ className }: DragGripProps) {
  const drag = useDragHandle()
  if (!drag.listeners) return null
  return (
    <button
      type="button"
      // `aria-label` so screen readers can describe the affordance;
      // keyboard activation is handled by dnd-kit's `attributes`
      // (which include `role`, `tabIndex`, `aria-roledescription`).
      aria-label="Reorder this view"
      className={`shrink-0 flex items-center justify-center w-5 h-5 rounded text-subtle hover:text-muted-foreground hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors touch-none ${
        drag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${className ?? ''}`}
      {...drag.listeners}
      {...drag.attributes}
    >
      <DotsSixVertical size={14} weight="bold" />
    </button>
  )
}
