'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { House, Folders, PlugsConnected, List, X } from '@phosphor-icons/react'
import { Separator } from '@/components/ui/separator'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarUserProfile } from './SidebarUserProfile'
import { SidebarFolderItem } from './SidebarFolderItem'
import { useDashboard } from '@/contexts/DashboardContext'

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const { folders: foldersCtx } = useDashboard()
  const rootFolders = foldersCtx.getRootFolders()

  return (
    <div className="flex flex-col flex-1 overflow-hidden" onClick={onNavigate}>
      <div className="px-3 pt-3 pb-2">
        <SidebarUserProfile />
      </div>

      <nav className="px-2 space-y-0.5">
        <SidebarNavItem href="/hub/home" label="Home" icon={House} />
        <SidebarNavItem href="/hub/all-folders" label="All folders" icon={Folders} />
        <SidebarNavItem href="/hub/connections" label="Connections" icon={PlugsConnected} />
      </nav>

      <Separator className="my-3" />

      <div className="flex-1 overflow-y-auto px-1 space-y-0.5">
        {rootFolders.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No folders yet</p>
        ) : (
          rootFolders.map(folder => <SidebarFolderItem key={folder.id} folder={folder} />)
        )}
      </div>
    </div>
  )
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 border-r bg-background shrink-0">
        <SidebarContents />
      </aside>

      {/* Mobile burger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg hover:bg-accent"
        onClick={() => setIsOpen(v => !v)}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <List size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Mobile curtain */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden fixed inset-0 z-40 bg-background flex flex-col overflow-hidden"
          >
            <div className="pt-14 flex flex-col flex-1 overflow-hidden">
              <SidebarContents onNavigate={() => setIsOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
