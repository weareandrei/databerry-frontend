'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'

export default function AllFoldersPage() {
  const { folders: foldersCtx } = useDashboard()
  // All non-root folders visible here for browsing
  const allFolders = foldersCtx.folders

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">All Folders</h1>

      {allFolders.length > 0 ? (
        <FolderGrid
          folders={allFolders}
          onDeleteFolder={foldersCtx.deleteFolder}
          onCreateSubfolder={foldersCtx.openModal}
        />
      ) : (
        <p className="text-muted-foreground text-sm">No folders yet.</p>
      )}
    </div>
  )
}
