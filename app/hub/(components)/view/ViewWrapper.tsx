'use client'

import { cn } from '@/lib/utils'

interface ViewWrapperProps {
  children: React.ReactNode
  className?: string
}

export function ViewWrapper({ children, className }: ViewWrapperProps) {
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
