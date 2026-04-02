import { configureStore } from '@reduxjs/toolkit'
import foldersReducer from './slices/foldersSlice'
import connectionsReducer from './slices/connectionsSlice'
import viewsReducer from './slices/viewsSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    folders: foldersReducer,
    connections: connectionsReducer,
    views: viewsReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
