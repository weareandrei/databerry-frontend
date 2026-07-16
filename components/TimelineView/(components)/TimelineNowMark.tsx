'use client'

/** Full-width "now" marker spanning the axis + node columns. */
export function TimelineNowMark({
  top,
  axisSize,
}: {
  top: number
  axisSize: number
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-0 left-0 z-[35] h-0.5 bg-primary"
      style={{ top }}
    >
      <span
        className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary"
        style={{ left: axisSize - 4 }}
      />
    </div>
  )
}
