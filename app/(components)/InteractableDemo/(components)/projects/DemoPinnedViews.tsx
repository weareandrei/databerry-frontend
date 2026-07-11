'use client'

/**
 * Pinned-views row for the demo home page. Mirrors the real
 * `<PinnedViews>` shape (single horizontal row with `<DemoViewCard>`
 * tiles), but at smaller scale + without the composite-overview
 * lane (those tiles take up the whole row width and don't fit
 * inside the demo card alongside other pinned tiles).
 *
 * Each tile gets a project-name pill via `projectName` so the user
 * can tell which project each pinned tile belongs to — the row
 * mixes tiles from multiple projects, and "Pageviews" alone is
 * ambiguous between Acme and Side Project. Inside a project page
 * the badge is omitted (project context is already obvious from
 * the surrounding chrome).
 *
 * Wraps `<DemoViewCard>` with the demo context's
 * `togglePin` / `deleteView` so unpin + untrack work directly from
 * the tile menu — same affordance the real app exposes.
 */

import { useDemoContext } from '../context/DemoContext'
import { DemoViewCard } from '../DemoViewCard'

export function DemoPinnedViews() {
  const { views, projects, togglePin, deleteView } = useDemoContext()
  // Only "small" pinned tiles render here — the composite overview
  // tiles take the whole row in the real app and would dwarf the
  // demo card's width. They're shown inside their owning project's
  // body via `<DemoProjectView>` instead.
  const pinned = views.filter(
    v =>
      v.pinned &&
      v.kind !== 'overview-chart' &&
      v.kind !== 'overview-sources',
  )

  if (pinned.length === 0) return null

  // Build an id → name lookup once so each tile-render is O(1)
  // instead of `projects.find(...)` per tile.
  const projectNameById = new Map(projects.map(p => [p.id, p.name]))

  return (
    // Single column on mobile — same reasoning as `DemoProjectView`'s
    // tile grid: the demo card is too narrow on phones for 2 cols to
    // breathe. Steps up to 2 / 3 cols at `sm:` / `md:` so on a
    // tablet+ the pinned row still reads as a row, not a stack.
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
      style={{ gridAutoRows: '110px' }}
    >
      {pinned.map(v => (
        <DemoViewCard
          key={v.id}
          view={v}
          onUntrack={() => deleteView(v.id)}
          onPin={() => togglePin(v.id)}
          projectName={projectNameById.get(v.projectId)}
        />
      ))}
    </div>
  )
}
