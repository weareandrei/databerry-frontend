import { useState } from 'react'

export interface DemoFolder {
  id: string
  name: string
  parentId: string | null
}

const INITIAL_FOLDERS: DemoFolder[] = [
  { id: 'folder-1', name: 'Main Product', parentId: null },
  { id: 'folder-2', name: 'Side Project', parentId: null },
  { id: 'folder-3', name: 'Marketing', parentId: 'folder-1' },
]

export function useDemoFolders() {
  const [folders, setFolders] = useState<DemoFolder[]>(INITIAL_FOLDERS)

  function createFolder(name: string, parentId: string | null = null) {
    const newFolder: DemoFolder = { id: `folder-${Date.now()}`, name, parentId }
    setFolders(prev => [...prev, newFolder])
  }

  function deleteFolder(id: string) {
    const idsToDelete = collectIds(id, folders)
    setFolders(prev => prev.filter(f => !idsToDelete.has(f.id)))
  }

  return { folders, createFolder, deleteFolder }
}

function collectIds(rootId: string, folders: DemoFolder[]): Set<string> {
  const ids = new Set<string>([rootId])
  for (const f of folders) {
    if (f.parentId && ids.has(f.parentId)) ids.add(f.id)
  }
  return ids
}
