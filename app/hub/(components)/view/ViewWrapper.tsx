'use client'

import { cn } from '@/lib/utils'

export type ViewVariant = 'default' | 'borderless'

interface ViewWrapperProps {
  children: React.ReactNode
  className?: string
  variant?: ViewVariant
}

export function ViewWrapper({ children, className, variant = 'default' }: ViewWrapperProps) {
  if (variant === 'borderless') {
    return (
      <div className={cn('relative h-full', className)}>
        <div className="relative flex flex-col h-full rounded-xl bg-white">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative h-full group', className)}>
      {/* Shadow notch — darkens on hover */}
      <div
        className="absolute inset-x-0 top-1 bottom-[-5px] rounded-xl border border-stroke bg-[#EAEAEA]/50 transition-colors duration-200 group-hover:bg-[#D0D0D0]/70"
      />
      {/* Main card */}
      <div className="relative flex flex-col h-full rounded-xl bg-white border border-stroke shadow-card">
        {children}
      </div>
    </div>
  )
}
