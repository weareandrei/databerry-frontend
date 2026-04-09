'use client'

import { House, Folders, PlugsConnected } from '@phosphor-icons/react'
import { Separator } from '@/components/ui/separator'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarUserProfile } from './SidebarUserProfile'
import { SidebarFolderItem } from './SidebarFolderItem'
import { useDashboard } from '@/contexts/DashboardContext'

export function Sidebar() {
  const { folders: foldersCtx } = useDashboard()
  const rootFolders = foldersCtx.getRootFolders()

  return (
    <aside className="flex flex-col w-60 h-screen sticky top-0 border-r bg-background shrink-0">
      {/* User profile */}
      <div className="px-3 pt-3 pb-2">
        <SidebarUserProfile />
      </div>

      {/* Top nav */}
      <nav className="px-2 space-y-0.5">
        <SidebarNavItem href="/hub/home" label="Home" icon={House} />
        <SidebarNavItem href="/hub/all-folders" label="All folders" icon={Folders} />
        <SidebarNavItem href="/hub/connections" label="Connections" icon={PlugsConnected} />
      </nav>

      <Separator className="my-3" />

      {/* Folders */}
      <div className="flex-1 overflow-y-auto px-1 space-y-0.5">
        {rootFolders.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No folders yet</p>
        ) : (
          rootFolders.map(folder => <SidebarFolderItem key={folder.id} folder={folder} />)
        )}
      </div>
    </aside>
  )
}
