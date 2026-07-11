'use client'

import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { PROJECT_VIEW_SURFACE_WRAP } from './projectViewUtils'
import type { Folder } from '@/types/folder'

interface FolderGridSectionProps {
  folders: Folder[]
  onDeleteFolder: (id: string) => void
  onCreateSubfolder: (parentId: string, projectId: string) => void
  onRenameFolder?: (folderId: string, newName: string) => void | Promise<void>
  onFolderClick?: (id: string) => void
  onCreateFolder?: () => void
}

export function FolderGridSection({
  folders,
  onDeleteFolder,
  onCreateSubfolder,
  onRenameFolder,
  onFolderClick,
  onCreateFolder,
}: FolderGridSectionProps) {
  if (folders.length === 0 && !onCreateFolder) return null

  return (
    <div className={PROJECT_VIEW_SURFACE_WRAP}>
      <FolderGrid
        folders={folders}
        onDeleteFolder={onDeleteFolder}
        onRenameFolder={onRenameFolder}
        onCreateSubfolder={onCreateSubfolder}
        onCreateFolder={onCreateFolder}
        onFolderClick={onFolderClick}
      />
    </div>
  )
}
