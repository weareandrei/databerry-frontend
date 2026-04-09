import { FolderCard } from './FolderCard'
import type { Folder } from '@/types/folder'

interface FolderGridProps {
  folders: Folder[]
  onDeleteFolder: (id: string) => void
  onCreateSubfolder: (parentId: string) => void
  onFolderClick?: (id: string) => void
}

export function FolderGrid({
  folders,
  onDeleteFolder,
  onCreateSubfolder,
  onFolderClick,
}: FolderGridProps) {
  if (folders.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-medium text-left text-muted-foreground mb-3">Folders</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {folders.map(folder => (
          <FolderCard
            key={folder.id}
            folder={folder}
            onDelete={onDeleteFolder}
            onCreateSubfolder={onCreateSubfolder}
            onClick={onFolderClick}
          />
        ))}
      </div>
    </div>
  )
}
