'use client'

export function TimelineLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-black/[0.04]" />
      ))}
    </div>
  )
}
