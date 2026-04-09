import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Folder } from '@/types/folder'

interface FoldersState {
  items: Folder[]
  loading: boolean
  error: string | null
}

const initialState: FoldersState = {
  items: [],
  loading: false,
  error: null,
}

const foldersSlice = createSlice({
  name: 'folders',
  initialState,
  reducers: {
    setFolders(state, action: PayloadAction<Folder[]>) {
      state.items = action.payload
    },
    addFolder(state, action: PayloadAction<Folder>) {
      state.items.push(action.payload)
    },
    removeFolder(state, action: PayloadAction<string>) {
      state.items = state.items.filter(f => f.id !== action.payload)
    },
    updateFolder(state, action: PayloadAction<Folder>) {
      const idx = state.items.findIndex(f => f.id === action.payload.id)
      if (idx !== -1) state.items[idx] = action.payload
    },
    setFoldersLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setFoldersError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
  },
})

export const {
  setFolders,
  addFolder,
  removeFolder,
  updateFolder,
  setFoldersLoading,
  setFoldersError,
} = foldersSlice.actions

export default foldersSlice.reducer
