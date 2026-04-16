import { createSlice, PayloadAction } from '@reduxjs/toolkit'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface UiState {
  globalDateFrom: string
  globalDateTo: string
  createProjectModalOpen: boolean
  createFolderModalOpen: boolean
  createFolderParentId: string | null
  createFolderProjectId: string | null
  createConnectionModalOpen: boolean
  createConnectionFolderId: string | null
  createViewModalOpen: boolean
  createViewFolderId: string | null
  createViewProjectId: string | null
}

const initialState: UiState = {
  globalDateFrom: todayISO(),
  globalDateTo: todayISO(),
  createProjectModalOpen: false,
  createFolderModalOpen: false,
  createFolderParentId: null,
  createFolderProjectId: null,
  createConnectionModalOpen: false,
  createConnectionFolderId: null,
  createViewModalOpen: false,
  createViewFolderId: null,
  createViewProjectId: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setGlobalRange(state, action: PayloadAction<{ from: string; to: string }>) {
      state.globalDateFrom = action.payload.from
      state.globalDateTo = action.payload.to
    },
    shiftGlobalRange(state, action: PayloadAction<number>) {
      const today = todayISO()
      const newTo = shiftISO(state.globalDateTo, action.payload)
      // Don't shift forward past actual today
      if (newTo > today) return
      state.globalDateFrom = shiftISO(state.globalDateFrom, action.payload)
      state.globalDateTo = newTo
    },
    openCreateProjectModal(state) {
      state.createProjectModalOpen = true
    },
    closeCreateProjectModal(state) {
      state.createProjectModalOpen = false
    },
    openCreateFolderModal(state, action: PayloadAction<{ parentId: string | null; projectId: string }>) {
      state.createFolderModalOpen = true
      state.createFolderParentId = action.payload.parentId
      state.createFolderProjectId = action.payload.projectId
    },
    closeCreateFolderModal(state) {
      state.createFolderModalOpen = false
      state.createFolderParentId = null
      state.createFolderProjectId = null
    },
    openCreateConnectionModal(state, action: PayloadAction<string | null>) {
      state.createConnectionModalOpen = true
      state.createConnectionFolderId = action.payload
    },
    closeCreateConnectionModal(state) {
      state.createConnectionModalOpen = false
      state.createConnectionFolderId = null
    },
    openCreateViewModal(state, action: PayloadAction<{ folderId: string | null; projectId: string }>) {
      state.createViewModalOpen = true
      state.createViewFolderId = action.payload.folderId
      state.createViewProjectId = action.payload.projectId
    },
    closeCreateViewModal(state) {
      state.createViewModalOpen = false
      state.createViewFolderId = null
      state.createViewProjectId = null
    },
  },
})

export const {
  setGlobalRange,
  shiftGlobalRange,
  openCreateProjectModal,
  closeCreateProjectModal,
  openCreateFolderModal,
  closeCreateFolderModal,
  openCreateConnectionModal,
  closeCreateConnectionModal,
  openCreateViewModal,
  closeCreateViewModal,
} = uiSlice.actions
export default uiSlice.reducer
