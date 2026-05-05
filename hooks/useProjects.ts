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

  const createProject = async (
    name: string,
    websiteUrl?: string | null,
  ) => {
    const now = new Date().toISOString()
    const tempId = `temp-${uuidv4()}`
    const optimistic: Project = {
      id: tempId,
      name,
      userId: '',
      websiteUrl: websiteUrl ?? null,
      createdAt: now,
      updatedAt: now,
    }

    dispatch(addProject(optimistic))

    try {
      const created = await ALGORITHM.createProject({
        name,
        websiteUrl: websiteUrl ?? null,
      })
      dispatch(removeProject(tempId))
      dispatch(addProject(created))
      return created
    } catch {
      dispatch(removeProject(tempId))
      toast.error('Failed to create project')
      return null
    }
  }

  /**
   * Edit a project's mutable fields. Renamed from `renameProject` to
   * reflect that it also handles `websiteUrl` now (and could absorb
   * `color` in the future). Caller passes only the fields they want to
   * change — undefined keys are skipped, `null` for `websiteUrl`
   * explicitly clears the favicon.
   */
  const editProject = async (
    projectId: string,
    patch: { name?: string; websiteUrl?: string | null },
  ) => {
    const existing = projects.find(p => p.id === projectId)
    if (!existing) return

    // Optimistic update: build the merged shape locally so the UI
    // reflects the change before the server confirms.
    dispatch(
      updateProject({
        ...existing,
        ...(patch.name !== undefined ? { name: patch.name } : null),
        ...(patch.websiteUrl !== undefined
          ? { websiteUrl: patch.websiteUrl }
          : null),
      }),
    )

    try {
      const updated = await ALGORITHM.updateProject(projectId, patch)
      dispatch(updateProject(updated))
    } catch {
      // Roll back on failure.
      dispatch(updateProject(existing))
      toast.error('Failed to update project')
    }
  }

  /**
   * Backwards-compatible alias for the old `renameProject(id, name)`
   * signature — used by `RenameProjectDialog` callers that haven't
   * been migrated to the unified edit dialog yet.
   */
  const renameProject = async (projectId: string, name: string) =>
    editProject(projectId, { name })

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
    editProject,
    deleteProject,
  }
}
