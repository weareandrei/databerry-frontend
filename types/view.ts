export interface View {
  id: string
  projectId: string
  folderId: string | null
  connectionId: string | null
  connectionType: string
  type: string
  name: string
  config: Record<string, unknown>
  value: string | null
  isPinned: boolean
  userId: string
  createdAt: string
}
