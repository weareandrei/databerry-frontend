import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Connection } from '@/types/connection'

interface ConnectionsState {
  items: Connection[]
  loading: boolean
  error: string | null
}

const initialState: ConnectionsState = {
  items: [],
  loading: false,
  error: null,
}

const connectionsSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    setConnections(state, action: PayloadAction<Connection[]>) {
      state.items = action.payload
    },
    addConnection(state, action: PayloadAction<Connection>) {
      state.items.push(action.payload)
    },
    removeConnection(state, action: PayloadAction<string>) {
      state.items = state.items.filter(c => c.id !== action.payload)
    },
    updateConnection(state, action: PayloadAction<Connection>) {
      const idx = state.items.findIndex(c => c.id === action.payload.id)
      if (idx !== -1) state.items[idx] = action.payload
    },
  },
})

export const { setConnections, addConnection, removeConnection, updateConnection } =
  connectionsSlice.actions

export default connectionsSlice.reducer
