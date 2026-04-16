export interface Folder {
  id: string
  name: string
  projectId: string
  parentId: string | null
  userId: string
  color?: string
  createdAt: string
  updatedAt: string
}
