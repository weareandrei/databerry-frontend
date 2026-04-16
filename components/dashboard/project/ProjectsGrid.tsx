import { ProjectView } from './ProjectView'
import type { Project } from '@/types/project'

interface ProjectsGridProps {
  projects: Project[]
}

function outerGridClass(count: number): string {
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 lg:grid-cols-2'
  return 'grid-cols-1 lg:grid-cols-2 5xl:grid-cols-3'
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No projects yet. Create one using the + in the sidebar.
      </p>
    )
  }

  return (
    <div className={`grid gap-6 pb-2 ${outerGridClass(projects.length)}`}>
      {projects.map(project => (
        <ProjectView key={project.id} project={project} totalProjects={projects.length} />
      ))}
    </div>
  )
}
