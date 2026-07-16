'use client'

import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { connectionName } from '../personEventUtils'

export function PersonEventsSourceFilters({
  sources,
  activeSource,
  onActiveSourceChange,
}: {
  sources: { key: string; count: number }[]
  activeSource: string | null
  onActiveSourceChange: (source: string | null) => void
}) {
  if (sources.length <= 1) return null

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map(({ key, count }) => {
        const active = activeSource === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onActiveSourceChange(active ? null : key)}
            className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-1 text-xs font-medium transition-colors cursor-pointer ${
              active
                ? 'border-foreground bg-surface text-foreground'
                : 'border-stroke bg-white text-muted-foreground hover:bg-hover-fill'
            }`}
          >
            <ConnectionIcon type={key} size={16} />
            <span>{connectionName(key)}</span>
            <span
              className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
                active ? 'bg-foreground text-white' : 'bg-surface text-muted-foreground'
              }`}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
