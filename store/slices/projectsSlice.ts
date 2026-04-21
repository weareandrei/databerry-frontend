import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Project } from '@/types/project'

interface ProjectsState {
  items: Project[]
  loading: boolean
}

const initialState: ProjectsState = {
  items: [],
  loading: true,
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects(state, action: PayloadAction<Project[]>) {
      state.items = action.payload
    },
    addProject(state, action: PayloadAction<Project>) {
      state.items.push(action.payload)
    },
    removeProject(state, action: PayloadAction<string>) {
      state.items = state.items.filter(p => p.id !== action.payload)
    },
    updateProject(state, action: PayloadAction<Project>) {
      const idx = state.items.findIndex(p => p.id === action.payload.id)
      if (idx !== -1) state.items[idx] = action.payload
    },
    setProjectsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setProjects, addProject, removeProject, updateProject, setProjectsLoading } =
  projectsSlice.actions

export default projectsSlice.reducer
