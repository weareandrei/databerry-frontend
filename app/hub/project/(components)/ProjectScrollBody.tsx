'use client'

import { Plus } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

interface ProjectScrollBodyProps {
  children: ReactNode
  onCreateView?: () => void
}

export function ProjectScrollBody({ children, onCreateView }: ProjectScrollBodyProps) {
  return (
    <div className="relative flex flex-1 min-h-0 flex-col">
      <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain bg-white p-3 pb-24 md:px-6 md:py-6 md:pt-6 md:pb-6">
        {children}
      </div>

      {onCreateView && (
        <button
          type="button"
          onClick={onCreateView}
          className="md:hidden absolute bottom-5 right-5 z-40 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-6px_rgba(0,0,0,0.35)] transition-colors hover:bg-primary/90 cursor-pointer"
        >
          <Plus size={16} weight="bold" />
          Create
        </button>
      )}
    </div>
  )
}
