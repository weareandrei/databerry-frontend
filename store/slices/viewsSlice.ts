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
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setViews, addViews, removeView, setLoading } = viewsSlice.actions
export default viewsSlice.reducer
