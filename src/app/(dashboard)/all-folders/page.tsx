'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FolderGrid } from '@/components/dashboard/FolderGrid'

export default function AllFoldersPage() {
  const { folders: foldersCtx } = useDashboard()
  const rootFolders = foldersCtx.getRootFolders()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <PageHeader title="All folders" />

      {rootFolders.length > 0 ? (
        <FolderGrid folders={rootFolders} />
      ) : (
        <p className="text-muted-foreground text-sm">
          No folders yet. Create one to start organizing your projects.
        </p>
      )}
    </div>
  )
}
