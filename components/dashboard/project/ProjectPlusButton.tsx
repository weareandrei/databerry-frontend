'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FolderPlus, Eye } from '@phosphor-icons/react'

interface ProjectPlusButtonProps {
  onCreateFolder: () => void
  onAddView: () => void
}

export function ProjectPlusButton({ onCreateFolder, onAddView }: ProjectPlusButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="flex flex-col gap-1.5 items-end"
          >
            <button
              onClick={() => { setOpen(false); onCreateFolder() }}
              className="flex items-center gap-2 rounded-full bg-white border border-black/[0.08] shadow-sm px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/5 transition-colors whitespace-nowrap"
            >
              <FolderPlus size={13} weight="bold" />
              Create folder
            </button>
            <button
              onClick={() => { setOpen(false); onAddView() }}
              className="flex items-center gap-2 rounded-full bg-white border border-black/[0.08] shadow-sm px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/5 transition-colors whitespace-nowrap"
            >
              <Eye size={13} weight="bold" />
              Add view
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center w-9 h-9 rounded-full shadow-md transition-transform active:scale-95 bg-brand"
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.15 }}>
          <Plus size={16} weight="bold" className="text-white" />
        </motion.div>
      </button>
    </div>
  )
}
