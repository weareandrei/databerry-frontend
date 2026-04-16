import { configureStore } from '@reduxjs/toolkit'
import projectsReducer from './slices/projectsSlice'
import foldersReducer from './slices/foldersSlice'
import connectionsReducer from './slices/connectionsSlice'
import viewsReducer from './slices/viewsSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    projects: projectsReducer,
    folders: foldersReducer,
    connections: connectionsReducer,
    views: viewsReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
