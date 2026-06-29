'use client'

/**
 * Demo mirror of a project's "Pinned views" sub-page — the tiles the
 * user pinned, in the same grid the overview uses. Reuses
 * `<DemoViewCard>` so the tiles render identically to the overview.
 */

import { useDemoContext } from '../context/DemoContext'
import { DemoViewCard } from '../DemoViewCard'
import type { DemoProject } from '../context/DemoContext'

export function DemoPinned({ project }: { project: DemoProject }) {
  const { views, deleteView, togglePin } = useDemoContext()

  // Pinned tiles for this project — excluding the overview composite
  // halves (they're a project-level surface, not a pinnable tile).
  const pinned = views.filter(
    v =>
      v.projectId === project.id &&
      v.pinned &&
      v.kind !== 'overview-chart' &&
      v.kind !== 'overview-sources',
  )

  return (
    <div className="space-y-3 py-1">
      <h2 className="text-sm font-semibold text-grey-darkest">Pinned views</h2>
      {pinned.length === 0 ? (
        <p className="text-xs text-grey-light">
          No pinned views yet. Pin a tile from the Overview to surface it here.
        </p>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          style={{ gridAutoRows: '110px' }}
        >
          {pinned.map(v => (
            <DemoViewCard
              key={v.id}
              view={v}
              onUntrack={() => deleteView(v.id)}
              onPin={() => togglePin(v.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
