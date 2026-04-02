import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import type { RootState, AppDispatch } from '@/store'
import {
  addFolder,
  removeFolder,
  setFolders,
  updateFolder,
} from '@/store/slices/foldersSlice'
import { openCreateFolderModal, closeCreateFolderModal } from '@/store/slices/uiSlice'
import { ALGORITHM } from '@/lib/api'
import type { Folder } from '@/types/folder'

export function useFolders() {
  const dispatch = useDispatch<AppDispatch>()
  const folders = useSelector((state: RootState) => state.folders.items)
  const loading = useSelector((state: RootState) => state.folders.loading)
  const isModalOpen = useSelector((state: RootState) => state.ui.createFolderModalOpen)
  const createFolderParentId = useSelector(
    (state: RootState) => state.ui.createFolderParentId
  )

  const loadFolders = async () => {
    try {
      const data = await ALGORITHM.getFolders()
      dispatch(setFolders(data))
    } catch {
      toast.error('Failed to load folders')
    }
  }

  const createFolder = async (name: string, parentId: string | null) => {
    const now = new Date().toISOString()
    const tempId = `temp-${uuidv4()}`
    const optimistic: Folder = {
      id: tempId,
      name,
      parentId,
      userId: '',
      createdAt: now,
      updatedAt: now,
    }

    dispatch(addFolder(optimistic))
    dispatch(closeCreateFolderModal())

    try {
      const created = await ALGORITHM.createFolder({ name, parentId })
      dispatch(removeFolder(tempId))
      dispatch(addFolder(created))
    } catch {
      dispatch(removeFolder(tempId))
      toast.error('Failed to create folder')
    }
  }

  const renameFolder = async (folderId: string, name: string) => {
    const existing = folders.find((f) => f.id === folderId)
    if (!existing) return

    dispatch(updateFolder({ ...existing, name }))

    try {
      const updated = await ALGORITHM.updateFolder(folderId, { name })
      dispatch(updateFolder(updated))
    } catch {
      dispatch(updateFolder(existing))
      toast.error('Failed to rename folder')
    }
  }

  const deleteFolder = async (folderId: string) => {
    const snapshot = [...folders]
    dispatch(removeFolder(folderId))
    // Also remove all descendant folders from Redux
    const descendants = folders.filter((f) => isDescendant(f, folderId, folders))
    descendants.forEach((f) => dispatch(removeFolder(f.id)))

    try {
      await ALGORITHM.deleteFolder(folderId)
    } catch {
      snapshot.forEach((f) => dispatch(addFolder(f)))
      toast.error('Failed to delete folder')
    }
  }

  const getRootFolders = () => folders.filter((f) => f.parentId === null)
  const getChildFolders = (parentId: string) =>
    folders.filter((f) => f.parentId === parentId)

  return {
    folders,
    loading,
    isModalOpen,
    createFolderParentId,
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    getRootFolders,
    getChildFolders,
    openModal: (parentId: string | null = null) =>
      dispatch(openCreateFolderModal(parentId)),
    closeModal: () => dispatch(closeCreateFolderModal()),
  }
}

function isDescendant(folder: Folder, ancestorId: string, all: Folder[]): boolean {
  if (!folder.parentId) return false
  if (folder.parentId === ancestorId) return true
  const parent = all.find((f) => f.id === folder.parentId)
  return parent ? isDescendant(parent, ancestorId, all) : false
}
