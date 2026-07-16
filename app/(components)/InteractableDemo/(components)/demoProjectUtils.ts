import { projectDisplayLabel } from '@/app/hub/project/(components)/projectViewUtils'
import type { DemoProject } from './context/DemoContext'
import type { Project } from '@/types/project'

export function demoProjectLabel(project: DemoProject): string {
  const asProject: Project = {
    id: project.id,
    name: project.name,
    websiteUrl: project.websiteUrl ?? null,
    userId: 'demo',
    createdAt: '',
    updatedAt: '',
  }
  return projectDisplayLabel(asProject)
}
