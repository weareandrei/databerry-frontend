import { Plus } from '@phosphor-icons/react'
import { FolderCard } from './FolderCard'
import { ViewWrapper } from '@/app/hub/(components)/view/ViewWrapper'
import type { Folder } from '@/types/folder'

interface FolderGridProps {
  folders: Folder[]
  onDeleteFolder: (id: string) => void
  onCreateSubfolder: (parentId: string, projectId: string) => void
  /**
   * Optional rename handler — passes through to each `FolderCard`.
   * When omitted, cards drop the Rename menu item.
   */
  onRenameFolder?: (folderId: string, newName: string) => void | Promise<void>
  onFolderClick?: (id: string) => void
  onCreateFolder?: () => void
}

export function FolderGrid({
  folders,
  onDeleteFolder,
  onCreateSubfolder,
  onRenameFolder,
  onFolderClick,
  onCreateFolder,
}: FolderGridProps) {
  if (folders.length === 0 && !onCreateFolder) return null

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6">
      {folders.map(folder => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onDelete={onDeleteFolder}
          onCreateSubfolder={onCreateSubfolder}
          onRename={onRenameFolder}
          onClick={onFolderClick}
        />
      ))}
      {onCreateFolder && (
        <button onClick={onCreateFolder} className="flex w-fit text-left cursor-pointer">
          <ViewWrapper>
            <div className="flex items-center gap-2 px-3 py-3">
              <Plus size={16} weight="bold" className="text-grey-light shrink-0" />
              <span className="text-sm font-medium text-grey-light whitespace-nowrap">New folder</span>
            </div>
          </ViewWrapper>
        </button>
      )}
    </div>
  )
}
