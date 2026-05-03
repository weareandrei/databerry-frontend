import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { View } from '@/types/view'

interface ViewsState {
  items: View[]
  loading: boolean
  error: string | null
  refreshKey: number
}

const initialState: ViewsState = {
  items: [],
  loading: false,
  error: null,
  refreshKey: 0,
}

const viewsSlice = createSlice({
  name: 'views',
  initialState,
  reducers: {
    setViews(state, action: PayloadAction<View[]>) {
      state.items = action.payload
    },
    addViews(state, action: PayloadAction<View[]>) {
      state.items.push(...action.payload)
      state.refreshKey += 1
    },
    removeView(state, action: PayloadAction<string>) {
      state.items = state.items.filter(v => v.id !== action.payload)
    },
    /**
     * Replace a single view by id. Used by the orphan reassignment flow so a
     * tile re-fetches its live value after a connection is attached, without
     * needing a full folder/page refetch. No-op if the id isn't in state.
     */
    replaceView(state, action: PayloadAction<View>) {
      const i = state.items.findIndex(v => v.id === action.payload.id)
      if (i !== -1) state.items[i] = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setViews, addViews, removeView, replaceView, setLoading } = viewsSlice.actions
export default viewsSlice.reducer
