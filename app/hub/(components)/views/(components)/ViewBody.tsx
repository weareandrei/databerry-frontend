'use client'

import { cn } from '@/lib/utils'

export interface ViewBodyProps {
  children: React.ReactNode
  className?: string
}

export function ViewBody({ children, className }: ViewBodyProps) {
  return <div className={cn('p-5', className)}>{children}</div>
}
