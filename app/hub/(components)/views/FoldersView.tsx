'use client'

import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { ViewWrapper } from './ViewWrapper'
import type { Folder } from '@/types/folder'

interface FoldersViewProps {
  folders: Folder[]
  onDeleteFolder: (id: string) => void
  onCreateSubfolder: (parentId: string, projectId: string) => void
  onRenameFolder?: (folderId: string, newName: string) => void | Promise<void>
  onFolderClick?: (id: string) => void
  onCreateFolder?: () => void
}

export function FoldersView({
  folders,
  onDeleteFolder,
  onCreateSubfolder,
  onRenameFolder,
  onFolderClick,
  onCreateFolder,
}: FoldersViewProps) {
  if (folders.length === 0 && !onCreateFolder) return null

  return (
    <ViewWrapper>
      <FolderGrid
        folders={folders}
        onDeleteFolder={onDeleteFolder}
        onRenameFolder={onRenameFolder}
        onCreateSubfolder={onCreateSubfolder}
        onCreateFolder={onCreateFolder}
        onFolderClick={onFolderClick}
      />
    </ViewWrapper>
  )
}
