import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import type { RootState, AppDispatch } from '@/store'
import { addProject, removeProject, setProjects, updateProject, setProjectsLoading } from '@/store/slices/projectsSlice'
import { openCreateProjectModal, closeCreateProjectModal } from '@/store/slices/uiSlice'
import { ALGORITHM } from '@/lib/api'
import type { Project } from '@/types/project'

export function useProjects() {
  const dispatch = useDispatch<AppDispatch>()
  const projects = useSelector((state: RootState) => state.projects.items)
  const loading = useSelector((state: RootState) => state.projects.loading)
  const isModalOpen = useSelector((state: RootState) => state.ui.createProjectModalOpen)

  const loadProjects = async () => {
    dispatch(setProjectsLoading(true))
    try {
      const data = await ALGORITHM.getProjects()
      dispatch(setProjects(data))
    } catch {
      toast.error('Failed to load projects')
    } finally {
      dispatch(setProjectsLoading(false))
    }
  }

  const createProject = async (name: string) => {
    const now = new Date().toISOString()
    const tempId = `temp-${uuidv4()}`
    const optimistic: Project = {
      id: tempId,
      name,
      userId: '',
      createdAt: now,
      updatedAt: now,
    }

    dispatch(addProject(optimistic))

    try {
      const created = await ALGORITHM.createProject({ name })
      dispatch(removeProject(tempId))
      dispatch(addProject(created))
      return created
    } catch {
      dispatch(removeProject(tempId))
      toast.error('Failed to create project')
      return null
    }
  }

  const renameProject = async (projectId: string, name: string) => {
    const existing = projects.find(p => p.id === projectId)
    if (!existing) return

    dispatch(updateProject({ ...existing, name }))

    try {
      const updated = await ALGORITHM.updateProject(projectId, { name })
      dispatch(updateProject(updated))
    } catch {
      dispatch(updateProject(existing))
      toast.error('Failed to rename project')
    }
  }

  const deleteProject = async (projectId: string) => {
    const snapshot = [...projects]
    dispatch(removeProject(projectId))

    try {
      await ALGORITHM.deleteProject(projectId)
    } catch {
      snapshot.forEach(p => dispatch(addProject(p)))
      toast.error('Failed to delete project')
    }
  }

  const openModal = () => dispatch(openCreateProjectModal())
  const closeModal = () => dispatch(closeCreateProjectModal())

  return {
    projects,
    loading,
    isModalOpen,
    openModal,
    closeModal,
    loadProjects,
    createProject,
    renameProject,
    deleteProject,
  }
}
