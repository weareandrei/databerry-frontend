import { FolderCard } from './FolderCard'
import type { Folder } from '@/types/folder'

interface FolderGridProps {
  folders: Folder[]
  onDeleteFolder: (id: string) => void
  onCreateSubfolder: (parentId: string, projectId: string) => void
  onFolderClick?: (id: string) => void
}

export function FolderGrid({ folders, onDeleteFolder, onCreateSubfolder, onFolderClick }: FolderGridProps) {
  if (folders.length === 0) return null

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 5xl:grid-cols-6">
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
