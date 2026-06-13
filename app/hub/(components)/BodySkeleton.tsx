'use client'

/**
 * Skeleton placeholder for a page body's content — shown while a
 * sub-page's views are loading (and by the project route group's
 * `loading.tsx` during route transitions). Mimics the typical shape
 * of a project body: a toolbar stub, a wide chart block + side
 * panel, then a row of small tiles. Pure CSS pulse — no spinner.
 */

export function BodySkeleton() {
  return (
    <div className="p-5 animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Toolbar stub */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-4 w-36 rounded-md bg-black/[0.05]" />
        <div className="h-9 w-32 rounded-full bg-black/[0.05]" />
      </div>
      {/* Headline chart + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-4 mb-6">
        <div className="h-[300px] rounded-xl bg-black/[0.05]" />
        <div className="h-[300px] rounded-xl bg-black/[0.04]" />
      </div>
      {/* Tile row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[140px] rounded-xl bg-black/[0.05]" />
        ))}
      </div>
    </div>
  )
}
