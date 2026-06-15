/**
 * Shared loading skeletons for view bodies.
 *
 * Replaces the old spinning `ArrowsClockwise` loaders: a view — on
 * first load OR on refresh — now shows soft pulsing placeholders, the
 * same calm style as the People table and the person-events bottom
 * sheet (`animate-pulse` + `bg-black/[0.04]` rounded shapes). No more
 * spinners in the views body.
 */

/** N stacked rounded bars — for tables / lists. */
export function SkeletonRows({
  count = 5,
  rowClassName = 'h-9',
  className = '',
}: {
  count?: number
  /** Per-row classes — tune the height to the content (`h-9` table row,
   *  `h-12` list item, …). */
  rowClassName?: string
  className?: string
}) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`rounded-lg bg-black/[0.04] ${rowClassName}`} />
      ))}
    </div>
  )
}

/**
 * A single rounded block — for chart areas / funnels / value stubs.
 * Defaults to filling its parent (`h-full w-full`); pass an explicit
 * height/width for a value-sized stub (e.g. `h-7 w-20`).
 */
export function SkeletonBlock({ className = 'h-full w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/[0.04] ${className}`} />
}
