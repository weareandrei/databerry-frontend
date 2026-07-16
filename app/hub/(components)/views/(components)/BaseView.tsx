'use client'

import { cn } from '@/lib/utils'

export interface BaseViewProps {
  header?: React.ReactNode
  body?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

/** Flat page-level view shell — grey tray is `ViewWrapper`; no widget depth chrome. */
export function BaseView({ header, body, children, className }: BaseViewProps) {
  const inner =
    header != null || body != null ? (
      <>
        {header}
        {body}
      </>
    ) : (
      children
    )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-stroke bg-white shadow-card',
        className,
      )}
    >
      {inner}
    </div>
  )
}
