'use client'

import { DragGrip } from './dnd/DragGrip'
import { cn } from '@/lib/utils'

export interface WidgetHeaderProps {
  icon?: React.ReactNode
  header: React.ReactNode
  subHeader?: React.ReactNode
  actions?: React.ReactNode
  headerClassName?: string
  subHeaderClassName?: string
  className?: string
  /** Compact single-line layout (pinned views, narrow tiles). */
  compact?: boolean
  /** Show drag grip before the icon. */
  showDragGrip?: boolean
}

export function WidgetHeader({
  icon,
  header,
  subHeader,
  actions,
  headerClassName,
  subHeaderClassName,
  className,
  compact = false,
  showDragGrip = true,
}: WidgetHeaderProps) {
  if (compact) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-between gap-1 px-4 pb-0 pt-3',
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {showDragGrip && <DragGrip />}
          {icon}
          <div className={cn('min-w-0 truncate text-sm font-semibold leading-tight text-muted-foreground', headerClassName)}>
            {header}
          </div>
        </div>
        {actions}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-start justify-between gap-1 px-4 pb-0 pt-3.5',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {showDragGrip && <DragGrip />}
        {icon}
        <div className="min-w-0">
          <div
            className={cn(
              'truncate text-md font-semibold leading-tight text-muted-foreground',
              headerClassName,
            )}
          >
            {header}
          </div>
          {subHeader != null && subHeader !== false && (
            <div className={cn('mt-0.5 flex flex-wrap items-center gap-1.5', subHeaderClassName)}>
              {subHeader}
            </div>
          )}
        </div>
      </div>
      {actions}
    </div>
  )
}
