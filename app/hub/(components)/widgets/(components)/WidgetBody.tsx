'use client'

import { cn } from '@/lib/utils'

export interface WidgetBodyProps {
  children: React.ReactNode
  className?: string
  /** When true, pointer events inside the body won't start a tile drag. */
  noDrag?: boolean
}

export function WidgetBody({ children, className, noDrag = true }: WidgetBodyProps) {
  return (
    <div
      {...(noDrag ? { 'data-no-dnd': 'true' } : {})}
      className={cn('mt-3 flex min-h-0 flex-1 flex-col px-4 pb-4', className)}
    >
      {children}
    </div>
  )
}
