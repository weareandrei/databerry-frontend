'use client'

/**
 * `PointerSensor` variant that ignores any pointer-down whose target
 * sits inside a `[data-no-dnd]` element.
 *
 * Why: the drag listeners are attached to the OUTER `<SortableTile>`
 * wrapper, so the whole tile area (header, padding, etc.) initiates a
 * drag. But the tile's BODY (chart, list, value display) shouldn't —
 * dragging from inside a chart should hover/scroll the chart, not move
 * the tile. Marking each card's body with `data-no-dnd="true"` lets
 * this sensor short-circuit cleanly, without `e.stopPropagation()`
 * scattered through every card.
 *
 * Header buttons (dropdowns / refresh) don't need any marker: the
 * 5 px activation constraint on the underlying sensor means a click
 * (no movement) never starts a drag — the button's `onClick` fires
 * normally. A click-and-drag motion on a button still starts a drag,
 * which is acceptable (intentional drag is allowed from anywhere
 * that isn't explicitly opted out).
 *
 * The activator is a re-implementation of `PointerSensor`'s default
 * with one extra check up front. Keeping the rest identical
 * (`isPrimary`, `button === 0`) means activation semantics are
 * unchanged outside the no-dnd guard.
 */

import { PointerSensor, type PointerSensorOptions } from '@dnd-kit/core'
import type { PointerEvent as ReactPointerEvent } from 'react'

export class FilteredPointerSensor extends PointerSensor {
  // Activator signature mirrors dnd-kit's own `PointerSensor.activators`
  // (see `node_modules/@dnd-kit/core/dist/sensors/pointer/PointerSensor.d.ts`).
  // The runtime passes the full sensor options as the second arg, which
  // is where `onActivation` comes from.
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent: event }: ReactPointerEvent,
        { onActivation }: PointerSensorOptions,
      ): boolean => {
        if (!event.isPrimary || event.button !== 0) return false
        // Walk up from the event's target — if any ancestor is marked
        // as a no-drag zone, reject activation. `closest()` on an
        // `Element` is O(depth) but a card tree is shallow.
        const target = event.target
        if (
          target instanceof Element &&
          target.closest('[data-no-dnd="true"]') != null
        ) {
          return false
        }
        onActivation?.({ event })
        return true
      },
    },
  ]
}

// Re-export the upstream options type so call sites that previously
// passed `{ activationConstraint: ... }` to `useSensor(PointerSensor)`
// can switch to this sensor with no type changes.
export type { PointerSensorOptions }
