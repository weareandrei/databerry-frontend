export interface View {
  id: string
  folderId: string
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
