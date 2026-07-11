'use client'

import { cn } from '@/lib/utils'

export type ViewVariant = 'default' | 'borderless'

interface ViewWrapperProps {
  children: React.ReactNode
  className?: string
  variant?: ViewVariant
  /** Outer corner radius — folders use `lg`; view tiles default to `xl`. */
  radius?: 'lg' | 'xl'
  /** Tighter 3D offset — used by folder tiles. */
  compact?: boolean
}

export function ViewWrapper({
  children,
  className,
  variant = 'default',
  radius = 'xl',
  compact = false,
}: ViewWrapperProps) {
  const rounded = radius === 'lg' ? 'rounded-lg' : 'rounded-xl'
  const depth = compact ? 'top-0.5 bottom-[-3px]' : 'top-1 bottom-[-5px]'

  if (variant === 'borderless') {
    return (
      <div className={cn('relative h-full', className)}>
        <div className={cn('relative flex flex-col h-full bg-white', rounded)}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative h-full group', className)}>
      {/* Shadow notch — darkens on hover */}
      <div
        className={cn(
          'absolute inset-x-0 border border-stroke bg-layer transition-colors duration-200 group-hover:bg-hover-fill',
          depth,
          rounded,
        )}
      />
      {/* Main card */}
      <div className={cn('relative flex flex-col h-full bg-white border border-stroke shadow-card', rounded)}>
        {children}
      </div>
    </div>
  )
}
