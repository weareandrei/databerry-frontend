/**
 * Loading-state twin of `<ProjectSidebar>` — same floating-card
 * geometry and section rhythm, every block greyed and pulsing. Shown
 * by the project layout while the projects list is still hydrating,
 * so the sidebar's slot doesn't sit empty before the real project
 * resolves.
 *
 * Deliberately dependency-free (a sibling file, not an export inside
 * `ProjectSidebar.tsx`) so the loading path doesn't pull in
 * framer-motion or the dashboard context. The width / position
 * classes mirror the real sidebar — keep them in sync if that card
 * ever moves.
 */

function SkeletonSection({ rows }: { rows: number }) {
  return (
    <div className="mb-8">
      {/* section header */}
      <div className="h-3 w-20 rounded bg-black/[0.05] ml-5 mb-3" />
      {/* nav rows */}
      <div className="px-2 space-y-1.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-7 rounded-md bg-black/[0.04]" />
        ))}
      </div>
    </div>
  )
}

export function ProjectSidebarSkeleton() {
  return (
    <aside
      className="hidden md:flex flex-col fixed top-4 bottom-4 left-20 w-60 z-20 overflow-hidden bg-white rounded-2xl border border-stroke shadow-card animate-pulse"
      aria-hidden="true"
    >
      {/* Identity row — favicon + name + 3-dots. */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-6">
        <div className="w-[26px] h-[26px] rounded-md bg-black/[0.06] shrink-0" />
        <div className="h-3.5 flex-1 rounded bg-black/[0.06]" />
        <div className="w-8 h-8 rounded-full bg-black/[0.05] shrink-0" />
      </div>

      {/* Nav sections — mirrors Workspace (4) / Views (2) / My tools (3). */}
      <div className="flex-1 min-h-0">
        <SkeletonSection rows={4} />
        <SkeletonSection rows={2} />
        <SkeletonSection rows={3} />
      </div>

      {/* "Create view" button. */}
      <div className="shrink-0 px-3 pt-2 pb-1">
        <div className="h-10 rounded-full bg-black/[0.06]" />
      </div>
    </aside>
  )
}
