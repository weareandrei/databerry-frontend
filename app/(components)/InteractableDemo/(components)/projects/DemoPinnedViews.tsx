'use client'

import { useDemoContext } from '../context/DemoContext'
import { DemoViewCard } from '../DemoViewCard'
import type { DemoView } from '../context/DemoContext'

interface DemoPinnedViewsProps {
  pins: DemoView[]
}

export function DemoPinnedViews({ pins }: DemoPinnedViewsProps) {
  const { togglePin, deleteView } = useDemoContext()

  if (pins.length === 0) return null

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      style={{ gridAutoRows: '110px' }}
    >
      {pins.map(v => (
        <DemoViewCard
          key={v.id}
          view={v}
          onUntrack={() => deleteView(v.id)}
          onPin={() => togglePin(v.id)}
        />
      ))}
    </div>
  )
}
