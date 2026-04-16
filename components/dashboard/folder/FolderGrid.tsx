import { FolderCard } from './FolderCard'
import type { Folder } from '@/types/folder'

interface FolderGridProps {
  folders: Folder[]
  onDeleteFolder: (id: string) => void
  onCreateSubfolder: (parentId: string, projectId: string) => void
  onFolderClick?: (id: string) => void
  cols?: number
}

export function FolderGrid({
  folders,
  onDeleteFolder,
  onCreateSubfolder,
  onFolderClick,
  cols,
}: FolderGridProps) {
  if (folders.length === 0) return null

  const gridClass = cols
    ? `grid-cols-${cols}`
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'

  return (
    <div className={`grid gap-3 ${gridClass}`}>
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
  )
}
