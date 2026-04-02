import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  createFolderModalOpen: boolean
  createFolderParentId: string | null
  createConnectionModalOpen: boolean
  createConnectionFolderId: string | null
  createViewModalOpen: boolean
  createViewFolderId: string | null
}

const initialState: UiState = {
  createFolderModalOpen: false,
  createFolderParentId: null,
  createConnectionModalOpen: false,
  createConnectionFolderId: null,
  createViewModalOpen: false,
  createViewFolderId: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openCreateFolderModal(state, action: PayloadAction<string | null>) {
      state.createFolderModalOpen = true
      state.createFolderParentId = action.payload
    },
    closeCreateFolderModal(state) {
      state.createFolderModalOpen = false
      state.createFolderParentId = null
    },
    openCreateConnectionModal(state, action: PayloadAction<string | null>) {
      state.createConnectionModalOpen = true
      state.createConnectionFolderId = action.payload
    },
    closeCreateConnectionModal(state) {
      state.createConnectionModalOpen = false
      state.createConnectionFolderId = null
    },
    openCreateViewModal(state, action: PayloadAction<string | null>) {
      state.createViewModalOpen = true
      state.createViewFolderId = action.payload
    },
    closeCreateViewModal(state) {
      state.createViewModalOpen = false
      state.createViewFolderId = null
    },
  },
})

export const {
  openCreateFolderModal,
  closeCreateFolderModal,
  openCreateConnectionModal,
  closeCreateConnectionModal,
  openCreateViewModal,
  closeCreateViewModal,
} = uiSlice.actions
export default uiSlice.reducer
