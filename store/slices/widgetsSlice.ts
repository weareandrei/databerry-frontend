import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Widget } from '@/types/widget'

interface WidgetsState {
  items: Widget[]
  loading: boolean
  error: string | null
  refreshKeyByProject: Record<string, number>
}

const initialState: WidgetsState = {
  items: [],
  loading: false,
  error: null,
  refreshKeyByProject: {},
}

const widgetsSlice = createSlice({
  name: 'widgets',
  initialState,
  reducers: {
    setWidgets(state, action: PayloadAction<Widget[]>) {
      state.items = action.payload
    },
    addWidgets(state, action: PayloadAction<Widget[]>) {
      state.items.push(...action.payload)
      const seen = new Set<string>()
      for (const w of action.payload) {
        if (seen.has(w.projectId)) continue
        seen.add(w.projectId)
        state.refreshKeyByProject[w.projectId] =
          (state.refreshKeyByProject[w.projectId] ?? 0) + 1
      }
    },
    removeWidget(state, action: PayloadAction<string>) {
      state.items = state.items.filter(w => w.id !== action.payload)
    },
    replaceWidget(state, action: PayloadAction<Widget>) {
      const i = state.items.findIndex(w => w.id === action.payload.id)
      if (i !== -1) state.items[i] = action.payload
    },
    bumpProjectRefreshKey(state, action: PayloadAction<string>) {
      state.refreshKeyByProject[action.payload] =
        (state.refreshKeyByProject[action.payload] ?? 0) + 1
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const {
  setWidgets,
  addWidgets,
  removeWidget,
  replaceWidget,
  bumpProjectRefreshKey,
  setLoading,
} = widgetsSlice.actions
export default widgetsSlice.reducer
