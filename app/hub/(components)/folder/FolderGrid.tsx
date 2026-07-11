import { FolderSimplePlus } from '@phosphor-icons/react'
import { FolderCard } from './(components)/FolderCard'
import { ViewWrapper } from '@/app/hub/(components)/view/(components)/ViewWrapper'
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
    <div className="flex flex-wrap items-start gap-2">
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
          <ViewWrapper radius="lg" compact className="w-fit">
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <FolderSimplePlus size={14} weight="bold" className="text-subtle shrink-0" />
              <span className="text-sm font-medium text-subtle whitespace-nowrap">New folder</span>
            </div>
          </ViewWrapper>
        </button>
      )}
    </div>
  )
}
