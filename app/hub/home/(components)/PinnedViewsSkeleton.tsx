/**
 * Loading placeholder for a "Pinned views" section on the dashboard
 * home. Shown while projects + pins are still fetching, so launching
 * the dashboard doesn't flash a blank gap where the pins will land.
 *
 * Mirrors the section's shape — a label stub, a headline chart block,
 * and a tile grid — in the same calm pulse style as the rest of the
 * app's skeletons (`animate-pulse` + soft `bg-black/[0.04]`). Pass
 * `singleColumn` on mobile to stack the tiles.
 */
export function PinnedViewsSkeleton({ singleColumn = false }: { singleColumn?: boolean }) {
  return (
    <section className="animate-pulse" aria-busy="true" aria-label="Loading pinned views">
      {/* Label: project favicon + "Pinned views" text. */}
      <div className="flex items-center gap-2 px-1 mb-4">
        <div className="h-[22px] w-[22px] rounded-md bg-black/[0.06]" />
        <div className="h-3 w-24 rounded bg-black/[0.06]" />
      </div>

      <div className="flex flex-col gap-4">
        {/* Headline chart block. */}
        <div className="h-[180px] rounded-xl bg-black/[0.04]" />
        {/* Tile grid. */}
        <div
          className={
            singleColumn
              ? 'flex flex-col gap-4'
              : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          }
        >
          {Array.from({ length: singleColumn ? 2 : 4 }).map((_, i) => (
            <div key={i} className="h-[140px] rounded-xl bg-black/[0.04]" />
          ))}
        </div>
      </div>
    </section>
  )
}
