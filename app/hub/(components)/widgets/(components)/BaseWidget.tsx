'use client'

import { cn } from '@/lib/utils'

export type WidgetVariant = 'default' | 'borderless'

export interface BaseWidgetProps {
  header?: React.ReactNode
  body?: React.ReactNode
  children?: React.ReactNode
  className?: string
  variant?: WidgetVariant
  radius?: 'lg' | 'xl'
  compact?: boolean
}

export function BaseWidget({
  header,
  body,
  children,
  className,
  variant = 'default',
  radius = 'xl',
  compact = false,
}: BaseWidgetProps) {
  const rounded = radius === 'lg' ? 'rounded-lg' : 'rounded-xl'
  const depth = compact ? 'top-0.5 bottom-[-3px]' : 'top-1 bottom-[-5px]'
  const inner = header != null || body != null ? (
    <>
      {header}
      {body}
    </>
  ) : (
    children
  )

  if (variant === 'borderless') {
    return (
      <div className={cn('relative h-full min-h-0', className)}>
        <div className={cn('relative flex h-full min-h-0 flex-col bg-white', rounded)}>{inner}</div>
      </div>
    )
  }

  return (
    <div className={cn('group relative h-full', className)}>
      <div
        className={cn(
          'absolute inset-x-0 border border-stroke bg-layer transition-colors duration-200 group-hover:bg-hover-fill',
          depth,
          rounded,
        )}
      />
      <div className={cn('relative flex h-full flex-col border border-stroke bg-white shadow-card', rounded)}>
        {inner}
      </div>
    </div>
  )
}
