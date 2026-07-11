'use client'

import { Plus } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

interface ProjectScrollBodyProps {
  children: ReactNode
  onCreateView?: () => void
}

export function ProjectScrollBody({ children, onCreateView }: ProjectScrollBodyProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain bg-white px-6 py-6 pt-4 md:pt-6">
      {onCreateView && (
        <button
          type="button"
          onClick={onCreateView}
          className="md:hidden flex items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          Create view
        </button>
      )}
      {children}
    </div>
  )
}
