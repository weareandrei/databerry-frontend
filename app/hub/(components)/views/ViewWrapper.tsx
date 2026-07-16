'use client'

import { cn } from '@/lib/utils'

interface ViewWrapperProps {
  children: React.ReactNode
  className?: string
  id?: string
}

/** Grey tray around each page-level view block (folders, overview, widgets grid, etc.). */
export function ViewWrapper({ children, className, id }: ViewWrapperProps) {
  return (
    <div id={id} className={cn('rounded-xl bg-surface p-3 md:p-4', className)}>
      {children}
    </div>
  )
}
