import { ArrowsClockwise } from '@phosphor-icons/react'
import { ProjectView } from './ProjectView/ProjectView'
import type { Project } from '@/types/project'

interface ProjectsGridProps {
  projects: Project[]
  loading?: boolean
}

export function ProjectsGrid({ projects, loading = false }: ProjectsGridProps) {
  return (
    <div className="flex flex-col rounded-xl relative rounded-b-none border border-stroke bg-white [overflow:clip] shadow-card">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-5">
          No projects yet. Create one using the + in the sidebar.
        </p>
      ) : (
        projects.map(project => (
          <ProjectView key={project.id} project={project} />
        ))
      )}
    </div>
  )
}
